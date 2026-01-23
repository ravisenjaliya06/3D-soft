import * as THREE from 'three';
import { DRAWER_PLANK_TYPES, PART_TYPES } from '../interface';
import { L_SHAPE_CONSTANTS } from './lShapeObjectTool.constants';

/**
 * Utility functions for coordinate transformations
 */
export class CoordinateUtils {
  /**
   * Convert local position to parent local position
   */
  static convertToParentLocalPosition(
    localPos: THREE.Vector3,
    boxMesh: THREE.Mesh,
    parent: THREE.Mesh
  ): THREE.Vector3 {
    const worldPos = boxMesh.localToWorld(localPos.clone());
    return parent.worldToLocal(worldPos.clone());
  }

  /**
   * Get center position in cupboard local space
   */
  static getCupboardLocalCenter(mesh: THREE.Mesh, cupboardMesh: THREE.Mesh): THREE.Vector3 {
    mesh.updateMatrixWorld(true);
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) throw new Error('Could not compute bounding box');

    const centerLocal = bbox.getCenter(new THREE.Vector3());
    const centerWorld = mesh.localToWorld(centerLocal.clone());
    return cupboardMesh.worldToLocal(centerWorld.clone());
  }

  /**
   * Get bounding box center in cupboard local space
   */
  static getBoundingBoxCenterInCupboardLocal(
    mesh: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    bbox: THREE.Box3
  ): THREE.Vector3 {
    const centerLocal = bbox.getCenter(new THREE.Vector3());
    const centerWorld = mesh.localToWorld(centerLocal.clone());
    return cupboardMesh.worldToLocal(centerWorld.clone());
  }
}

/**
 * Utility functions for mesh operations
 */
export class MeshUtils {
  /**
   * Get parent mesh from box mesh
   */
  static getParentMesh(boxMesh: THREE.Mesh): THREE.Mesh {
    return !boxMesh.parent?.userData.isMain ? boxMesh : (boxMesh.parent as THREE.Mesh);
  }

  /**
   * Find target mesh (drawer face or door mesh)
   */
  static findTargetMesh(drawerOrDoor: THREE.Mesh): THREE.Mesh | null {
    if (drawerOrDoor.userData.type === PART_TYPES.DRAWER) {
      let targetMesh: THREE.Mesh | null = null;
      drawerOrDoor.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          (child.name === DRAWER_PLANK_TYPES.DRAWER_FACE || child.name === 'DRAWER_FACE')
        ) {
          targetMesh = child;
        }
      });
      return targetMesh || drawerOrDoor;
    }
    return drawerOrDoor;
  }

  /**
   * Get bounding box with error handling
   */
  static getBoundingBox(mesh: THREE.Mesh): THREE.Box3 {
    mesh.updateMatrixWorld(true);
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) throw new Error('Could not compute bounding box');
    return bbox;
  }

  /**
   * Check if two meshes are horizontally aligned
   */
  static areHorizontallyAligned(
    mesh1: THREE.Mesh,
    mesh2: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    threshold?: number
  ): boolean {
    const center1 = CoordinateUtils.getCupboardLocalCenter(mesh1, cupboardMesh);
    const center2 = CoordinateUtils.getCupboardLocalCenter(mesh2, cupboardMesh);

    const bbox1 = this.getBoundingBox(mesh1);
    const size1 = new THREE.Vector3();
    bbox1.getSize(size1);
    const alignmentThreshold =
      threshold || Math.max(size1.x, size1.z) * L_SHAPE_CONSTANTS.ALIGNMENT_THRESHOLD_FACTOR;

    const xDiff = Math.abs(center1.x - center2.x);
    const zDiff = Math.abs(center1.z - center2.z);

    return xDiff < alignmentThreshold && zDiff < alignmentThreshold;
  }

  /**
   * Check if two objects are vertically adjacent
   */
  static areVerticallyAdjacent(
    topMesh: THREE.Mesh,
    bottomMesh: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): boolean {
    const bboxTop = this.getBoundingBox(topMesh);
    const bboxBottom = this.getBoundingBox(bottomMesh);

    const topBottomLocal = new THREE.Vector3(
      bboxTop.getCenter(new THREE.Vector3()).x,
      bboxTop.min.y,
      bboxTop.min.z
    );
    const bottomTopLocal = new THREE.Vector3(
      bboxBottom.getCenter(new THREE.Vector3()).x,
      bboxBottom.max.y,
      bboxBottom.min.z
    );

    const topBottomWorld = topMesh.localToWorld(topBottomLocal.clone());
    const bottomTopWorld = bottomMesh.localToWorld(bottomTopLocal.clone());

    const topBottomCupboard = cupboardMesh.worldToLocal(topBottomWorld.clone());
    const bottomTopCupboard = cupboardMesh.worldToLocal(bottomTopWorld.clone());

    const gapThreshold = L_SHAPE_CONSTANTS.GAP_THRESHOLD;
    return (
      topBottomCupboard.y <= bottomTopCupboard.y + gapThreshold &&
      topBottomCupboard.y >= bottomTopCupboard.y - gapThreshold
    );
  }
}

