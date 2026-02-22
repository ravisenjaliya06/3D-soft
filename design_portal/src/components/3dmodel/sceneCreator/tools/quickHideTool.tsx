import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { hideFullScreenLoader, showFullScreenLoader } from '../../handler/items';
import { store } from '../../store';

export class OutlineManager {
  private scene: THREE.Scene;
  private isQuickHideActive = false;

  private originalVisibilityRef = new Map<THREE.Mesh, boolean>();
  private childOutlineGroupsRef = new Map<THREE.Mesh, THREE.Group>();
  private gridOriginalVisibility: boolean | null = null;
  private gridObject: THREE.Object3D | null = null;

  /**
   * Skip names that should not be hidden
   */
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

  public toggle() {
    if (!this.scene) {
      console.error('OutlineManager: Scene is undefined. Toggle aborted.');
      return;
    }

    showFullScreenLoader(this.isQuickHideActive ? 'Applying Quick Hide...' : 'Restoring Scene...');

    setTimeout(() => {
      try {
        if (this.isQuickHideActive) {
          this._applyQuickHideToAll();
        } else {
          this._restoreMesh();
        }
      } catch (error) {
        console.error('OutlineManager: Error during toggle:', error);
      } finally {
        hideFullScreenLoader();
      }
    }, 100);
  }

  /**
   * Apply quick hide to all meshes in the scene
   */
  private _applyQuickHideToAll(): void {
    this.scene.children.forEach((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (this._shouldSkipMesh(object)) {
        return;
      }

      const applyOutline = object.userData.isMain === true;
      this._applyQuickHide(object, applyOutline);
    });
  }

  private _shouldSkipMesh(mesh: THREE.Mesh): boolean {
    if (mesh instanceof THREE.GridHelper) {
      return true;
    }

    return this.SKIP_NAMES.has(mesh.name);
  }

  /**
   * Store original visibility for a mesh if not already stored
   */
  private _storeVisibility(mesh: THREE.Mesh): void {
    if (!this.originalVisibilityRef.has(mesh)) {
      this.originalVisibilityRef.set(mesh, mesh.visible);
    }
  }

