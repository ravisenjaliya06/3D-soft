import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../../handler/items';
import { store } from '../../store';
import { removeObject, updateObject } from '../../store/dataSlice';
import { GEOMETRY, Material, MeshObjectData, PART_TYPES } from '../interface';
import { MeshBuilder } from '../meshBuilder';
import { SyncManager } from '../syncState';
import { L_SHAPE_CONSTANTS, getDefaultLShapeMaterial } from './lShapeObjectTool.constants';
import { HeightManager, PlankDataBuilder, PositionCalculator } from './lShapeObjectTool.helpers';
import { CoordinateUtils, DrawerDoorUtils, MeshUtils } from './lShapeObjectTool.utils';

const meshBuilder = (data: MeshObjectData | MeshObjectData[]) => {
  const builder = new SyncManager(data);
  return builder.syncData();
};

/**
 * LShapeObjectManager - Manages creation and removal of L-shape objects
 * Refactored for better maintainability and code organization
 */
export class LShapeObjectManager {
  /**
   * Get default L-shape dimensions
   */
  public static getDefaultDimensions(): {
    vertical: { width: number; height: number; depth: number };
    horizontal: { width: number; height: number; depth: number };
  } {
    return {
      vertical: {
        width: L_SHAPE_CONSTANTS.DEFAULT_VERTICAL_WIDTH,
        height: L_SHAPE_CONSTANTS.DEFAULT_VERTICAL_HEIGHT,
        depth: L_SHAPE_CONSTANTS.DEFAULT_VERTICAL_DEPTH,
      },
      horizontal: {
        width: L_SHAPE_CONSTANTS.DEFAULT_VERTICAL_WIDTH,
        height: L_SHAPE_CONSTANTS.DEFAULT_HORIZONTAL_HEIGHT,
        depth: L_SHAPE_CONSTANTS.DEFAULT_HORIZONTAL_DEPTH,
      },
    };
  }

  /**
   * Get default L-shape material
   */
  public static getDefaultMaterial(): Material[] {
    return getDefaultLShapeMaterial();
  }

  /**
   * Create L-shape object in a box
   */
  public static async createLShapeInBox(
    scene: THREE.Scene,
    boxMesh: THREE.Mesh,
    selectedCabinetItem: MeshObjectData | null = null
  ): Promise<void> {
    if (!selectedCabinetItem) {
      console.error('No cabinet item selected');
      return;
    }

    showFullScreenLoader('Adding L-shape object.');

    if (!boxMesh) {
      hideFullScreenLoader();
      return;
    }

    const geometry = boxMesh.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();

    if (!geometry.boundingBox) {
      hideFullScreenLoader();
      return;
    }

    const bbox = geometry.boundingBox;
    const boxCenterLocal = bbox.getCenter(new THREE.Vector3());
    const parent = MeshUtils.getParentMesh(boxMesh);
    const dimensions = this.getDefaultDimensions();

    const verticalPlankLocalPos = PlankDataBuilder.calculateVerticalPlankPositionForBox(
      boxCenterLocal,
      bbox,
      dimensions.vertical.height,
      dimensions.vertical.depth
    );

    const horizontalPlankLocalPos = PlankDataBuilder.calculateHorizontalPlankPositionForBox(
      boxCenterLocal,
      bbox,
      dimensions.horizontal.height,
      dimensions.vertical.depth,
      dimensions.horizontal.depth
    );

    const verticalPlankParentPos = CoordinateUtils.convertToParentLocalPosition(
      verticalPlankLocalPos,
      boxMesh,
      parent
    );

    const horizontalPlankParentPos = CoordinateUtils.convertToParentLocalPosition(
      horizontalPlankLocalPos,
      boxMesh,
      parent
    );

    const verticalPlank = PlankDataBuilder.createPlankData(
      selectedCabinetItem,
      dimensions.vertical,
      verticalPlankParentPos,
      parent.userData.objectId,
      'vertical'
    );

    const horizontalPlank = PlankDataBuilder.createPlankData(
      selectedCabinetItem,
      dimensions.horizontal,
      horizontalPlankParentPos,
      parent.userData.objectId,
      'horizontal'
    );

    await meshBuilder(verticalPlank);
    await meshBuilder(horizontalPlank);

    generateCompartmentsFromMesh(parent);
    hideFullScreenLoader();
  }

