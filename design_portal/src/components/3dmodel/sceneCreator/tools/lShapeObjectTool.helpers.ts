import * as THREE from 'three';
import { Material, MeshObjectData, PART_TYPES, GEOMETRY } from '../interface';
import { L_SHAPE_CONSTANTS } from './lShapeObjectTool.constants';
import { CoordinateUtils, MeshUtils } from './lShapeObjectTool.utils';

/**
 * Helper functions for creating plank data
 */
export class PlankDataBuilder {
  /**
   * Create plank MeshObjectData (vertical or horizontal)
   */
  static createPlankData(
    baseData: MeshObjectData,
    dimensions: { width: number; height: number; depth: number },
    position: THREE.Vector3,
    parentId: string,
    plankType: 'vertical' | 'horizontal',
    material?: Material[],
    drawerOrDoorId?: string
  ): MeshObjectData {
    const plankData: MeshObjectData = {
      ...baseData,
      id: crypto.randomUUID(),
      name:
        plankType === 'vertical'
          ? 'L_SHAPE_VERTICAL_PLANK'
          : 'L_SHAPE_HORIZONTAL_PLANK',
      type: PART_TYPES.L_SHAPE_OBJECT,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotation: baseData.rotation || { x: 0, y: 0, z: 0 },
      parent: parentId,
      isMain: false,
      material: material || baseData.material,
    };

    if (drawerOrDoorId) {
      (plankData as any).userData = {
        ...(plankData as any).userData,
        drawerOrDoorId,
      };
    }

    return plankData;
  }

  /**
   * Calculate vertical plank position for box
   */
  static calculateVerticalPlankPositionForBox(
    boxCenterLocal: THREE.Vector3,
    bbox: THREE.Box3,
    verticalHeight: number,
    verticalDepth: number
  ): THREE.Vector3 {
    return new THREE.Vector3(
      boxCenterLocal.x,
      bbox.min.y + verticalHeight / 2,
      bbox.max.z - verticalDepth / 2
    );
  }

  /**
   * Calculate horizontal plank position for box
   */
  static calculateHorizontalPlankPositionForBox(
    boxCenterLocal: THREE.Vector3,
    bbox: THREE.Box3,
    horizontalHeight: number,
    verticalDepth: number,
    horizontalDepth: number
  ): THREE.Vector3 {
    return new THREE.Vector3(
      boxCenterLocal.x,
      bbox.min.y + horizontalHeight / 2,
      bbox.max.z - verticalDepth + horizontalDepth / 2
    );
  }
}

/**
 * Helper functions for position calculations
 */
export class PositionCalculator {
  /**
   * Calculate center position between two vertically attached objects
   */
  static calculateCenterPositionBetweenObjects(
    topObj: THREE.Mesh,
    bottomObj: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): {
    centerY: number;
    centerX: number;
    centerZ: number;
    width: number;
    verticalPlankStartY: number;
    verticalPlankEndY: number;
    verticalPlankHeight: number;
  } {
    const targetMeshTop = MeshUtils.findTargetMesh(topObj);
    const targetMeshBottom = MeshUtils.findTargetMesh(bottomObj);

    if (!targetMeshTop || !targetMeshBottom) {
      throw new Error('Could not find target mesh for objects');
    }

    const bboxTop = MeshUtils.getBoundingBox(targetMeshTop);
    const bboxBottom = MeshUtils.getBoundingBox(targetMeshBottom);

    const sizeTop = new THREE.Vector3();
    const sizeBottom = new THREE.Vector3();
    bboxTop.getSize(sizeTop);
    bboxBottom.getSize(sizeBottom);

    const topCenterLocal = new THREE.Vector3(
      bboxTop.getCenter(new THREE.Vector3()).x,
      bboxTop.getCenter(new THREE.Vector3()).y,
      bboxTop.min.z
    );

    const bottomCenterLocal = new THREE.Vector3(
      bboxBottom.getCenter(new THREE.Vector3()).x,
      bboxBottom.getCenter(new THREE.Vector3()).y,
      bboxBottom.min.z
    );

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

    const topCenterWorld = targetMeshTop.localToWorld(topCenterLocal.clone());
    const bottomCenterWorld = targetMeshBottom.localToWorld(
      bottomCenterLocal.clone()
    );
    const topBottomWorld = targetMeshTop.localToWorld(topBottomLocal.clone());
    const bottomTopWorld = targetMeshBottom.localToWorld(
      bottomTopLocal.clone()
    );

    const topCenterCupboardLocal = cupboardMesh.worldToLocal(
      topCenterWorld.clone()
    );
    const bottomCenterCupboardLocal = cupboardMesh.worldToLocal(
      bottomCenterWorld.clone()
    );
    const topBottomCupboardLocal = cupboardMesh.worldToLocal(
      topBottomWorld.clone()
    );
    const bottomTopCupboardLocal = cupboardMesh.worldToLocal(
      bottomTopWorld.clone()
    );

    const centerY = (topBottomCupboardLocal.y + bottomTopCupboardLocal.y) / 2;
    const centerX =
      (topCenterCupboardLocal.x + bottomCenterCupboardLocal.x) / 2;
    const centerZ = Math.min(
      topCenterCupboardLocal.z,
      bottomCenterCupboardLocal.z
    );

    const topHalfHeight = sizeTop.y / 2;
    const bottomHalfHeight = sizeBottom.y / 2;

    const verticalPlankStartY =
      topBottomCupboardLocal.y + topHalfHeight;
    const verticalPlankEndY =
      bottomTopCupboardLocal.y - bottomHalfHeight;
    const verticalPlankHeight = verticalPlankStartY - verticalPlankEndY;

    const width = (sizeTop.x + sizeBottom.x) / 2;

    return {
      centerY,
      centerX,
      centerZ,
      width,
      verticalPlankStartY,
      verticalPlankEndY,
      verticalPlankHeight,
    };
  }
}