  /**
   * Hide mesh and its children, storing their original visibility
   */
  private _hideMeshAndChildren(mesh: THREE.Mesh): void {
    this._storeVisibility(mesh);
    mesh.visible = false;

    mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      if (child.userData.isInvisibleBox) {
        return;
      }

      this._storeVisibility(child);
      child.visible = false;
    });
  }

  private _applyQuickHide(mesh: THREE.Mesh, applyOutline: boolean) {
    this._hideMeshAndChildren(mesh);

    if (applyOutline) {
      this._generateOutline(mesh);
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
   * Create outline from merged geometries with configurable color and depth test
   */
  private _createOutline(
    mergedGeometries: THREE.BufferGeometry[],
    color: number,
    depthTest: boolean
  ): THREE.LineSegments {
    const finalGeometry = BufferGeometryUtils.mergeGeometries(mergedGeometries, false);
    const edges = new THREE.EdgesGeometry(finalGeometry, 1);
    const outlineMat = new THREE.LineBasicMaterial({
      color,
      depthTest,
      depthWrite: false,
    });

    const outline = new THREE.LineSegments(edges, outlineMat);
    outline.renderOrder = 999; // High render order to appear in front of grid

    return outline;
  }

  private _createOutlines(mergedGeometries: THREE.BufferGeometry[]): THREE.LineSegments {
    return this._createOutline(mergedGeometries, 0x392579, true);
  }

  private _createProtrusionOutline(mergedGeometries: THREE.BufferGeometry[]): THREE.LineSegments {
    return this._createOutline(mergedGeometries, 0xff0000, false);
  }

  /**
   * Dispose of line segment geometry and materials
   */
  private _disposeLineSegment(lineSegment: THREE.LineSegments): void {
    if (lineSegment.geometry) {
      lineSegment.geometry.dispose();
    }

    if (!lineSegment.material) {
      return;
    }

    if (Array.isArray(lineSegment.material)) {
      lineSegment.material.forEach((mat) => mat.dispose());
      return;
    }

    lineSegment.material.dispose();
  }

  private _removeOutlineGroup(outlineGroup: THREE.Group) {
    outlineGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        this._disposeLineSegment(child);
      }
    });

    if (outlineGroup.parent) {
      outlineGroup.parent.remove(outlineGroup);
      return;
    }

    if (this.scene) {
      this.scene.remove(outlineGroup);
    }
  }

  /**
   * Process child mesh and add to appropriate geometry array
   */
  private _processChildGeometry(
    child: THREE.Mesh,
    mainMesh: THREE.Mesh,
    mergedGeometries: THREE.BufferGeometry[],
    protrusionGeometries: THREE.BufferGeometry[]
  ): void {
    if (!child.geometry || child.userData.isInvisibleBox) {
      return;
    }

    const clonedGeo = child.geometry.clone();
    clonedGeo.applyMatrix4(child.matrixWorld);
    clonedGeo.applyMatrix4(mainMesh.matrixWorld.clone().invert());

    if (child.userData.type === 'protrusion') {
      protrusionGeometries.push(clonedGeo);
      return;
    }

    // Fix for GLB Models (Doors/Drawers)
    if (clonedGeo.attributes) {
      Object.keys(clonedGeo.attributes).forEach((key) => {
        if (key !== 'position') {
          clonedGeo.deleteAttribute(key);
        }
      });
    }
    // Also remove morph attributes if any
    if (clonedGeo.morphAttributes) {
      clonedGeo.morphAttributes = {};
    }

    if (child.userData.type !== 'groove') {
      mergedGeometries.push(clonedGeo);
    }
  }

  private _generateOutline(mainMesh: THREE.Mesh) {
    if (!mainMesh.userData.isMain) {
      return;
    }

    const existingOutline = this.childOutlineGroupsRef.get(mainMesh);
    if (existingOutline) {
      this._removeOutlineGroup(existingOutline);
      this.childOutlineGroupsRef.delete(mainMesh);
    }

    const outlineGroup = this._createOutlineGroup(mainMesh);
    const mergedGeometries: THREE.BufferGeometry[] = [];
    const protrusionGeometries: THREE.BufferGeometry[] = [];

    mainMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this._processChildGeometry(child, mainMesh, mergedGeometries, protrusionGeometries);
      }
    });

    if (mergedGeometries.length > 0) {
      const outline = this._createOutlines(mergedGeometries);
      outlineGroup.add(outline);
    }

    if (protrusionGeometries.length > 0) {
      const protrusionOutline = this._createProtrusionOutline(protrusionGeometries);
      outlineGroup.add(protrusionOutline);
    }

    if (mergedGeometries.length === 0 && protrusionGeometries.length === 0) {
      return;
    }

    this.scene.add(outlineGroup);
    this.childOutlineGroupsRef.set(mainMesh, outlineGroup);
  }

  /**
   * Find and collect orphaned outline groups from the scene
   */
  private _findOrphanedOutlines(): THREE.Group[] {
    const orphanedOutlines: THREE.Group[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Group && object.name.includes('outline_group')) {
        orphanedOutlines.push(object);
      }
    });
    return orphanedOutlines;
  }

  /**
   * Remove all outline groups from the reference map
   */
  private _removeAllOutlineGroups(): void {
    this.childOutlineGroupsRef.forEach((outlineGroup) => {
      this._removeOutlineGroup(outlineGroup);
    });
    this.childOutlineGroupsRef.clear();
  }

  private _restoreMesh() {
    this.originalVisibilityRef.forEach((originalVisibility, mesh) => {
      mesh.visible = originalVisibility;
    });
    this.originalVisibilityRef.clear();

    this._removeAllOutlineGroups();

    const orphanedOutlines = this._findOrphanedOutlines();
    orphanedOutlines.forEach((outlineGroup) => {
      this._removeOutlineGroup(outlineGroup);
    });
  }
}