/**
 * Utility functions for finding drawers and doors
 */
export class DrawerDoorUtils {
  /**
   * Find drawers and doors in cupboard
   */
  static findDrawersAndDoors(cupboardMesh: THREE.Mesh): THREE.Mesh[] {
    const drawersAndDoors: THREE.Mesh[] = [];

    cupboardMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const type = child.userData.type;
        if (type === PART_TYPES.DRAWER || type === PART_TYPES.DOOR) {
          if (
            child.userData.isMain ||
            child.name?.includes('DRAWER') ||
            child.name?.includes('DOOR')
          ) {
            drawersAndDoors.push(child);
          }
        }
      }
    });

    return drawersAndDoors;
  }

  /**
   * Group objects by type
   */
  static groupByType(objects: THREE.Mesh[]): Map<string, THREE.Mesh[]> {
    const objectsByType = new Map<string, THREE.Mesh[]>();
    objects.forEach((obj) => {
      const type = obj.userData.type;
      if (!objectsByType.has(type)) {
        objectsByType.set(type, []);
      }
      objectsByType.get(type)!.push(obj);
    });
    return objectsByType;
  }

  /**
   * Group objects by horizontal alignment
   */
  static groupByHorizontalAlignment(
    objects: THREE.Mesh[],
    cupboardMesh: THREE.Mesh
  ): THREE.Mesh[][] {
    const alignedGroups: THREE.Mesh[][] = [];
    const processed = new Set<THREE.Mesh>();

    for (const obj1 of objects) {
      if (processed.has(obj1)) continue;

      const targetMesh1 = MeshUtils.findTargetMesh(obj1);
      if (!targetMesh1) continue;

      const alignedGroup: THREE.Mesh[] = [obj1];
      processed.add(obj1);

      for (const obj2 of objects) {
        if (processed.has(obj2)) continue;

        const targetMesh2 = MeshUtils.findTargetMesh(obj2);
        if (!targetMesh2) continue;

        if (MeshUtils.areHorizontallyAligned(targetMesh1, targetMesh2, cupboardMesh)) {
          alignedGroup.push(obj2);
          processed.add(obj2);
        }
      }

      if (alignedGroup.length > 1) {
        alignedGroups.push(alignedGroup);
      }
    }

    return alignedGroups;
  }

  /**
   * Sort objects vertically (top to bottom)
   */
  static sortVertically(objects: THREE.Mesh[], cupboardMesh: THREE.Mesh): THREE.Mesh[] {
    return objects.sort((a, b) => {
      const targetMeshA = MeshUtils.findTargetMesh(a);
      const targetMeshB = MeshUtils.findTargetMesh(b);
      if (!targetMeshA || !targetMeshB) return 0;

      const centerA = CoordinateUtils.getCupboardLocalCenter(targetMeshA, cupboardMesh);
      const centerB = CoordinateUtils.getCupboardLocalCenter(targetMeshB, cupboardMesh);

      return centerB.y - centerA.y; // Higher Y first (top to bottom)
    });
  }
}
