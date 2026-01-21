import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../../handler/items';
import {
  DRAWER_PLANK_TYPES,
  GEOMETRY,
  Material,
  MeshObjectData,
  PART_TYPES,
} from '../interface';
import { SyncManager } from '../syncState';
import { store } from '../../store';
import { removeObject, updateObject } from '../../store/dataSlice';
import { MeshBuilder } from '../meshBuilder';

const meshBuilder = (data: MeshObjectData | MeshObjectData[]) => {
  const builder = new SyncManager(data);
  return builder.syncData();
};

/**
 * LShapeObjectManager - Manages creation and removal of L-shape objects
 * Each method has a single responsibility following SOLID principles
 */
export class LShapeObjectManager {
  private static readonly DEFAULT_VERTICAL_HEIGHT = 100;
  private static readonly DEFAULT_VERTICAL_DEPTH = 18;
  private static readonly DEFAULT_VERTICAL_WIDTH = 18;
  private static readonly DEFAULT_HORIZONTAL_HEIGHT = 20;
  private static readonly DEFAULT_HORIZONTAL_DEPTH = 50;

  /**
   * Get default L-shape dimensions
   */
  public static getDefaultDimensions(): {
    vertical: { width: number; height: number; depth: number };
    horizontal: { width: number; height: number; depth: number };
  } {
    return {
      vertical: {
        width: this.DEFAULT_VERTICAL_WIDTH,
        height: this.DEFAULT_VERTICAL_HEIGHT,
        depth: this.DEFAULT_VERTICAL_DEPTH,
      },
      horizontal: {
        width: this.DEFAULT_VERTICAL_WIDTH,
        height: this.DEFAULT_HORIZONTAL_HEIGHT,
        depth: this.DEFAULT_HORIZONTAL_DEPTH,
      },
    };
  }

  /**
   * Get default L-shape material
   */
  public static getDefaultMaterial(): Material[] {
    return [
      {
        id: crypto.randomUUID(),
        name: '3/4 1s Poplar Ply',
        type: 'Panel Stock',
        description: 'Poplar',
        textures: [
          {
            id: crypto.randomUUID(),
            name: 'First',
            texture: crypto.randomUUID(),
            textureDetail: {
              id: crypto.randomUUID(),
              name: 'Art Glass',
              organization: crypto.randomUUID(),
              type: 'Texture',
              image: '/media/textures/light_wood.jpg',
              url: '',
              width: 685,
              height: 685,
              decal: 0,
              title: 1,
            },
          },
        ],
        properties: {
          id: crypto.randomUUID(),
          unitOfIssue: 'Each',
          defaultCost: 10.0,
          sellPrice: 0.0,
          defaultMarkup: 0.0,
          salesTax: false,
          defaultTaxRate: 0.0,
          waste: 15.0,
          estimate: true,
          modelFile: null,
          cncOptimize: true,
          cncGrainDependent: true,
          cncDropWidth: null,
          cncDropLength: null,
          cncFeedRatePercent: 100.0,
          cncSpindleSpeedPercent: 100.0,
          cncMinimizeFaceChip: true,
          cncMinimizeBackChip: true,
          cncClimbCut: false,
          cncMaximumDepthPerPass: null,
          width: 1219.2,
          length: 2438.4,
          thickness: 19.1,
        },
      },
    ];
  }

