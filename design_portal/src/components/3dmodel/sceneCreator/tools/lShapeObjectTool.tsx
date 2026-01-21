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
    drawerOrDoorId?: string,
    lShapePosition?: 'top' | 'bottom'
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
        lShapePosition,
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
    drawerOrDoorId?: string,
    lShapePosition?: 'top' | 'bottom'
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
        lShapePosition,
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
      return targetMesh;
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
   * Calculate plank positions for drawer/door (top position)
   * Uses closed position to ensure correct placement regardless of open/close state
   */
  private static calculatePlankPositionsForDrawerDoorTop(
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
    const drawerDoorTopLocal = new THREE.Vector3(
      bbox.getCenter(new THREE.Vector3()).x,
      bbox.max.y, // Top edge instead of bottom
      bbox.min.z
    );
    
    // Convert to world space (using closed state)
    const drawerDoorTopWorld = targetMesh.localToWorld(drawerDoorTopLocal.clone());
    
    // Convert to cupboard local space
    const drawerDoorTopCupboardLocal = cupboardMesh.worldToLocal(
      drawerDoorTopWorld.clone()
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

    // Horizontal plank at top - positioned above the drawer/door top edge
    const horizontalPlankPos = new THREE.Vector3(
      drawerDoorTopCupboardLocal.x,
      drawerDoorTopCupboardLocal.y + horizontalHeight / 2, // Positioned above the top edge
      cupboardFrontZ - horizontalDepth / 2
    );

    // Vertical plank positioned at the back of horizontal plank
    // The vertical plank extends downward from the horizontal plank
    const verticalPlankPos = new THREE.Vector3(
      drawerDoorTopCupboardLocal.x,
      drawerDoorTopCupboardLocal.y - verticalHeight / 2 + horizontalHeight, // Extends downward from horizontal plank
      horizontalPlankBackFaceZ - verticalDepth / 2
    );

    return { vertical: verticalPlankPos, horizontal: horizontalPlankPos };
  }

  /**
   * Adjust drawer planks to accommodate L-shape vertical plank
   * Reduces depth of all drawer planks by the L-shape vertical plank depth
   * When L-shape is on top, also adjusts Y position downward
   */
  private static adjustDrawerPlanksForLShape(
    drawerMesh: THREE.Mesh,
    position: 'top' | 'bottom' = 'bottom'
  ): void {
    if (drawerMesh.userData.type !== PART_TYPES.DRAWER || !drawerMesh.userData.isMain) {
      return;
    }

    const dimensions = this.getDefaultDimensions();
    const lShapeDepth = dimensions.vertical.depth; // 18mm
    const lShapeHeight = dimensions.vertical.height; // Height of vertical plank
    const currentObjects = store.getState().data.objects;

    // List of drawer plank names that need adjustment
    // Include both naming conventions and all drawer planks (except DRAWER_FACE which is handled separately)
    const plankNames = [
      DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK,
      DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK,
      DRAWER_PLANK_TYPES.BACK_DRAWER_PLANK,
      DRAWER_PLANK_TYPES.FRONT_DRAWER_PLANK,
      DRAWER_PLANK_TYPES.BOTTOM_DRAWER_PLANK,
      'DRAWER_LEFT_PLANK', // Alternative naming used in drawer creation
      'DRAWER_RIGHT_PLANK',
      'DRAWER_BACK_PLANK',
      'DRAWER_FRONT_PLANK',
      'DRAWER_BOTTOM_PLANK',
      // Also check by type to catch any variations
    ];

    let adjustedCount = 0;

    drawerMesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      
      // Skip DRAWER_FACE as it's handled separately
      if (child.name === DRAWER_PLANK_TYPES.DRAWER_FACE || child.name === 'DRAWER_FACE') {
        return;
      }
      
      // Check if it's a drawer plank by name or type
      const isDrawerPlank = 
        plankNames.includes(child.name) ||
        child.name?.includes('DRAWER') && child.name?.includes('PLANK') ||
        Object.values(DRAWER_PLANK_TYPES).includes(child.userData.type);
      
      if (!isDrawerPlank) return;
      if (!(child.geometry instanceof THREE.BoxGeometry)) return;

      const geo = child.geometry as THREE.BoxGeometry;
      const currentDepth = geo.parameters.depth;
      const currentWidth = geo.parameters.width;
      const currentHeight = geo.parameters.height;

      // Store original depth and position if not already stored
      if (!child.userData.originalDepth) {
        child.userData.originalDepth = currentDepth;
        child.userData.originalZ = child.position.z;
        child.userData.originalY = child.position.y;
      }

      // Reduce depth by L-shape vertical plank depth
      const depthReduction = Math.min(lShapeDepth, currentDepth - 1); // Don't reduce below 1mm
      const newDepth = Math.max(1, currentDepth - depthReduction);

      // Adjust Z position to move plank backward (toward negative Z) by half the reduction
      // This keeps the front edge aligned while reducing depth
      const zAdjustment = depthReduction / 2;
      const newZ = child.userData.originalZ - zAdjustment;

      // Adjust Y position when L-shape is on top
      // Move planks down by the L-shape vertical height to accommodate it
      let newY = child.userData.originalY;
      if (position === 'top') {
        // Move planks down by the vertical plank height
        newY = child.userData.originalY - lShapeHeight;
      }

      // Update geometry
      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(currentWidth, currentHeight, newDepth);

      // Update position
      child.position.z = newZ;
      child.position.y = newY;

      // Update Redux store
      const plankData = currentObjects.find((obj) => obj.id === child.userData.objectId);
      if (plankData) {
        store.dispatch(
          updateObject({
            ...plankData,
            dimensions: {
              ...plankData.dimensions,
              depth: newDepth,
            },
            position: {
              ...plankData.position,
              z: newZ,
              y: newY,
            },
          })
        );
        adjustedCount++;
      } else {
        console.warn(`[LShape] Could not find Redux data for plank ${child.name} with id ${child.userData.objectId}`);
      }
    });

    console.log(`[LShape] Adjusted ${adjustedCount} drawer planks for drawer ${drawerMesh.name} (position: ${position})`);
  }

  /**
   * Restore drawer planks to original dimensions when L-shape is removed
   */
  private static restoreDrawerPlanks(drawerMesh: THREE.Mesh): void {
    if (drawerMesh.userData.type !== PART_TYPES.DRAWER || !drawerMesh.userData.isMain) {
      return;
    }

    const currentObjects = store.getState().data.objects;
    let restoredCount = 0;

    drawerMesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!(child.geometry instanceof THREE.BoxGeometry)) return;
      if (!child.userData.originalDepth) return;

      const geo = child.geometry as THREE.BoxGeometry;
      const currentWidth = geo.parameters.width;
      const currentHeight = geo.parameters.height;
      const originalDepth = child.userData.originalDepth;
      const originalZ = child.userData.originalZ ?? child.position.z;
      const originalY = child.userData.originalY ?? child.position.y;

      // Restore original depth and position
      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(currentWidth, currentHeight, originalDepth);
      child.position.z = originalZ;
      child.position.y = originalY;

      // Update Redux store
      const plankData = currentObjects.find((obj) => obj.id === child.userData.objectId);
      if (plankData) {
        store.dispatch(
          updateObject({
            ...plankData,
            dimensions: {
              ...plankData.dimensions,
              depth: originalDepth,
            },
            position: {
              ...plankData.position,
              z: originalZ,
              y: originalY,
            },
          })
        );
        restoredCount++;
      }

      // Clear stored original values
      delete child.userData.originalDepth;
      delete child.userData.originalZ;
      delete child.userData.originalY;
    });

    console.log(`[LShape] Restored ${restoredCount} drawer planks for drawer ${drawerMesh.name}`);
  }

  /**
   * Add L-shape to a single drawer or door
   */
  private static async addLShapeToDrawerOrDoor(
    drawerOrDoor: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    material: Material[]
  ): Promise<void> {
    const targetMesh = this.findTargetMesh(drawerOrDoor);
    if (!targetMesh) return;

    const targetSize = new THREE.Vector3();
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    if (!bbox) return;
    bbox.getSize(targetSize);

    const dimensions = this.getDefaultDimensions();
    const verticalWidth = targetSize.x;
    const horizontalWidth = targetSize.x;

    const positions = this.calculatePlankPositionsForDrawerDoor(
      targetMesh,
      cupboardMesh,
      dimensions.vertical.height,
      dimensions.vertical.depth,
      dimensions.horizontal.height,
      dimensions.horizontal.depth
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
      positions.vertical,
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
      positions.horizontal,
      cupboardMesh.userData.objectId,
      material
    );

    await meshBuilder(verticalPlank);
    await meshBuilder(horizontalPlank);

    // Adjust drawer planks if this is a drawer (works for both top and bottom positions)
    // Use requestAnimationFrame to ensure drawer is fully rendered before adjusting
    if (drawerOrDoor.userData.type === PART_TYPES.DRAWER) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.adjustDrawerPlanksForLShape(drawerOrDoor, 'bottom');
        });
      });
    }
  }

  /**
   * Add L-shape to a specific drawer or door at specified position (top or bottom)
   */
  public static async addLShapeToDrawerOrDoorAtPosition(
    drawerOrDoor: THREE.Mesh,
    cupboardMesh: THREE.Mesh,
    position: 'top' | 'bottom'
  ): Promise<void> {
    const targetMesh = this.findTargetMesh(drawerOrDoor);
    if (!targetMesh) return;

    // Remove existing L-shape for this drawer/door first
    this.removeLShapeForDrawerOrDoor(drawerOrDoor, cupboardMesh);

    const targetSize = new THREE.Vector3();
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    if (!bbox) return;
    bbox.getSize(targetSize);

    const dimensions = this.getDefaultDimensions();
    const verticalWidth = targetSize.x;
    const horizontalWidth = targetSize.x;
    const material = this.getDefaultMaterial();

    const positions =
      position === 'top'
        ? this.calculatePlankPositionsForDrawerDoorTop(
            targetMesh,
            cupboardMesh,
            dimensions.vertical.height,
            dimensions.vertical.depth,
            dimensions.horizontal.height,
            dimensions.horizontal.depth
          )
        : this.calculatePlankPositionsForDrawerDoor(
            targetMesh,
            cupboardMesh,
            dimensions.vertical.height,
            dimensions.vertical.depth,
            dimensions.horizontal.height,
            dimensions.horizontal.depth
          );

    const drawerOrDoorId = drawerOrDoor.userData.objectId;

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
      positions.vertical,
      cupboardMesh.userData.objectId,
      material,
      drawerOrDoorId,
      position
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
      positions.horizontal,
      cupboardMesh.userData.objectId,
      material,
      drawerOrDoorId,
      position
    );

    // Store IDs before building so we can find the meshes after creation
    const verticalPlankId = verticalPlank.id;
    const horizontalPlankId = horizontalPlank.id;

    await meshBuilder(verticalPlank);
    await meshBuilder(horizontalPlank);

    // Set userData on created meshes to store association with drawer/door
    // Use requestAnimationFrame to ensure meshes are fully created and added to scene
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Search in cupboardMesh children first (most common case)
        let foundVertical = false;
        let foundHorizontal = false;

        cupboardMesh.children.forEach((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.userData.objectId === verticalPlankId &&
            !foundVertical
          ) {
            child.userData.drawerOrDoorId = drawerOrDoorId;
            child.userData.lShapePosition = position;
            foundVertical = true;
            console.log(
              `[LShape] Set userData for vertical ${child.name}: drawerOrDoorId=${drawerOrDoorId}, position=${position}`
            );
          }
          if (
            child instanceof THREE.Mesh &&
            child.userData.objectId === horizontalPlankId &&
            !foundHorizontal
          ) {
            child.userData.drawerOrDoorId = drawerOrDoorId;
            child.userData.lShapePosition = position;
            foundHorizontal = true;
            console.log(
              `[LShape] Set userData for horizontal ${child.name}: drawerOrDoorId=${drawerOrDoorId}, position=${position}`
            );
          }
        });

        // If not found in children, search the entire scene (fallback)
        if (!foundVertical || !foundHorizontal) {
          const scene = cupboardMesh.parent as THREE.Scene;
          if (scene && scene instanceof THREE.Scene) {
            scene.traverse((obj) => {
              if (
                obj instanceof THREE.Mesh &&
                obj.userData.objectId === verticalPlankId &&
                !foundVertical
              ) {
                obj.userData.drawerOrDoorId = drawerOrDoorId;
                obj.userData.lShapePosition = position;
                foundVertical = true;
                console.log(
                  `[LShape] Set userData for vertical ${obj.name} (scene search): drawerOrDoorId=${drawerOrDoorId}, position=${position}`
                );
              }
              if (
                obj instanceof THREE.Mesh &&
                obj.userData.objectId === horizontalPlankId &&
                !foundHorizontal
              ) {
                obj.userData.drawerOrDoorId = drawerOrDoorId;
                obj.userData.lShapePosition = position;
                foundHorizontal = true;
                console.log(
                  `[LShape] Set userData for horizontal ${obj.name} (scene search): drawerOrDoorId=${drawerOrDoorId}, position=${position}`
                );
              }
            });
          }
        }

        // Adjust drawer planks if this is a drawer (works for both top and bottom positions)
        // The planks are reduced in depth to accommodate the L-shape vertical plank
        // When top, also adjust Y position downward
        if (drawerOrDoor.userData.type === PART_TYPES.DRAWER) {
          this.adjustDrawerPlanksForLShape(drawerOrDoor, position);
        }
      });
    });
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

    // Remove any existing L-shapes first to avoid duplicates
    this.removeLShapeObjects(cupboardMesh);

    const drawersAndDoors = this.findDrawersAndDoors(cupboardMesh);
    const material = this.getDefaultMaterial();

    for (const drawerOrDoor of drawersAndDoors) {
      await this.addLShapeToDrawerOrDoor(drawerOrDoor, cupboardMesh, material);
    }

    generateCompartmentsFromMesh(cupboardMesh);
    hideFullScreenLoader();
  }

  /**
   * Get current L-shape position for a drawer or door
   */
  public static getLShapePositionForDrawerOrDoor(
    drawerOrDoor: THREE.Mesh,
    cupboardMesh: THREE.Mesh
  ): 'top' | 'bottom' | 'remove' {
    if (!drawerOrDoor || !cupboardMesh) return 'remove';

    const drawerOrDoorId = drawerOrDoor.userData.objectId;
    if (!drawerOrDoorId) return 'remove';

    // Find L-shape objects that belong to this drawer/door
    for (const child of cupboardMesh.children) {
      if (
        (child.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
          child.name?.includes('L_SHAPE')) &&
        child instanceof THREE.Mesh
      ) {
        // Check if this L-shape is associated with the drawer/door
        if (child.userData.drawerOrDoorId === drawerOrDoorId) {
          return child.userData.lShapePosition || 'bottom';
        }
      }
    }

    // Fallback: check by proximity if userData is not set (for existing L-shapes)
    const targetMesh = this.findTargetMesh(drawerOrDoor);
    if (targetMesh) {
      targetMesh.updateMatrixWorld(true);
      const targetPos = new THREE.Vector3();
      targetMesh.getWorldPosition(targetPos);

      for (const child of cupboardMesh.children) {
        if (
          (child.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
            child.name?.includes('L_SHAPE')) &&
          child instanceof THREE.Mesh
        ) {
          child.updateMatrixWorld(true);
          const lShapePos = new THREE.Vector3();
          child.getWorldPosition(lShapePos);

          // Check if L-shape is near the drawer/door (within reasonable distance)
          const distance = targetPos.distanceTo(lShapePos);
          if (distance < 200 && Math.abs(targetPos.x - lShapePos.x) < 50) {
            // Determine position based on Y coordinate
            // If L-shape is above the drawer/door center, it's top, otherwise bottom
            const targetCenterY = targetMesh.geometry.boundingBox
              ? targetMesh.geometry.boundingBox.getCenter(new THREE.Vector3()).y
              : 0;
            const targetCenterWorld = targetMesh.localToWorld(new THREE.Vector3(0, targetCenterY, 0));
            const lShapeWorldY = lShapePos.y;

            // Store the association for future use
            child.userData.drawerOrDoorId = drawerOrDoorId;
            child.userData.lShapePosition = lShapeWorldY > targetCenterWorld.y ? 'top' : 'bottom';

            return child.userData.lShapePosition;
          }
        }
      }
    }

    return 'remove';
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

    // Restore drawer planks if this is a drawer
    if (drawerOrDoor.userData.type === PART_TYPES.DRAWER) {
      this.restoreDrawerPlanks(drawerOrDoor);
    }
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

    // Restore drawer planks after removing L-shape objects
    drawers.forEach((drawer) => {
      this.restoreDrawerPlanks(drawer);
    });
  }
}