/**
 * Helper functions for object height management
 */
export class HeightManager {
  /**
   * Update banding meshes when object dimensions change
   */
  static updateBandingMeshes(
    mesh: THREE.Mesh,
    newWidth: number,
    newHeight: number,
    newDepth: number
  ): void {
    mesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.type !== 'banding')
        return;
      if (!(child.geometry instanceof THREE.BoxGeometry)) return;

      const edge = child.userData.edge;
      const bandingParams = child.geometry.parameters;
      const bandingThickness = Math.min(
        bandingParams.width,
        bandingParams.height,
        bandingParams.depth
      );

      const { geometry: newGeometry, position: newPosition } =
        this.calculateBandingGeometryAndPosition(
          edge,
          newWidth,
          newHeight,
          newDepth,
          bandingThickness
        );

      if (!newGeometry) return;

      child.geometry.dispose();
      child.geometry = newGeometry;
      child.position.copy(newPosition);
    });
  }

  /**
   * Calculate banding geometry and position based on edge
   */
  private static calculateBandingGeometryAndPosition(
    edge: string,
    newWidth: number,
    newHeight: number,
    newDepth: number,
    bandingThickness: number
  ): { geometry: THREE.BoxGeometry | null; position: THREE.Vector3 } {
    if (edge === 'top' || edge === 'bottom') {
      return {
        geometry: new THREE.BoxGeometry(newWidth, bandingThickness, newDepth),
        position: new THREE.Vector3(
          0,
          edge === 'top'
            ? newHeight / 2 - bandingThickness / 2
            : -newHeight / 2 + bandingThickness / 2,
          0
        ),
      };
    }

    if (edge === 'left' || edge === 'right') {
      return {
        geometry: new THREE.BoxGeometry(bandingThickness, newHeight, newDepth),
        position: new THREE.Vector3(
          edge === 'left'
            ? -newWidth / 2 + bandingThickness / 2
            : newWidth / 2 - bandingThickness / 2,
          0,
          0
        ),
      };
    }

    if (edge === 'front' || edge === 'back') {
      return {
        geometry: new THREE.BoxGeometry(newWidth, newHeight, bandingThickness),
        position: new THREE.Vector3(
          0,
          0,
          edge === 'front'
            ? newDepth / 2 - bandingThickness / 2
            : -newDepth / 2 + bandingThickness / 2
        ),
      };
    }

    return { geometry: null, position: new THREE.Vector3() };
  }

  /**
   * Store original height and position
   */
  static storeOriginalDimensions(
    targetMesh: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): void {
    if (targetMesh.userData.originalHeight) return;

    const bbox = MeshUtils.getBoundingBox(targetMesh);
    const currentHeight = bbox.max.y - bbox.min.y;
    targetMesh.userData.originalHeight = currentHeight;

    const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
    const currentCenterWorld = targetMesh.localToWorld(
      currentCenterLocal.clone()
    );
    const currentCenterCupboard = cupboardMesh.worldToLocal(
      currentCenterWorld.clone()
    );
    targetMesh.userData.originalY = currentCenterCupboard.y;
  }

  /**
   * Calculate new center position after height adjustment
   */
  static calculateNewCenterAfterHeightAdjustment(
    currentCenterCupboard: THREE.Vector3,
    reductionAmount: number,
    reduceFrom: 'top' | 'bottom'
  ): number {
    if (reduceFrom === 'bottom') {
      return currentCenterCupboard.y + reductionAmount / 2;
    }
    return currentCenterCupboard.y - reductionAmount / 2;
  }
}