  /**
   * Find all consecutive vertically attached drawers/doors (same type)
   */
  private static findVerticallyAttachedPairs(
    drawersAndDoors: THREE.Mesh[],
    cupboardMesh: THREE.Mesh
  ): Array<[THREE.Mesh, THREE.Mesh]> {
    const pairs: Array<[THREE.Mesh, THREE.Mesh]> = [];

    cupboardMesh.updateMatrixWorld(true);
    drawersAndDoors.forEach((obj) => {
      obj.updateMatrixWorld(true);
    });

    const objectsByType = DrawerDoorUtils.groupByType(drawersAndDoors);

    objectsByType.forEach((objects) => {
      const alignedGroups = DrawerDoorUtils.groupByHorizontalAlignment(objects, cupboardMesh);

      alignedGroups.forEach((group) => {
        const sortedGroup = DrawerDoorUtils.sortVertically(group, cupboardMesh);

        for (let i = 0; i < sortedGroup.length - 1; i++) {
          const topObj = sortedGroup[i];
          const bottomObj = sortedGroup[i + 1];

          const targetMeshTop = MeshUtils.findTargetMesh(topObj);
          const targetMeshBottom = MeshUtils.findTargetMesh(bottomObj);
          if (!targetMeshTop || !targetMeshBottom) continue;

          if (MeshUtils.areVerticallyAdjacent(targetMeshTop, targetMeshBottom, cupboardMesh)) {
            pairs.push([topObj, bottomObj]);
          }
        }
      });
    });

    return pairs;
  }

  /**
   * Update Redux store with new object dimensions and position
   */
  private static updateReduxStore(
    targetMesh: THREE.Mesh,
    obj: THREE.Mesh,
    newHeight: number,
    newPosition: THREE.Vector3
  ): void {
    const objectId = targetMesh.userData.objectId || obj.userData.objectId;
    if (!objectId) return;

    const existingObjects = store.getState().data.objects;
    const objData = existingObjects.find((o) => o.id === objectId);
    if (!objData) return;

    const updatedMeshData = {
      ...objData,
      dimensions: {
        ...objData.dimensions,
        height: newHeight,
      },
      position: {
        ...objData.position,
        y: newPosition.y,
      },
    };

    store.dispatch(updateObject(updatedMeshData));
  }

  /**
   * Update mesh geometry and banding
   */
  private static updateMeshGeometryAndBanding(
    targetMesh: THREE.Mesh,
    newHeight: number,
    currentSize: THREE.Vector3
  ): void {
    if (targetMesh.geometry instanceof THREE.BoxGeometry) {
      targetMesh.geometry.dispose();
      targetMesh.geometry = new THREE.BoxGeometry(currentSize.x, newHeight, currentSize.z);
      targetMesh.geometry.computeBoundingBox();
    }

    HeightManager.updateBandingMeshes(targetMesh, currentSize.x, newHeight, currentSize.z);
  }

