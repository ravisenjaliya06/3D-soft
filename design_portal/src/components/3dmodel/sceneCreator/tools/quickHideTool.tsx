import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { hideFullScreenLoader, showFullScreenLoader } from '../../handler/items';
import { store } from '../../store';

/**
 * Number of main meshes to process per animation frame.
 * Higher = faster completion (safe because per-child EdgesGeometry calls are now small).
 */
const CHUNK_SIZE = 8;

/**
 * Yield control back to the browser by waiting for the next animation frame.
 */
function yieldFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class OutlineManager {
  private scene: THREE.Scene;
  private isQuickHideActive = false;

  private originalVisibilityRef = new Map<THREE.Mesh, boolean>();
  private childOutlineGroupsRef = new Map<THREE.Mesh, THREE.Group>();

  /**
   * Cache of per-child EdgesGeometry in LOCAL space, keyed by child UUID.
   *
   * Storing in local space (no world matrix applied) makes the cache
   * transform-independent — valid even if the object moves between toggles.
   */
  private edgeCacheRef = new Map<string, THREE.BufferGeometry>();

  /** Set to true to cancel an in-flight chunked apply loop. */
  private cancelFlag = false;

  private readonly SKIP_NAMES = new Set(['grid', 'floor', 'daysky', 'nightsky']);

  constructor() {
    const state = store.getState().scene?.scene;
    if (!state) {
      console.warn('Scene not ready yet for OutlineManager');
    }
    this.scene = state;
  }

  public setQuickHide(state: boolean) {
    this.isQuickHideActive = state;
  }

  public async toggle() {
    if (!this.scene) {
      console.error('OutlineManager: Scene is undefined. Toggle aborted.');
      return;
    }

    // Cancel any in-flight loop from the previous toggle
    this.cancelFlag = true;

    await showFullScreenLoader(
      this.isQuickHideActive ? 'Applying Quick Hide...' : 'Restoring Scene...'
    );

    setTimeout(() => {
      this.cancelFlag = false;
      if (this.isQuickHideActive) {
        this._applyQuickHideAsync().catch((err) => {
          console.error('OutlineManager: Error during apply:', err);
          hideFullScreenLoader();
        });
      } else {
        this._restoreMesh();
        hideFullScreenLoader();
      }
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // APPLY PHASE
  // ---------------------------------------------------------------------------

  /**
   * Phase 1: Hide ALL meshes synchronously (fast — just a visibility flag flip).
   * Phase 2: Generate outlines for "main" meshes in async chunks over rAF ticks.
   */
  private async _applyQuickHideAsync(): Promise<void> {
    const mainMeshes: THREE.Mesh[] = [];

    // Phase 1 — hide all (synchronous, very cheap)
    this.scene.children.forEach((object) => {
      if (!(object instanceof THREE.Mesh) || this._shouldSkipMesh(object)) return;
      this._hideMeshAndChildren(object);
      if (object.userData.isMain === true) {
        mainMeshes.push(object);
      }
    });

    // Phase 2 — generate outlines in chunks, yielding between each chunk
    for (let i = 0; i < mainMeshes.length; i += CHUNK_SIZE) {
      if (this.cancelFlag) return;
      const chunk = mainMeshes.slice(i, i + CHUNK_SIZE);
      chunk.forEach((mesh) => this._generateOutline(mesh));
      await yieldFrame();
    }

    if (!this.cancelFlag) {
      hideFullScreenLoader();
    }
  }

  private _shouldSkipMesh(mesh: THREE.Mesh): boolean {
    if (mesh instanceof THREE.GridHelper) return true;
    return this.SKIP_NAMES.has(mesh.name);
  }

  private _storeVisibility(mesh: THREE.Mesh): void {
    if (!this.originalVisibilityRef.has(mesh)) {
      this.originalVisibilityRef.set(mesh, mesh.visible);
    }
  }

  private _hideMeshAndChildren(mesh: THREE.Mesh): void {
    this._storeVisibility(mesh);
    mesh.visible = false;

    mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.userData.isInvisibleBox) return;
      this._storeVisibility(child);
      child.visible = false;
    });
  }

  // ---------------------------------------------------------------------------
  // OUTLINE GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Get or create the cached EdgesGeometry for a single child mesh.
   *
   * The geometry is stored in the child's LOCAL space (no world matrix applied).
   * This avoids the "Too many properties to enumerate" RangeError that occurs
   * when all children are merged into one giant BufferGeometry before calling
   * EdgesGeometry — each individual child geometry is small enough to be safe.
   */
  private _getOrCreateEdgeGeo(child: THREE.Mesh): THREE.BufferGeometry {
    let edgeGeo = this.edgeCacheRef.get(child.uuid);

    if (!edgeGeo) {
      // Strip all non-position attributes so EdgesGeometry only processes geometry,
      // not UVs, normals, etc. (also required for GLB door/drawer meshes).
      const stripped = child.geometry.clone();
      Object.keys(stripped.attributes).forEach((key) => {
        if (key !== 'position') stripped.deleteAttribute(key);
      });
      stripped.morphAttributes = {};

      // Compute edges on this small single-child geometry — no overflow risk.
      edgeGeo = new THREE.EdgesGeometry(stripped, 1);
      stripped.dispose();

      this.edgeCacheRef.set(child.uuid, edgeGeo);
    }

    return edgeGeo;
  }

  /**
   * Process a single child mesh: get its cached edge geometry, clone it,
   * apply the world→local transform so all edges are in the mainMesh's local space,
   * and push to the appropriate array.
   */
  private _processChildEdges(
    child: THREE.Mesh,
    mainMesh: THREE.Mesh,
    normalEdges: THREE.BufferGeometry[],
    protrusionEdges: THREE.BufferGeometry[]
  ): void {
    if (!child.geometry || child.userData.isInvisibleBox) return;
    if (child.userData.type === 'groove') return;

    const edgeGeo = this._getOrCreateEdgeGeo(child);

    // Clone + transform into mainMesh local space (cheap — edge geo is tiny)
    const transformed = edgeGeo.clone();
    transformed.applyMatrix4(child.matrixWorld);
    transformed.applyMatrix4(mainMesh.matrixWorld.clone().invert());

    if (child.userData.type === 'protrusion') {
      protrusionEdges.push(transformed);
    } else {
      normalEdges.push(transformed);
    }
  }

  private _createOutlineGroup(mesh: THREE.Mesh): THREE.Group {
    const outlineGroup = new THREE.Group();
    outlineGroup.name = `outline_group_${mesh.uuid}`;
    outlineGroup.position.copy(mesh.position);
    outlineGroup.rotation.copy(mesh.rotation);
    outlineGroup.scale.copy(mesh.scale);
    return outlineGroup;
  }

  /**
   * Merge already-computed edge geometries into a single LineSegments.
   * Safe to merge because edge geometries only contain position attributes
   * with 2 vertices per edge — much smaller than face geometries.
   */
  private _buildLineSegments(
    edgeGeometries: THREE.BufferGeometry[],
    color: number,
    depthTest: boolean
  ): THREE.LineSegments {
    const merged = BufferGeometryUtils.mergeGeometries(edgeGeometries, false);
    // Dispose the temporary transformed clones now that they are merged
    edgeGeometries.forEach((g) => g.dispose());

    const mat = new THREE.LineBasicMaterial({ color, depthTest, depthWrite: false });
    const lines = new THREE.LineSegments(merged, mat);
    lines.renderOrder = 999;
    return lines;
  }

  private _generateOutline(mainMesh: THREE.Mesh): void {
    if (!mainMesh.userData.isMain) return;

    const existingOutline = this.childOutlineGroupsRef.get(mainMesh);
    if (existingOutline) {
      this._removeOutlineGroup(existingOutline);
      this.childOutlineGroupsRef.delete(mainMesh);
    }

    const outlineGroup = this._createOutlineGroup(mainMesh);
    const normalEdges: THREE.BufferGeometry[] = [];
    const protrusionEdges: THREE.BufferGeometry[] = [];

    mainMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this._processChildEdges(child, mainMesh, normalEdges, protrusionEdges);
      }
    });

    if (normalEdges.length > 0) {
      outlineGroup.add(this._buildLineSegments(normalEdges, 0x392579, true));
    }

    if (protrusionEdges.length > 0) {
      outlineGroup.add(this._buildLineSegments(protrusionEdges, 0xff0000, false));
    }

    if (normalEdges.length === 0 && protrusionEdges.length === 0) return;

    this.scene.add(outlineGroup);
    this.childOutlineGroupsRef.set(mainMesh, outlineGroup);
  }

  // ---------------------------------------------------------------------------
  // DISPOSE HELPERS
  // ---------------------------------------------------------------------------

  private _disposeLineSegment(lineSegment: THREE.LineSegments): void {
    lineSegment.geometry?.dispose();
    if (!lineSegment.material) return;
    if (Array.isArray(lineSegment.material)) {
      lineSegment.material.forEach((mat) => mat.dispose());
    } else {
      lineSegment.material.dispose();
    }
  }

  private _removeOutlineGroup(outlineGroup: THREE.Group): void {
    outlineGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        this._disposeLineSegment(child);
      }
    });

    if (outlineGroup.parent) {
      outlineGroup.parent.remove(outlineGroup);
    } else if (this.scene) {
      this.scene.remove(outlineGroup);
    }
  }

  // ---------------------------------------------------------------------------
  // RESTORE PHASE
  // ---------------------------------------------------------------------------

  private _removeAllOutlineGroups(): void {
    this.childOutlineGroupsRef.forEach((outlineGroup) => {
      this._removeOutlineGroup(outlineGroup);
    });
    this.childOutlineGroupsRef.clear();
  }

  private _restoreMesh(): void {
    this.originalVisibilityRef.forEach((originalVisibility, mesh) => {
      mesh.visible = originalVisibility;
    });
    this.originalVisibilityRef.clear();

    this._removeAllOutlineGroups();

    // Safety net: remove any outline_group that leaked outside our tracking map
    const orphanedOutlines: THREE.Group[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Group && object.name.includes('outline_group')) {
        orphanedOutlines.push(object);
      }
    });
    orphanedOutlines.forEach((outlineGroup) => this._removeOutlineGroup(outlineGroup));
  }
}
