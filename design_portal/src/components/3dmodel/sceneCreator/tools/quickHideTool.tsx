import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { store } from '../../store';

export class OutlineManager {
  private scene: THREE.Scene;
  private isQuickHideActive = false;

  private originalVisibilityRef = new Map<THREE.Mesh, boolean>();
  private childOutlineGroupsRef = new Map<THREE.Mesh, THREE.Group>();
  private gridOriginalVisibility: boolean | null = null;
  private gridObject: THREE.Object3D | null = null;

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
    
    if (this.isQuickHideActive) {
      // Apply quick hide to all meshes
      this.scene.children.forEach((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (this._shouldSkipMesh(object)) return;
        const applyOutline = object.userData.isMain === true;
        this._applyQuickHide(object, applyOutline);
      });
    } else {
      // Restore all meshes
      this._restoreMesh();
    }
  }

  private _shouldSkipMesh(mesh: THREE.Mesh) {
    return (
      mesh.name === 'grid' ||
      mesh.name === 'floor' ||
      mesh.name === 'daysky' ||
      mesh.name === 'nightsky' ||
      mesh instanceof THREE.GridHelper
    );
  }

  private _applyQuickHide(mesh: THREE.Mesh, applyOutline: boolean) {
    // Store original visibility if not already stored
    if (!this.originalVisibilityRef.has(mesh)) {
      this.originalVisibilityRef.set(mesh, mesh.visible);
    }

    // Set mesh visibility to false (including all children)
    mesh.visible = false;
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isInvisibleBox) {
        if (!this.originalVisibilityRef.has(child)) {
          this.originalVisibilityRef.set(child, child.visible);
        }
        child.visible = false;
      }
    });

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

  private _createOutlines(mergedGeometries: THREE.BufferGeometry[]): THREE.LineSegments {
    const finalGeometry = BufferGeometryUtils.mergeGeometries(mergedGeometries, false);

    const edges = new THREE.EdgesGeometry(finalGeometry, 1);
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0x392579,
      depthTest: true,
      depthWrite: false,
    });

    const outline = new THREE.LineSegments(edges, outlineMat);
    outline.renderOrder = 999; // High render order to appear in front of grid

    return outline;
  }

  private _createProtrusionOutline(mergedGeometries: THREE.BufferGeometry[]): THREE.LineSegments {
    const finalGeometry = BufferGeometryUtils.mergeGeometries(mergedGeometries, false);

    const edges = new THREE.EdgesGeometry(finalGeometry, 1);
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0xff0000, // Red for male parts (protrusions)
      depthTest: false,
      depthWrite: false,
    });

    const outline = new THREE.LineSegments(edges, outlineMat);
    outline.renderOrder = 999; // High render order to appear in front of grid

    return outline;
  }

  private _removeOutlineGroup(outlineGroup: THREE.Group) {
    // Dispose of all geometries and materials in the outline group
    outlineGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Remove from scene
    if (outlineGroup.parent) {
      outlineGroup.parent.remove(outlineGroup);
    } else if (this.scene) {
      this.scene.remove(outlineGroup);
    }
  }

  private _generateOutline(mainMesh: THREE.Mesh) {
    if (!mainMesh.userData.isMain) return;
    
    // Remove existing outline group if it exists to prevent duplicates
    const existingOutline = this.childOutlineGroupsRef.get(mainMesh);
    if (existingOutline) {
      this._removeOutlineGroup(existingOutline);
      this.childOutlineGroupsRef.delete(mainMesh);
    }
    
    const outlineGroup = this._createOutlineGroup(mainMesh);

    const mergedGeometries: THREE.BufferGeometry[] = [];
    const protrusionGeometries: THREE.BufferGeometry[] = [];

    mainMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && !child.userData.isInvisibleBox) {
        const clonedGeo = child.geometry.clone();
        clonedGeo.applyMatrix4(child.matrixWorld);
        clonedGeo.applyMatrix4(mainMesh.matrixWorld.clone().invert());
        
        // Separate protrusions (male) for different color, skip grooves
        if (child.userData.type === 'protrusion') {
          protrusionGeometries.push(clonedGeo);
        } else if (child.userData.type !== 'groove') {
          // Regular mesh parts (skip grooves to avoid green lines)
          mergedGeometries.push(clonedGeo);
        }
      }
    });

    // Add regular outline (default color)
    if (mergedGeometries.length > 0) {
      const outline = this._createOutlines(mergedGeometries);
      outlineGroup.add(outline);
    }

    // Add protrusion outline (red for male parts)
    if (protrusionGeometries.length > 0) {
      const protrusionOutline = this._createProtrusionOutline(protrusionGeometries);
      outlineGroup.add(protrusionOutline);
    }

    if (mergedGeometries.length === 0 && protrusionGeometries.length === 0) return;
    
    this.scene.add(outlineGroup);
    this.childOutlineGroupsRef.set(mainMesh, outlineGroup);
  }

  private _restoreMesh() {
    // Restore original visibility for all meshes
    this.originalVisibilityRef.forEach((originalVisibility, mesh) => {
      mesh.visible = originalVisibility;
    });

    // Clear the visibility refs
    this.originalVisibilityRef.clear();

    // Remove all outline groups using the ref map
    this.childOutlineGroupsRef.forEach((outlineGroup) => {
      this._removeOutlineGroup(outlineGroup);
    });
    this.childOutlineGroupsRef.clear();

    // Also traverse scene to find and remove any orphaned outline groups
    const orphanedOutlines: THREE.Group[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Group && object.name.includes('outline_group')) {
        orphanedOutlines.push(object);
      }
    });

    orphanedOutlines.forEach((outlineGroup) => {
      this._removeOutlineGroup(outlineGroup);
    });
  }
}
