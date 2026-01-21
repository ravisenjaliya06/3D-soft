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

const meshBuilder = (data: MeshObjectData | MeshObjectData[]) => {
  const builder = new SyncManager(data);
  return builder.syncData();
};

/**
 * LShapeObjectManager - Manages creation and removal of L-shape objects
 * Each method has a single responsibility following SOLID principles
 */
export class LShapeObjectManager {
  private static readonly DEFAULT_VERTICAL_HEIGHT = 100; // 100mm
  private static readonly DEFAULT_VERTICAL_DEPTH = 18; // 18mm
  private static readonly DEFAULT_VERTICAL_WIDTH = 18; // 18mm
  private static readonly DEFAULT_HORIZONTAL_HEIGHT = 20; // 20mm
  private static readonly DEFAULT_HORIZONTAL_DEPTH = 50; // 50mm

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

    // Store association with drawer/door in userData (will be set after mesh creation)
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

    // Store association with drawer/door in userData (will be set after mesh creation)
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
      // If drawer face not found, use the drawer mesh itself as fallback
      return targetMesh || drawerOrDoor;
    } else {
      return drawerOrDoor;
    }
  }

  /**
   * Calculate plank positions for drawer/door (bottom position)
   * Uses closed position to ensure correct placement regardless of open/close state
   */
  private static calculatePlankPositionsForDrawerDoor(
    targetMesh: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    verticalHeight: number,
    verticalDepth: number,
    horizontalHeight: number,
    horizontalDepth: number
  ): { vertical: THREE.Vector3; horizontal: THREE.Vector3 } {
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    if (!bbox) {
      throw new Error('Could not compute bounding box for target mesh');
    }

    cupboardMesh.geometry.computeBoundingBox();
    const cupboardBbox = cupboardMesh.geometry.boundingBox;
    if (!cupboardBbox) {
      throw new Error('Could not compute bounding box for cupboard');
    }

    // Get the closed position for drawers (stored in userData.closedZ)
    // For doors, we need to handle pivot group rotation
    let closedPosition = targetMesh.position.clone();
    let pivotGroup: THREE.Object3D | null = null;
    
    // For drawers, use the closed Z position if available
    if (targetMesh.userData.closedZ !== undefined) {
      closedPosition.z = targetMesh.userData.closedZ;
    }
    
    // For doors, check if there's a pivot group parent
    if (targetMesh.userData.type === PART_TYPES.DOOR && targetMesh.parent?.userData.isPivotGroup) {
      pivotGroup = targetMesh.parent;
    }
    
    // Store original position/rotation to restore later
    const originalPosition = targetMesh.position.clone();
    const originalRotation = targetMesh.rotation.clone();
    const originalQuaternion = targetMesh.quaternion.clone();
    const originalPivotRotation = pivotGroup ? pivotGroup.rotation.clone() : null;
    const originalPivotQuaternion = pivotGroup ? pivotGroup.quaternion.clone() : null;
    
    // Temporarily set to closed state for position calculation
    targetMesh.position.copy(closedPosition);
    
    // For doors with pivot group, reset pivot group rotation to closed state (0 rotation)
    if (pivotGroup) {
      pivotGroup.rotation.set(0, 0, 0);
      pivotGroup.quaternion.set(0, 0, 0, 1);
    } else if (targetMesh.userData.type === PART_TYPES.DOOR) {
      // Door without pivot group, reset door rotation
      targetMesh.rotation.set(0, 0, 0);
      targetMesh.quaternion.set(0, 0, 0, 1);
    }
    
    // Update matrices with closed state
    if (pivotGroup) {
      pivotGroup.updateMatrixWorld(true);
    }
    targetMesh.updateMatrixWorld(true);
    cupboardMesh.updateMatrixWorld(true);
    
    // Calculate position in local space of target mesh (closed state)
    const drawerDoorBottomLocal = new THREE.Vector3(
      bbox.getCenter(new THREE.Vector3()).x,
      bbox.min.y,
      bbox.min.z
    );
    
    // Convert to world space (using closed state)
    const drawerDoorBottomWorld = targetMesh.localToWorld(drawerDoorBottomLocal.clone());
    
    // Convert to cupboard local space
    const drawerDoorBottomCupboardLocal = cupboardMesh.worldToLocal(
      drawerDoorBottomWorld.clone()
    );

    // Restore original position/rotation
    targetMesh.position.copy(originalPosition);
    targetMesh.rotation.copy(originalRotation);
    targetMesh.quaternion.copy(originalQuaternion);
    if (pivotGroup && originalPivotRotation && originalPivotQuaternion) {
      pivotGroup.rotation.copy(originalPivotRotation);
      pivotGroup.quaternion.copy(originalPivotQuaternion);
      pivotGroup.updateMatrixWorld(true);
    }
    targetMesh.updateMatrixWorld(true);

    const cupboardFrontZ = cupboardBbox.max.z;
    const horizontalPlankBackFaceZ = cupboardFrontZ - horizontalDepth;

    const horizontalPlankPos = new THREE.Vector3(
      drawerDoorBottomCupboardLocal.x,
      drawerDoorBottomCupboardLocal.y + horizontalHeight / 2,
      cupboardFrontZ - horizontalDepth / 2
    );

    const verticalPlankPos = new THREE.Vector3(
      drawerDoorBottomCupboardLocal.x,
      drawerDoorBottomCupboardLocal.y + verticalHeight / 2,
      horizontalPlankBackFaceZ - verticalDepth / 2
    );

    return { vertical: verticalPlankPos, horizontal: horizontalPlankPos };
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

    // Update world matrices for accurate position calculation
    cupboardMesh.updateMatrixWorld(true);
    drawersAndDoors.forEach((obj) => {
      obj.updateMatrixWorld(true);
    });

    // Group objects by type (doors and drawers separately)
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
      // Group objects by horizontal alignment (same X and Z position)
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
        const alignmentThreshold = Math.max(size1.x, size1.z) * 0.15; // 15% tolerance

        // Find all objects aligned horizontally with obj1
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

      // For each aligned group, sort by Y position (top to bottom) and create consecutive pairs
      alignedGroups.forEach((group) => {
        // Sort by Y position (top to bottom - higher Y first)
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

          return cupboardLocalB.y - cupboardLocalA.y; // Higher Y first (top to bottom)
        });

        // Check if consecutive objects are vertically adjacent
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

          // Check if objects are vertically adjacent
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

          const gapThreshold = 50; // Maximum gap in mm to consider them attached
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
    verticalPlankStartY: number; // Top edge of vertical plank (half into top object)
    verticalPlankEndY: number; // Bottom edge of vertical plank (half into bottom object)
    verticalPlankHeight: number; // Calculated height
  } {
    const targetMeshTop = this.findTargetMesh(topObj);
    const targetMeshBottom = this.findTargetMesh(bottomObj);
    
    if (!targetMeshTop || !targetMeshBottom) {
      throw new Error('Could not find target mesh for objects');
    }

    // Update matrices
    cupboardMesh.updateMatrixWorld(true);
    targetMeshTop.updateMatrixWorld(true);
    targetMeshBottom.updateMatrixWorld(true);

    // Get bounding boxes
    targetMeshTop.geometry.computeBoundingBox();
    targetMeshBottom.geometry.computeBoundingBox();
    const bboxTop = targetMeshTop.geometry.boundingBox;
    const bboxBottom = targetMeshBottom.geometry.boundingBox;

    if (!bboxTop || !bboxBottom) {
      throw new Error('Could not compute bounding boxes');
    }

    // Get sizes
    const sizeTop = new THREE.Vector3();
    const sizeBottom = new THREE.Vector3();
    bboxTop.getSize(sizeTop);
    bboxBottom.getSize(sizeBottom);

    // Get center points for positioning
    const topCenterLocal = new THREE.Vector3(
      bboxTop.getCenter(new THREE.Vector3()).x,
      bboxTop.getCenter(new THREE.Vector3()).y,
      bboxTop.min.z // Use front Z (min.z) for positioning behind
    );

    const bottomCenterLocal = new THREE.Vector3(
      bboxBottom.getCenter(new THREE.Vector3()).x,
      bboxBottom.getCenter(new THREE.Vector3()).y,
      bboxBottom.min.z // Use front Z (min.z) for positioning behind
    );

    // Get bottom edge of top object and top edge of bottom object
    const topBottomLocal = new THREE.Vector3(
      bboxTop.getCenter(new THREE.Vector3()).x,
      bboxTop.min.y, // Bottom edge of top object
      bboxTop.min.z
    );

    const bottomTopLocal = new THREE.Vector3(
      bboxBottom.getCenter(new THREE.Vector3()).x,
      bboxBottom.max.y, // Top edge of bottom object
      bboxBottom.min.z
    );

    // Convert to world space
    const topCenterWorld = targetMeshTop.localToWorld(topCenterLocal.clone());
    const bottomCenterWorld = targetMeshBottom.localToWorld(bottomCenterLocal.clone());
    const topBottomWorld = targetMeshTop.localToWorld(topBottomLocal.clone());
    const bottomTopWorld = targetMeshBottom.localToWorld(bottomTopLocal.clone());

    // Convert to cupboard local space
    const topCenterCupboardLocal = cupboardMesh.worldToLocal(topCenterWorld.clone());
    const bottomCenterCupboardLocal = cupboardMesh.worldToLocal(bottomCenterWorld.clone());
    const topBottomCupboardLocal = cupboardMesh.worldToLocal(topBottomWorld.clone());
    const bottomTopCupboardLocal = cupboardMesh.worldToLocal(bottomTopWorld.clone());

    // Calculate center Y position (midpoint between bottom of top and top of bottom)
    const centerY = (topBottomCupboardLocal.y + bottomTopCupboardLocal.y) / 2;
    const centerX = (topCenterCupboardLocal.x + bottomCenterCupboardLocal.x) / 2;
    const centerZ = Math.min(topCenterCupboardLocal.z, bottomCenterCupboardLocal.z); // Use the frontmost Z

    // Calculate half heights
    const topHalfHeight = sizeTop.y / 2;
    const bottomHalfHeight = sizeBottom.y / 2;

    // Calculate vertical plank position: half into top object, half into bottom object
    // Start Y: halfway into top object (from bottom of top object, go up by half of top object height)
    const verticalPlankStartY = topBottomCupboardLocal.y + topHalfHeight;
    // End Y: halfway into bottom object (from top of bottom object, go down by half of bottom object height)
    const verticalPlankEndY = bottomTopCupboardLocal.y - bottomHalfHeight;
    // Height is the difference
    const verticalPlankHeight = verticalPlankStartY - verticalPlankEndY;

    // Use the width of both objects (should be similar, take average)
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
   * Add L-shape object at the center between two vertically attached objects
   * Vertical plank spans half into top object and half into bottom object, positioned behind for visualization
   */
  private static async addLShapeAtCenter(
    topObj: THREE.Mesh,
    bottomObj: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    material: Material[]
  ): Promise<void> {
    try {
      const { 
        centerY, 
        centerX, 
        centerZ, 
        width,
        verticalPlankStartY,
        verticalPlankEndY,
        verticalPlankHeight
      } = this.calculateCenterPositionBetweenObjects(
        topObj,
        bottomObj,
        cupboardMesh
      );

      const dimensions = this.getDefaultDimensions();
      const verticalWidth = width;
      const horizontalWidth = width;

      // Get cupboard bounding box for Z positioning
      cupboardMesh.geometry.computeBoundingBox();
      const cupboardBbox = cupboardMesh.geometry.boundingBox;
      if (!cupboardBbox) {
        throw new Error('Could not compute cupboard bounding box');
      }

      // Position behind the objects (use the front Z of objects, then go back)
      const objectsFrontZ = centerZ;
      const horizontalPlankBackFaceZ = objectsFrontZ - dimensions.horizontal.depth;

      // Offset to move l-shape down
      const yOffset = -50; // Move down by 50mm

      // Position horizontal plank at center Y (moved down), behind objects
      const horizontalPlankPos = new THREE.Vector3(
        centerX,
        centerY + dimensions.horizontal.height / 2 + yOffset,
        objectsFrontZ - dimensions.horizontal.depth / 2
      );

      // Position vertical plank at center Y (moved down, between the two objects)
      // Use original default dimensions - don't modify l-shape object dimensions
      const verticalPlankPos = new THREE.Vector3(
        centerX,
        centerY + dimensions.vertical.height / 2 + yOffset,
        horizontalPlankBackFaceZ - dimensions.vertical.depth / 2
      );

      // Create plank data with original default dimensions (no modifications to l-shape object)
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
          width: verticalWidth, // Only adjust width to match object width
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

    // Remove any existing L-shapes first to avoid duplicates
    this.removeLShapeObjects(cupboardMesh);

    const drawersAndDoors = this.findDrawersAndDoors(cupboardMesh);
    const material = this.getDefaultMaterial();

    // Find pairs of vertically attached objects
    const pairs = this.findVerticallyAttachedPairs(drawersAndDoors, cupboardMesh);

    // Add L-shape at center of each pair
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

    // Find L-shape objects that belong to this drawer/door
    // First try to find by stored association (most reliable)
    cupboardMesh.children.forEach((child) => {
      if (
        (child.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          child.name?.includes('L_SHAPE')) &&
        child instanceof THREE.Mesh
      ) {
        // Check if this L-shape is associated with the drawer/door
        if (child.userData.drawerOrDoorId === drawerOrDoorId) {
          toRemove.push(child);
        }
      }
    });

    // Also search recursively in case L-shapes are nested
    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        if (obj.userData.drawerOrDoorId === drawerOrDoorId) {
          // Avoid duplicates
          if (!toRemove.includes(obj)) {
            toRemove.push(obj);
          }
        }
      }
    });

    // If no L-shapes found by association, use proximity detection as fallback
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

            // Check if L-shape is near the drawer/door (within reasonable distance)
            const distance = targetPos.distanceTo(lShapePos);
            if (distance < 200) {
              // Check if it's aligned with this drawer/door (same X position approximately)
              if (Math.abs(targetPos.x - lShapePos.x) < 50) {
                // Avoid duplicates
                if (!toRemove.includes(obj)) {
                  toRemove.push(obj);
                }
              }
            }
          }
        });
      }
    }

    // Remove all found L-shapes
    toRemove.forEach((child) => {
      const objectId = child.userData.objectId;
      if (objectId) {
        store.dispatch(removeObject(objectId));
      }
      if (child.parent) {
        child.parent.remove(child);
      }
    });

    // Note: Not restoring drawer planks since we don't modify them when adding l-shapes
  }

  /**
   * Remove all L-shape objects from a cupboard
   */
  public static removeLShapeObjects(cupboardMesh: THREE.Mesh): void {
    if (!cupboardMesh) return;

    // Find all drawers before removing L-shape objects
    const drawers: THREE.Mesh[] = [];
    cupboardMesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.userData.type === PART_TYPES.DRAWER &&
        child.userData.isMain
      ) {
        drawers.push(child);
      }
    });

    const toRemove: THREE.Object3D[] = [];

    // Search recursively for all L-shape objects
    cupboardMesh.traverse((obj) => {
      if (
        obj !== cupboardMesh &&
        (obj.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          obj.name?.includes('L_SHAPE')) &&
        obj instanceof THREE.Mesh
      ) {
        // Avoid duplicates
        if (!toRemove.includes(obj)) {
          toRemove.push(obj);
        }
      }
    });

    // Remove all found L-shapes
    toRemove.forEach((child) => {
      const objectId = child.userData.objectId;
      if (objectId) {
        store.dispatch(removeObject(objectId));
      }
      if (child.parent) {
        child.parent.remove(child);
      }
    });

    // Note: Not restoring drawer planks since we don't modify them when adding l-shapes
  }
}