  /**
   * Adjust object height by reducing from top or bottom
   */
  private static async adjustObjectHeight(
    obj: THREE.Mesh,
    reductionAmount: number,
    reduceFrom: 'top' | 'bottom',
    cupboardMesh: THREE.Mesh
  ): Promise<void> {
    const targetMesh = MeshUtils.findTargetMesh(obj);
    if (!targetMesh) return;

    const bbox = MeshUtils.getBoundingBox(targetMesh);
    const currentHeight = bbox.max.y - bbox.min.y;

    if (currentHeight <= reductionAmount) {
      console.warn('[LShape] Object height too small to reduce');
      return;
    }

    HeightManager.storeOriginalDimensions(targetMesh, cupboardMesh);

    const newHeight = currentHeight - reductionAmount;
    const currentSize = new THREE.Vector3();
    bbox.getSize(currentSize);

    const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
    const currentCenterWorld = targetMesh.localToWorld(currentCenterLocal.clone());
    const currentCenterCupboard = cupboardMesh.worldToLocal(currentCenterWorld.clone());

    const newCenterCupboardY = HeightManager.calculateNewCenterAfterHeightAdjustment(
      currentCenterCupboard,
      reductionAmount,
      reduceFrom
    );

    this.updateMeshGeometryAndBanding(targetMesh, newHeight, currentSize);

    const newCenterWorld = cupboardMesh.localToWorld(
      new THREE.Vector3(currentCenterCupboard.x, newCenterCupboardY, currentCenterCupboard.z)
    );

    const parentMesh = targetMesh.parent as THREE.Mesh;
    const newCenterParentLocal = parentMesh
      ? parentMesh.worldToLocal(newCenterWorld.clone())
      : targetMesh.worldToLocal(newCenterWorld.clone());

    targetMesh.position.set(newCenterParentLocal.x, newCenterParentLocal.y, newCenterParentLocal.z);

    this.updateReduxStore(targetMesh, obj, newHeight, newCenterParentLocal);

    // Update banding using MeshBuilder
    try {
      const existingObjects = store.getState().data.objects;
      const objectId = targetMesh.userData.objectId || obj.userData.objectId;
      const objData = existingObjects.find((o) => o.id === objectId);
      if (objData) {
        const meshBuilder = new MeshBuilder({
          ...objData,
          dimensions: { ...objData.dimensions, height: newHeight },
          position: { ...objData.position, y: newCenterParentLocal.y },
        });
        meshBuilder.setParentMesh(parentMesh || cupboardMesh);
        await meshBuilder.updateBanding(targetMesh);
      }
    } catch (error) {
      console.warn('[LShape] Failed to update banding:', error);
    }
  }

  /**
   * Create plank positions for L-shape between two objects
   */
  private static createPlankPositions(
    centerX: number,
    centerY: number,
    centerZ: number,
    dimensions: {
      vertical: { width: number; height: number; depth: number };
      horizontal: { width: number; height: number; depth: number };
    }
  ): { vertical: THREE.Vector3; horizontal: THREE.Vector3 } {
    const objectsFrontZ = centerZ + L_SHAPE_CONSTANTS.FRONT_Z_OFFSET;
    const horizontalPlankBackFaceZ = objectsFrontZ - dimensions.horizontal.depth;

    const horizontalPlankPos = new THREE.Vector3(
      centerX,
      centerY + dimensions.horizontal.height / 2 + L_SHAPE_CONSTANTS.Y_OFFSET,
      objectsFrontZ - dimensions.horizontal.depth / 2
    );

    const verticalPlankPos = new THREE.Vector3(
      centerX,
      centerY + dimensions.vertical.height / 2 + L_SHAPE_CONSTANTS.Y_OFFSET,
      horizontalPlankBackFaceZ - dimensions.vertical.depth / 2
    );

    return { vertical: verticalPlankPos, horizontal: horizontalPlankPos };
  }