  /**
   * Calculate vertical plank position for box
   */
  private static calculateVerticalPlankPositionForBox(
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
  private static calculateHorizontalPlankPositionForBox(
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

  /**
   * Create vertical plank MeshObjectData
   */
  private static createVerticalPlankData(
    baseData: MeshObjectData,
    dimensions: { width: number; height: number; depth: number },
    position: THREE.Vector3,
    parentId: string,
    material?: Material[],
    drawerOrDoorId?: string
  ): MeshObjectData {
    const plankData: MeshObjectData = {
      ...baseData,
      id: crypto.randomUUID(),
      name: 'L_SHAPE_VERTICAL_PLANK',
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
   * Create horizontal plank MeshObjectData
   */
  private static createHorizontalPlankData(
    baseData: MeshObjectData,
    dimensions: { width: number; height: number; depth: number },
    position: THREE.Vector3,
    parentId: string,
    material?: Material[],
    drawerOrDoorId?: string
  ): MeshObjectData {
    const plankData: MeshObjectData = {
      ...baseData,
      id: crypto.randomUUID(),
      name: 'L_SHAPE_HORIZONTAL_PLANK',
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
   * Get parent mesh from box mesh
   */
  private static getParentMesh(boxMesh: THREE.Mesh): THREE.Mesh {
    return !boxMesh.parent?.userData.isMain ? boxMesh : (boxMesh.parent as THREE.Mesh);
  }

  /**
   * Convert local position to parent local position
   */
  private static convertToParentLocalPosition(
    localPos: THREE.Vector3,
    boxMesh: THREE.Mesh,
    parent: THREE.Mesh
  ): THREE.Vector3 {
    const worldPos = boxMesh.localToWorld(localPos.clone());
    return parent.worldToLocal(worldPos.clone());
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
    const parent = this.getParentMesh(boxMesh);

    const dimensions = this.getDefaultDimensions();

    const verticalPlankLocalPos = this.calculateVerticalPlankPositionForBox(
      boxCenterLocal,
      bbox,
      dimensions.vertical.height,
      dimensions.vertical.depth
    );

    const horizontalPlankLocalPos = this.calculateHorizontalPlankPositionForBox(
      boxCenterLocal,
      bbox,
      dimensions.horizontal.height,
      dimensions.vertical.depth,
      dimensions.horizontal.depth
    );

    const verticalPlankParentPos = this.convertToParentLocalPosition(
      verticalPlankLocalPos,
      boxMesh,
      parent
    );

    const horizontalPlankParentPos = this.convertToParentLocalPosition(
      horizontalPlankLocalPos,
      boxMesh,
      parent
    );

    const verticalPlank = this.createVerticalPlankData(
      selectedCabinetItem,
      dimensions.vertical,
      verticalPlankParentPos,
      parent.userData.objectId
    );

    const horizontalPlank = this.createHorizontalPlankData(
      selectedCabinetItem,
      dimensions.horizontal,
      horizontalPlankParentPos,
      parent.userData.objectId
    );

    await meshBuilder(verticalPlank);
    await meshBuilder(horizontalPlank);

    generateCompartmentsFromMesh(parent);
    hideFullScreenLoader();
  }

  /**
   * Find drawers and doors in cupboard
   */
  private static findDrawersAndDoors(cupboardMesh: THREE.Mesh): THREE.Mesh[] {
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
   * Find target mesh (drawer face or door mesh)
   */
  private static findTargetMesh(drawerOrDoor: THREE.Mesh): THREE.Mesh | null {
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
    } else {
      return drawerOrDoor;
    }
  }

  /**
   * Find all consecutive vertically attached drawers/doors (same type)
   * Groups objects by type and horizontal alignment, sorts vertically, then creates pairs between consecutive objects
   * Returns array of pairs where each pair contains [topObject, bottomObject]
   * Example: 3 objects -> 2 pairs, 5 objects -> 4 pairs
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

    const objectsByType = new Map<string, THREE.Mesh[]>();
    drawersAndDoors.forEach((obj) => {
      const type = obj.userData.type;
      if (!objectsByType.has(type)) {
        objectsByType.set(type, []);
      }
      objectsByType.get(type)!.push(obj);
    });

    // Process each type group
    objectsByType.forEach((objects, type) => {
      const alignedGroups: THREE.Mesh[][] = [];
      const processed = new Set<THREE.Mesh>();

      for (const obj1 of objects) {
        if (processed.has(obj1)) continue;

        const targetMesh1 = this.findTargetMesh(obj1);
        if (!targetMesh1) continue;

        targetMesh1.updateMatrixWorld(true);
        targetMesh1.geometry.computeBoundingBox();
        const bbox1 = targetMesh1.geometry.boundingBox;
        if (!bbox1) continue;

        const center1 = new THREE.Vector3();
        bbox1.getCenter(center1);
        const worldCenter1 = targetMesh1.localToWorld(center1.clone());
        const cupboardLocal1 = cupboardMesh.worldToLocal(worldCenter1.clone());

        const size1 = new THREE.Vector3();
        bbox1.getSize(size1);
        const alignmentThreshold = Math.max(size1.x, size1.z) * 0.15;

        const alignedGroup: THREE.Mesh[] = [obj1];
        processed.add(obj1);

        for (const obj2 of objects) {
          if (processed.has(obj2)) continue;

          const targetMesh2 = this.findTargetMesh(obj2);
          if (!targetMesh2) continue;

          targetMesh2.updateMatrixWorld(true);
          targetMesh2.geometry.computeBoundingBox();
          const bbox2 = targetMesh2.geometry.boundingBox;
          if (!bbox2) continue;

          const center2 = new THREE.Vector3();
          bbox2.getCenter(center2);
          const worldCenter2 = targetMesh2.localToWorld(center2.clone());
          const cupboardLocal2 = cupboardMesh.worldToLocal(worldCenter2.clone());

          const xDiff = Math.abs(cupboardLocal1.x - cupboardLocal2.x);
          const zDiff = Math.abs(cupboardLocal1.z - cupboardLocal2.z);

          if (xDiff < alignmentThreshold && zDiff < alignmentThreshold) {
            alignedGroup.push(obj2);
            processed.add(obj2);
          }
        }

        if (alignedGroup.length > 1) {
          alignedGroups.push(alignedGroup);
        }
      }

      alignedGroups.forEach((group) => {
        group.sort((a, b) => {
          const targetMeshA = this.findTargetMesh(a);
          const targetMeshB = this.findTargetMesh(b);
          if (!targetMeshA || !targetMeshB) return 0;

          targetMeshA.updateMatrixWorld(true);
          targetMeshB.updateMatrixWorld(true);
          targetMeshA.geometry.computeBoundingBox();
          targetMeshB.geometry.computeBoundingBox();

          const bboxA = targetMeshA.geometry.boundingBox;
          const bboxB = targetMeshB.geometry.boundingBox;
          if (!bboxA || !bboxB) return 0;

          const centerA = new THREE.Vector3();
          const centerB = new THREE.Vector3();
          bboxA.getCenter(centerA);
          bboxB.getCenter(centerB);

          const worldCenterA = targetMeshA.localToWorld(centerA.clone());
          const worldCenterB = targetMeshB.localToWorld(centerB.clone());

          const cupboardLocalA = cupboardMesh.worldToLocal(worldCenterA.clone());
          const cupboardLocalB = cupboardMesh.worldToLocal(worldCenterB.clone());

          return cupboardLocalB.y - cupboardLocalA.y;
        });

        for (let i = 0; i < group.length - 1; i++) {
          const topObj = group[i];
          const bottomObj = group[i + 1];

          const targetMeshTop = this.findTargetMesh(topObj);
          const targetMeshBottom = this.findTargetMesh(bottomObj);
          if (!targetMeshTop || !targetMeshBottom) continue;

          targetMeshTop.updateMatrixWorld(true);
          targetMeshBottom.updateMatrixWorld(true);
          targetMeshTop.geometry.computeBoundingBox();
          targetMeshBottom.geometry.computeBoundingBox();

          const bboxTop = targetMeshTop.geometry.boundingBox;
          const bboxBottom = targetMeshBottom.geometry.boundingBox;
          if (!bboxTop || !bboxBottom) continue;

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

          const topBottomWorld = targetMeshTop.localToWorld(topBottomLocal.clone());
          const bottomTopWorld = targetMeshBottom.localToWorld(bottomTopLocal.clone());

          const topBottomCupboard = cupboardMesh.worldToLocal(topBottomWorld.clone());
          const bottomTopCupboard = cupboardMesh.worldToLocal(bottomTopWorld.clone());

          const gapThreshold = 50;
          const isAdjacent = topBottomCupboard.y <= bottomTopCupboard.y + gapThreshold &&
                            topBottomCupboard.y >= bottomTopCupboard.y - gapThreshold;

          if (isAdjacent) {
            pairs.push([topObj, bottomObj]);
          }
        }
      });
    });

    return pairs;
  }

  /**
   * Calculate center position between two vertically attached objects
   * Returns position info for placing l-shape so vertical plank spans half into top and half into bottom object
   */
  private static calculateCenterPositionBetweenObjects(
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
    const targetMeshTop = this.findTargetMesh(topObj);
    const targetMeshBottom = this.findTargetMesh(bottomObj);
    
    if (!targetMeshTop || !targetMeshBottom) {
      throw new Error('Could not find target mesh for objects');
    }

    cupboardMesh.updateMatrixWorld(true);
    targetMeshTop.updateMatrixWorld(true);
    targetMeshBottom.updateMatrixWorld(true);

    targetMeshTop.geometry.computeBoundingBox();
    targetMeshBottom.geometry.computeBoundingBox();
    const bboxTop = targetMeshTop.geometry.boundingBox;
    const bboxBottom = targetMeshBottom.geometry.boundingBox;

    if (!bboxTop || !bboxBottom) {
      throw new Error('Could not compute bounding boxes');
    }

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
    const bottomCenterWorld = targetMeshBottom.localToWorld(bottomCenterLocal.clone());
    const topBottomWorld = targetMeshTop.localToWorld(topBottomLocal.clone());
    const bottomTopWorld = targetMeshBottom.localToWorld(bottomTopLocal.clone());

    const topCenterCupboardLocal = cupboardMesh.worldToLocal(topCenterWorld.clone());
    const bottomCenterCupboardLocal = cupboardMesh.worldToLocal(bottomCenterWorld.clone());
    const topBottomCupboardLocal = cupboardMesh.worldToLocal(topBottomWorld.clone());
    const bottomTopCupboardLocal = cupboardMesh.worldToLocal(bottomTopWorld.clone());

    const centerY = (topBottomCupboardLocal.y + bottomTopCupboardLocal.y) / 2;
    const centerX = (topCenterCupboardLocal.x + bottomCenterCupboardLocal.x) / 2;
    const centerZ = Math.min(topCenterCupboardLocal.z, bottomCenterCupboardLocal.z); // Use the frontmost Z

    const topHalfHeight = sizeTop.y / 2;
    const bottomHalfHeight = sizeBottom.y / 2;

    const verticalPlankStartY = topBottomCupboardLocal.y + topHalfHeight;
    const verticalPlankEndY = bottomTopCupboardLocal.y - bottomHalfHeight;
    const verticalPlankHeight = verticalPlankStartY - verticalPlankEndY;

    const width = (sizeTop.x + sizeBottom.x) / 2;

    return { 
      centerY, 
      centerX, 
      centerZ, 
      width,
      verticalPlankStartY,
      verticalPlankEndY,
      verticalPlankHeight
    };
  }

  /**
   * Update banding meshes when object dimensions change
   */
  private static updateBandingMeshes(
    mesh: THREE.Mesh,
    newWidth: number,
    newHeight: number,
    newDepth: number
  ): void {
    mesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.type !== 'banding') return;
      if (!(child.geometry instanceof THREE.BoxGeometry)) return;

      const edge = child.userData.edge;
      const bandingParams = child.geometry.parameters;
      const bandingThickness = Math.min(
        bandingParams.width,
        bandingParams.height,
        bandingParams.depth
      );

      // Update banding geometry and position based on edge
      let newGeometry: THREE.BoxGeometry;
      let newPosition: THREE.Vector3;

      if (edge === 'top' || edge === 'bottom') {
        newGeometry = new THREE.BoxGeometry(newWidth, bandingThickness, newDepth);
        newPosition = new THREE.Vector3(
          0,
          edge === 'top'
            ? newHeight / 2 - bandingThickness / 2
            : -newHeight / 2 + bandingThickness / 2,
          0
        );
      } else if (edge === 'left' || edge === 'right') {
        newGeometry = new THREE.BoxGeometry(bandingThickness, newHeight, newDepth);
        newPosition = new THREE.Vector3(
          edge === 'left'
            ? -newWidth / 2 + bandingThickness / 2
            : newWidth / 2 - bandingThickness / 2,
          0,
          0
        );
      } else if (edge === 'front' || edge === 'back') {
        newGeometry = new THREE.BoxGeometry(newWidth, newHeight, bandingThickness);
        newPosition = new THREE.Vector3(
          0,
          0,
          edge === 'front'
            ? newDepth / 2 - bandingThickness / 2
            : -newDepth / 2 + bandingThickness / 2
        );
      } else {
        return; // Unknown edge
      }

      child.geometry.dispose();
      child.geometry = newGeometry;
      child.position.copy(newPosition);
    });
  }

  /**
   * Adjust object height by reducing from top or bottom
   * Updates both mesh geometry, banding, and Redux store
   */
  private static async adjustObjectHeight(
    obj: THREE.Mesh,
    reductionAmount: number,
    reduceFrom: 'top' | 'bottom',
    cupboardMesh: THREE.Mesh
  ): Promise<void> {
    const targetMesh = this.findTargetMesh(obj);
    if (!targetMesh) return;

    targetMesh.updateMatrixWorld(true);
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    if (!bbox) return;

    const currentHeight = bbox.max.y - bbox.min.y;
    if (currentHeight <= reductionAmount) {
      console.warn('[LShape] Object height too small to reduce');
      return;
    }

    // Store original height and position if not already stored (to allow restoration later)
    if (!targetMesh.userData.originalHeight) {
      targetMesh.userData.originalHeight = currentHeight;
      const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
      const currentCenterWorld = targetMesh.localToWorld(currentCenterLocal.clone());
      const currentCenterCupboard = cupboardMesh.worldToLocal(currentCenterWorld.clone());
      targetMesh.userData.originalY = currentCenterCupboard.y;
    }

    const newHeight = currentHeight - reductionAmount;
    const currentSize = new THREE.Vector3();
    bbox.getSize(currentSize);

    // Get current center position in target mesh local space
    const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
    
    // Convert to world space, then to cupboard local space for calculation
    const currentCenterWorld = targetMesh.localToWorld(currentCenterLocal.clone());
    const currentCenterCupboard = cupboardMesh.worldToLocal(currentCenterWorld.clone());

    // Calculate new center position in cupboard local space
    let newCenterCupboardY: number;
    if (reduceFrom === 'bottom') {
      // Reduce from bottom: move center up by half the reduction
      newCenterCupboardY = currentCenterCupboard.y + reductionAmount / 2;
    } else {
      // Reduce from top: move center down by half the reduction
      newCenterCupboardY = currentCenterCupboard.y - reductionAmount / 2;
    }

    // Update mesh geometry first
    if (targetMesh.geometry instanceof THREE.BoxGeometry) {
      targetMesh.geometry.dispose();
      targetMesh.geometry = new THREE.BoxGeometry(
        currentSize.x,
        newHeight,
        currentSize.z
      );
      targetMesh.geometry.computeBoundingBox();
    }

    // Update banding meshes to match new dimensions
    this.updateBandingMeshes(targetMesh, currentSize.x, newHeight, currentSize.z);

    // Calculate new position relative to target mesh's parent
    const newCenterWorld = cupboardMesh.localToWorld(new THREE.Vector3(
      currentCenterCupboard.x,
      newCenterCupboardY,
      currentCenterCupboard.z
    ));
    
    const parentMesh = targetMesh.parent as THREE.Mesh;
    const newCenterParentLocal = parentMesh 
      ? parentMesh.worldToLocal(newCenterWorld.clone())
      : targetMesh.worldToLocal(newCenterWorld.clone());

    // Update mesh position
    targetMesh.position.set(
      newCenterParentLocal.x,
      newCenterParentLocal.y,
      newCenterParentLocal.z
    );

    // Update Redux store
    const objectId = targetMesh.userData.objectId || obj.userData.objectId;
    if (objectId) {
      const existingObjects = store.getState().data.objects;
      const objData = existingObjects.find((o) => o.id === objectId);
      if (objData) {
        // Find the actual parent object ID for Redux update
        let parentObjectId = objData.parent;
        if (parentMesh && parentMesh.userData.objectId) {
          parentObjectId = parentMesh.userData.objectId;
        }

        // Get position relative to the parent object in Redux
        let finalPosition = newCenterParentLocal;
        if (parentObjectId && parentMesh) {
          // Position is already in parent local space, use it directly
          finalPosition = newCenterParentLocal;
        }

        const updatedMeshData = {
          ...objData,
          dimensions: {
            ...objData.dimensions,
            height: newHeight,
          },
          position: {
            ...objData.position,
            y: finalPosition.y,
          },
        };

        store.dispatch(updateObject(updatedMeshData));

        // Also update banding using MeshBuilder to ensure consistency
        try {
          const meshBuilder = new MeshBuilder(updatedMeshData);
          meshBuilder.setParentMesh(parentMesh || cupboardMesh);
          await meshBuilder.updateBanding(targetMesh);
        } catch (error) {
          console.warn('[LShape] Failed to update banding:', error);
        }
      }
    }
  }

  /**
   * Add L-shape object at the center between two vertically attached objects
   * Vertical plank spans half into top object and half into bottom object, positioned behind for visualization
   * Also reduces heights of top and bottom objects to accommodate the L-shape
   */
  private static async addLShapeAtCenter(
    topObj: THREE.Mesh,
    bottomObj: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    material: Material[]
  ): Promise<void> {
    try {
      // First calculate the initial center position and reduction amount
      const { 
        centerY: initialCenterY, 
        centerX: initialCenterX, 
        centerZ: initialCenterZ, 
        width,
        verticalPlankHeight
      } = this.calculateCenterPositionBetweenObjects(
        topObj,
        bottomObj,
        cupboardMesh
      );

      const dimensions = this.getDefaultDimensions();
      const verticalWidth = width;
      const horizontalWidth = width;

      // Fixed reduction amount: 50mm from top and bottom
      const REDUCTION_AMOUNT = 25;

      // Adjust heights of top and bottom objects before creating L-shape
      await this.adjustObjectHeight(topObj, REDUCTION_AMOUNT, 'bottom', cupboardMesh);
      await this.adjustObjectHeight(bottomObj, REDUCTION_AMOUNT, 'top', cupboardMesh);

      // Update matrix world after height adjustments to ensure accurate recalculation
      cupboardMesh.updateMatrixWorld(true);
      topObj.updateMatrixWorld(true);
      bottomObj.updateMatrixWorld(true);

      // Recalculate center position after height adjustments
      // The center should remain approximately the same, but we recalculate to be precise
      const { 
        centerY, 
        centerX, 
        centerZ
      } = this.calculateCenterPositionBetweenObjects(
        topObj,
        bottomObj,
        cupboardMesh
      );

      cupboardMesh.geometry.computeBoundingBox();
      const cupboardBbox = cupboardMesh.geometry.boundingBox;
      if (!cupboardBbox) {
        throw new Error('Could not compute cupboard bounding box');
      }

      const objectsFrontZ = centerZ;
      const horizontalPlankBackFaceZ = objectsFrontZ - dimensions.horizontal.depth;

      const yOffset = -50;

      const horizontalPlankPos = new THREE.Vector3(
        centerX,
        centerY + dimensions.horizontal.height / 2 + yOffset,
        objectsFrontZ - dimensions.horizontal.depth / 2
      );

      const verticalPlankPos = new THREE.Vector3(
        centerX,
        centerY + dimensions.vertical.height / 2 + yOffset,
        horizontalPlankBackFaceZ - dimensions.vertical.depth / 2
      );

      const verticalPlank = this.createVerticalPlankData(
        {
          id: '',
          name: '',
          type: PART_TYPES.L_SHAPE_OBJECT,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: { width: 0, height: 0, depth: 0 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          isMain: false,
        },
        {
          ...dimensions.vertical,
          width: verticalWidth,
        },
        verticalPlankPos,
        cupboardMesh.userData.objectId,
        material
      );

      const horizontalPlank = this.createHorizontalPlankData(
        {
          id: '',
          name: '',
          type: PART_TYPES.L_SHAPE_OBJECT,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: { width: 0, height: 0, depth: 0 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          isMain: false,
        },
        {
          ...dimensions.horizontal,
          width: horizontalWidth,
        },
        horizontalPlankPos,
        cupboardMesh.userData.objectId,
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
   * Now only adds L-shapes between vertically attached pairs of same objects
   */
  public static async addLShapeToDrawersAndDoors(
    scene: THREE.Scene,
    cupboardMesh: THREE.Mesh
  ): Promise<void> {
    if (!cupboardMesh) return;
    showFullScreenLoader('Adding L-shape objects.');

    await this.removeLShapeObjects(cupboardMesh);

    const drawersAndDoors = this.findDrawersAndDoors(cupboardMesh);
    const material = this.getDefaultMaterial();

    const pairs = this.findVerticallyAttachedPairs(drawersAndDoors, cupboardMesh);
    for (const [topObj, bottomObj] of pairs) {
      await this.addLShapeAtCenter(topObj, bottomObj, cupboardMesh, material);
    }

    generateCompartmentsFromMesh(cupboardMesh);
    hideFullScreenLoader();
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

    const toRemove: THREE.Object3D[] = [];
    cupboardMesh.children.forEach((child) => {
      if (
        (child.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          child.name?.includes('L_SHAPE')) &&
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
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        if (obj.userData.drawerOrDoorId === drawerOrDoorId) {
          if (!toRemove.includes(obj)) {
            toRemove.push(obj);
          }
        }
      }
    });

    if (toRemove.length === 0) {
      const targetMesh = this.findTargetMesh(drawerOrDoor);
      if (targetMesh) {
        targetMesh.updateMatrixWorld(true);
        const targetPos = new THREE.Vector3();
        targetMesh.getWorldPosition(targetPos);

        cupboardMesh.traverse((obj) => {
          if (
            obj !== cupboardMesh &&
            (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
              obj.name?.includes('L_SHAPE')) &&
            obj instanceof THREE.Mesh
          ) {
            obj.updateMatrixWorld(true);
            const lShapePos = new THREE.Vector3();
            obj.getWorldPosition(lShapePos);

            const distance = targetPos.distanceTo(lShapePos);
            if (distance < 200) {
              if (Math.abs(targetPos.x - lShapePos.x) < 50) {
                if (!toRemove.includes(obj)) {
                  toRemove.push(obj);
                }
              }
            }
          }
        });
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
    const targetMesh = this.findTargetMesh(obj);
    if (!targetMesh) return;

    const originalHeight = targetMesh.userData.originalHeight;
    const originalY = targetMesh.userData.originalY;

    if (!originalHeight) {
      // No original height stored, nothing to restore
      return;
    }

    targetMesh.updateMatrixWorld(true);
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    if (!bbox) return;

    const currentHeight = bbox.max.y - bbox.min.y;
    if (currentHeight === originalHeight) {
      // Already at original height, nothing to restore
      return;
    }

    const currentSize = new THREE.Vector3();
    bbox.getSize(currentSize);

    // Restore original height
    if (targetMesh.geometry instanceof THREE.BoxGeometry) {
      targetMesh.geometry.dispose();
      targetMesh.geometry = new THREE.BoxGeometry(
        currentSize.x,
        originalHeight,
        currentSize.z
      );
      targetMesh.geometry.computeBoundingBox();
    }

    // Update banding meshes to match restored dimensions
    this.updateBandingMeshes(targetMesh, currentSize.x, originalHeight, currentSize.z);

    // Restore original position
    if (originalY !== undefined) {
      const currentCenterLocal = bbox.getCenter(new THREE.Vector3());
      const currentCenterWorld = targetMesh.localToWorld(currentCenterLocal.clone());
      const currentCenterCupboard = cupboardMesh.worldToLocal(currentCenterWorld.clone());

      // Calculate restored position
      const restoredCupboardY = originalY;
      const restoredWorld = cupboardMesh.localToWorld(new THREE.Vector3(
        currentCenterCupboard.x,
        restoredCupboardY,
        currentCenterCupboard.z
      ));

      const parentMesh = targetMesh.parent as THREE.Mesh;
      const restoredParentLocal = parentMesh
        ? parentMesh.worldToLocal(restoredWorld.clone())
        : targetMesh.worldToLocal(restoredWorld.clone());

      targetMesh.position.set(
        restoredParentLocal.x,
        restoredParentLocal.y,
        restoredParentLocal.z
      );

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
   * Remove all L-shape objects from a cupboard and restore original heights
   */
  public static async removeLShapeObjects(cupboardMesh: THREE.Mesh): Promise<void> {
    if (!cupboardMesh) return;

    // First, find all drawers and doors that might have been reduced
    const drawersAndDoors: THREE.Mesh[] = [];
    cupboardMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const type = child.userData.type;
        if (type === PART_TYPES.DRAWER || type === PART_TYPES.DOOR) {
          if (child.userData.isMain || child.name?.includes('DRAWER') || child.name?.includes('DOOR')) {
            drawersAndDoors.push(child);
          }
        }
      }
    });

    // Restore original heights for all drawers and doors
    for (const drawerOrDoor of drawersAndDoors) {
      await this.restoreObjectHeight(drawerOrDoor, cupboardMesh);
    }

    // Now remove L-shape objects
    const toRemove: THREE.Object3D[] = [];

    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        if (!toRemove.includes(obj)) {
          toRemove.push(obj);
        }
      }
    });

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