  /**
   * Create base mesh data for planks
   */
  private static createBaseMeshData(): MeshObjectData {
    return {
      id: '',
      name: '',
      type: PART_TYPES.L_SHAPE_OBJECT,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: { width: 0, height: 0, depth: 0 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      isMain: false,
    };
  }

  /**
   * Add L-shape object at the center between two vertically attached objects
   */
  private static async addLShapeAtCenter(
    topObj: THREE.Mesh,
    bottomObj: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    material: Material[]
  ): Promise<void> {
    try {
      const dimensions = this.getDefaultDimensions();
      const reductionAmount = L_SHAPE_CONSTANTS.REDUCTION_AMOUNT;

      // Adjust heights before creating L-shape
      await this.adjustObjectHeight(topObj, reductionAmount, 'bottom', cupboardMesh);
      await this.adjustObjectHeight(bottomObj, reductionAmount, 'top', cupboardMesh);

      // Update matrix world after height adjustments
      cupboardMesh.updateMatrixWorld(true);
      topObj.updateMatrixWorld(true);
      bottomObj.updateMatrixWorld(true);

      // Recalculate center position after height adjustments
      const { centerY, centerX, centerZ, width } =
        PositionCalculator.calculateCenterPositionBetweenObjects(topObj, bottomObj, cupboardMesh);

      cupboardMesh.geometry.computeBoundingBox();
      const cupboardBbox = cupboardMesh.geometry.boundingBox;
      if (!cupboardBbox) {
        throw new Error('Could not compute cupboard bounding box');
      }

      const { vertical: verticalPlankPos, horizontal: horizontalPlankPos } =
        this.createPlankPositions(centerX, centerY, centerZ, dimensions);

      const baseData = this.createBaseMeshData();

      const verticalPlank = PlankDataBuilder.createPlankData(
        baseData,
        {
          ...dimensions.vertical,
          width,
        },
        verticalPlankPos,
        cupboardMesh.userData.objectId,
        'vertical',
        material
      );

      const horizontalPlank = PlankDataBuilder.createPlankData(
        baseData,
        {
          ...dimensions.horizontal,
          width,
        },
        horizontalPlankPos,
        cupboardMesh.userData.objectId,
        'horizontal',
        material
      );

      await meshBuilder(verticalPlank);
      await meshBuilder(horizontalPlank);
    } catch (error) {
      console.error('[LShape] Error adding L-shape at center:', error);
    }
  }

  /**
   * Add L-shape objects to all drawers and doors in a cupboard
   */
  public static async addLShapeToDrawersAndDoors(
    scene: THREE.Scene,
    cupboardMesh: THREE.Mesh
  ): Promise<void> {
    if (!cupboardMesh) return;
    showFullScreenLoader('Adding L-shape objects.');

    await this.removeLShapeObjects(cupboardMesh);

    const drawersAndDoors = DrawerDoorUtils.findDrawersAndDoors(cupboardMesh);
    const material = this.getDefaultMaterial();

    const pairs = this.findVerticallyAttachedPairs(drawersAndDoors, cupboardMesh);
    for (const [topObj, bottomObj] of pairs) {
      await this.addLShapeAtCenter(topObj, bottomObj, cupboardMesh, material);
    }

    generateCompartmentsFromMesh(cupboardMesh);
    hideFullScreenLoader();
  }

  /**
   * Find L-shape objects to remove by drawer/door ID
   */
  private static findLShapesByDrawerOrDoorId(
    cupboardMesh: THREE.Mesh,
    drawerOrDoorId: string
  ): THREE.Object3D[] {
    const toRemove: THREE.Object3D[] = [];

    cupboardMesh.children.forEach((child) => {
      if (
        (child.userData.type === PART_TYPES.L_SHAPE_OBJECT || child.name?.includes('L_SHAPE')) &&
        child instanceof THREE.Mesh
      ) {
        if (child.userData.drawerOrDoorId === drawerOrDoorId) {
          toRemove.push(child);
        }
      }
    });

    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT || obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        if (obj.userData.drawerOrDoorId === drawerOrDoorId && !toRemove.includes(obj)) {
          toRemove.push(obj);
        }
      }
    });

    return toRemove;
  }

  /**
   * Find L-shape objects by proximity to target mesh
   */
  private static findLShapesByProximity(
    cupboardMesh: THREE.Mesh,
    targetMesh: THREE.Mesh
  ): THREE.Object3D[] {
    const toRemove: THREE.Object3D[] = [];
    targetMesh.updateMatrixWorld(true);
    const targetPos = new THREE.Vector3();
    targetMesh.getWorldPosition(targetPos);

    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT || obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        obj.updateMatrixWorld(true);
        const lShapePos = new THREE.Vector3();
        obj.getWorldPosition(lShapePos);

        const distance = targetPos.distanceTo(lShapePos);
        if (
          distance < L_SHAPE_CONSTANTS.DISTANCE_THRESHOLD &&
          Math.abs(targetPos.x - lShapePos.x) < L_SHAPE_CONSTANTS.POSITION_TOLERANCE
        ) {
          if (!toRemove.includes(obj)) {
            toRemove.push(obj);
          }
        }
      }
    });

    return toRemove;
  }

  /**
   * Remove L-shape objects for a specific drawer or door
   */
  public static removeLShapeForDrawerOrDoor(
    drawerOrDoor: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): void {
    if (!drawerOrDoor || !cupboardMesh) return;

    const drawerOrDoorId = drawerOrDoor.userData.objectId;
    if (!drawerOrDoorId) return;

    let toRemove = this.findLShapesByDrawerOrDoorId(cupboardMesh, drawerOrDoorId);

    if (toRemove.length === 0) {
      const targetMesh = MeshUtils.findTargetMesh(drawerOrDoor);
      if (targetMesh) {
        toRemove = this.findLShapesByProximity(cupboardMesh, targetMesh);
      }
    }

    toRemove.forEach((child) => {
      const objectId = child.userData.objectId;
      if (objectId) {
        store.dispatch(removeObject(objectId));
      }
      if (child.parent) {
        child.parent.remove(child);
      }
    });
  }

  /**
   * Restore original height of an object that was reduced for L-shape
   */
  private static async restoreObjectHeight(
    obj: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): Promise<void> {
    const targetMesh = MeshUtils.findTargetMesh(obj);
    if (!targetMesh) return;

    const originalHeight = targetMesh.userData.originalHeight;
    const originalY = targetMesh.userData.originalY;

    if (!originalHeight) return;

    const bbox = MeshUtils.getBoundingBox(targetMesh);
    const currentHeight = bbox.max.y - bbox.min.y;

    if (currentHeight === originalHeight) return;

    const currentSize = new THREE.Vector3();
    bbox.getSize(currentSize);

    // Restore original height
    if (targetMesh.geometry instanceof THREE.BoxGeometry) {
      targetMesh.geometry.dispose();
      targetMesh.geometry = new THREE.BoxGeometry(currentSize.x, originalHeight, currentSize.z);
      targetMesh.geometry.computeBoundingBox();
    }

    HeightManager.updateBandingMeshes(targetMesh, currentSize.x, originalHeight, currentSize.z);

    // Restore original position
    if (originalY !== undefined) {
      const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
      const currentCenterWorld = targetMesh.localToWorld(currentCenterLocal.clone());
      const currentCenterCupboard = cupboardMesh.worldToLocal(currentCenterWorld.clone());

      const restoredWorld = cupboardMesh.localToWorld(
        new THREE.Vector3(currentCenterCupboard.x, originalY, currentCenterCupboard.z)
      );

      const parentMesh = targetMesh.parent as THREE.Mesh;
      const restoredParentLocal = parentMesh
        ? parentMesh.worldToLocal(restoredWorld.clone())
        : targetMesh.worldToLocal(restoredWorld.clone());

      targetMesh.position.set(restoredParentLocal.x, restoredParentLocal.y, restoredParentLocal.z);

      // Update Redux store
      const objectId = targetMesh.userData.objectId || obj.userData.objectId;
      if (objectId) {
        const existingObjects = store.getState().data.objects;
        const objData = existingObjects.find((o) => o.id === objectId);
        if (objData) {
          const updatedMeshData = {
            ...objData,
            dimensions: {
              ...objData.dimensions,
              height: originalHeight,
            },
            position: {
              ...objData.position,
              y: restoredParentLocal.y,
            },
          };

          store.dispatch(updateObject(updatedMeshData));

          // Update banding using MeshBuilder
          try {
            const meshBuilder = new MeshBuilder(updatedMeshData);
            meshBuilder.setParentMesh(parentMesh || cupboardMesh);
            await meshBuilder.updateBanding(targetMesh);
          } catch (error) {
            console.warn('[LShape] Failed to update banding during restore:', error);
          }
        }
      }
    }

    // Clear stored original values
    delete targetMesh.userData.originalHeight;
    delete targetMesh.userData.originalY;
  }

  /**
   * Find all L-shape objects in cupboard
   */
  private static findAllLShapeObjects(cupboardMesh: THREE.Mesh): THREE.Object3D[] {
    const toRemove: THREE.Object3D[] = [];

    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT || obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        if (!toRemove.includes(obj)) {
          toRemove.push(obj);
        }
      }
    });

    return toRemove;
  }

  /**
   * Remove all L-shape objects from a cupboard and restore original heights
   */
  public static async removeLShapeObjects(cupboardMesh: THREE.Mesh): Promise<void> {
    if (!cupboardMesh) return;

    // Restore original heights for all drawers and doors
    const drawersAndDoors = DrawerDoorUtils.findDrawersAndDoors(cupboardMesh);
    for (const drawerOrDoor of drawersAndDoors) {
      await this.restoreObjectHeight(drawerOrDoor, cupboardMesh);
    }

    // Remove L-shape objects
    const toRemove = this.findAllLShapeObjects(cupboardMesh);

    toRemove.forEach((child) => {
      const objectId = child.userData.objectId;
      if (objectId) {
        store.dispatch(removeObject(objectId));
      }
      if (child.parent) {
        child.parent.remove(child);
      }
    });
  }
}
