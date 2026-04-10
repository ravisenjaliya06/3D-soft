import * as THREE from 'three';
import { ThreeDView } from '../design/interface';
import { generateCompartmentsFromMesh, updateMinifixesForCupboard } from '../handler/items';
import { MoveHandler } from '../handler/moveHandler';
import { store } from '../store';
import { addObjects, updateObjects } from '../store/dataSlice';
import { updatePlatformHolesForSink } from '../utils/holeManager';
import { updateOrRefreshOutline } from '../utils/outlineHelpers';
import { DesignBuilder } from './designBuilder';
import {
  DRAWER_PLANK_TYPES,
  FLOOR_PLAN_TYPES,
  MATERIAL_TYPES,
  MeshObjectData,
  OBJECT_TYPES,
  PART_TYPES,
} from './interface';
import { MeshBuilder } from './meshBuilder';
import { convertKeysToCamel, create2DWallFromMeshData, mapAxis } from './utils';

export class SyncManager {
  private scene: THREE.Scene;
  private data: MeshObjectData | MeshObjectData[];
  private oldData: MeshObjectData | null = null;
  private meshBuilder: MeshBuilder | null = null;
  private isArray: boolean;
  private moveHandlerRef: MoveHandler | null = null;
  private sceneObjectMap: Map<string, THREE.Mesh> = new Map();
  private storeObjectMap: Map<string, MeshObjectData> = new Map();
  private isAutoSync: boolean = false;

  constructor(
    data: MeshObjectData | MeshObjectData[],
    threeDView?: ThreeDView,
    isAutoSync: boolean = false
  ) {
    const scene = threeDView?.scene || store.getState().scene?.scene;
    this.scene = scene;
    this.isAutoSync = isAutoSync;
    // Convert snake_case keys from database to camelCase
    const converted = convertKeysToCamel<MeshObjectData | MeshObjectData[]>(data);
    if (Array.isArray(converted) && converted.length === 1) {
      this.data = converted[0];
      this.isArray = false;
    } else {
      this.data = converted;
      this.isArray = Array.isArray(this.data);
    }
    if (!this.isArray) {
      this.meshBuilder = new MeshBuilder(this.data as MeshObjectData);
    }

    if (threeDView?.camera && threeDView?.renderer && this.scene) {
      this.moveHandlerRef = new MoveHandler({
        scene: this.scene,
        camera: threeDView.camera as THREE.PerspectiveCamera,
        renderer: threeDView.renderer,
        movableObjects: [],
      });
    }
  }

  private _normalizeData(data: MeshObjectData | MeshObjectData[]): MeshObjectData[] {
    return Array.isArray(data) ? data : [data];
  }

  public async syncData(): Promise<void> {
    if (!this.scene) return;

    // Initialize Maps for O(1) access
    this._initializeMaps();
    const list = this._normalizeData(this.data);

    this._syncState(list);
    this._sync2D(list);
    await this._sync3D(list);
  }

  /**
   * Processes an array of catalogs (which may be single items or grouped arrays like cupboards)
   * as a single batch to maximize rendering performance.
   */
  public async syncGroupedBatch(catalogs: MeshObjectData[]): Promise<void> {
    if (!this.scene) return;

    this._initializeMaps();

    // Flatten logic precisely for Redux & 2D maps
    // This allows us to dispatch to the store exactly once
    const flatList: MeshObjectData[] = [];
    const flatten = (items: MeshObjectData[]) => {
      items.forEach((item) => {
        if (Array.isArray(item)) {
          flatten(item);
        } else {
          flatList.push(convertKeysToCamel(item));
        }
      });
    };
    flatten(catalogs);

    // Dispatch Redux batch update
    this._syncState(flatList);
    this._sync2D(flatList);

    const originalData = this.data;
    const originalIsArray = this.isArray;
    const originalMeshBuilder = this.meshBuilder;

    // Process each catalog independent of Redux overhead
    for (const catalog of catalogs) {
      this.data = convertKeysToCamel(catalog);
      this.isArray = Array.isArray(this.data);

      if (!this.isArray) {
        this.meshBuilder = new MeshBuilder(this.data as MeshObjectData, this.scene);
        const existing = this.storeObjectMap.get((this.data as MeshObjectData).id);
        this.oldData = existing ? structuredClone(existing) : null;
      } else {
        this.meshBuilder = null;
        this.oldData = null;
      }

      const list = this._normalizeData(this.data);
      await this._sync3D(list);
    }

    this.data = originalData;
    this.isArray = originalIsArray;
    this.meshBuilder = originalMeshBuilder;
  }

  private _initializeMaps(): void {
    // 1. Scene Map
    this.sceneObjectMap.clear();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.objectId) {
        this.sceneObjectMap.set(obj.userData.objectId, obj);
      }
    });

    // 2. Store Map
    this.storeObjectMap.clear();
    const existingObjects = store.getState().data.objects;
    existingObjects.forEach((obj) => {
      if (obj.id) {
        this.storeObjectMap.set(obj.id, obj);
      }
    });
  }

  private _findMeshById(id: string): THREE.Mesh | null {
    return this.sceneObjectMap.get(id) || null;
  }

  private _findParentMesh(parentId: string): THREE.Mesh | null {
    return this.sceneObjectMap.get(parentId) || null;
  }

  private _isObjectType(type: string): boolean {
    return Object.values(OBJECT_TYPES).includes(type);
  }

  private _removeMeshFromScene(mesh: THREE.Mesh): void {
    if (mesh.userData?.objectId) {
      this.sceneObjectMap.delete(mesh.userData.objectId);
    }

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            mat.dispose();
          }
        });
      } else if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }

    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        this._removeMeshFromScene(child);
      }
    });

    if (mesh.parent) {
      mesh.parent.remove(mesh);
    } else {
      this.scene.remove(mesh);
    }
  }

  private _syncState(list: MeshObjectData[]): void {
    const toAdd: MeshObjectData[] = [];
    const toUpdate: MeshObjectData[] = [];

    list.forEach((item) => {
      const existing = this.storeObjectMap.get(item.id);

      if (existing) {
        if (list.length === 1) {
          this.oldData = structuredClone(existing);
        }
        toUpdate.push(item);
      } else {
        // For new objects, capture current minifix settings if it's a cupboard
        let itemToAdd = item;

        if (this._isObjectType(item.type) && item.isMain) {
          // Get current resolved minifix settings from Redux
          const state = store.getState();
          const minifixDistance =
            state.activeDesign.minifixDistance ?? state.designSettings.minifixDistance;
          const minifixDiameterHole =
            state.activeDesign.minifixDiameterHole ?? state.designSettings.minifixDiameterHole;
          const camDepth = state.activeDesign.camDepth ?? state.designSettings.camDepth;
          const camDiameter = state.activeDesign.camDiameter ?? state.designSettings.camDiameter;
          const camHeight = state.activeDesign.camHeight ?? state.designSettings.camHeight;

          // Store minifix settings in the cupboard object
          itemToAdd = {
            ...item,
            minifixDistance,
            minifixDiameterHole,
            camDepth,
            camDiameter,
            camHeight,
          };
        }

        const itemWithBanding = this._detectBandingFromScene(itemToAdd);

        // Default textureGrain to 'None' for all new plank/object entries
        const itemWithDefaults: MeshObjectData = {
          ...itemWithBanding,
          textureGrain: itemWithBanding.textureGrain ?? 'None',
        };

        toAdd.push(itemWithDefaults);

        // Update map so subsequent methods (like _sync2D) see it as existing
        this.storeObjectMap.set(item.id, itemWithDefaults);
      }
    });

    if (toAdd.length) {
      store.dispatch(addObjects(toAdd));
    }
    if (toUpdate.length) {
      // Use batch update instead of loop
      store.dispatch(updateObjects(toUpdate as (Partial<MeshObjectData> & { id: string })[]));
    }
  }

  /**
   * Detect edgeBanding state from the 3D scene meshes
   * This ensures banding data is stored when objects are initially added
   */
  private _detectBandingFromScene(meshData: MeshObjectData): MeshObjectData {
    if (meshData.edgeBanding) {
      return meshData;
    }

    const mesh = this._findMeshById(meshData.id);
    if (!mesh) {
      return meshData;
    }

    const detectedBanding: {
      top?: boolean;
      bottom?: boolean;
      left?: boolean;
      right?: boolean;
      front?: boolean;
      back?: boolean;
    } = mesh.userData.edgeBanding || {};

    // If we found any banding, add it to the meshData
    if (Object.keys(detectedBanding).length > 0) {
      return {
        ...meshData,
        edgeBanding: detectedBanding,
      };
    }

    return meshData;
  }

  private _sync2D(list: MeshObjectData[]): void {
    list.forEach((item) => {
      if (item.type !== FLOOR_PLAN_TYPES.WALL) return;

      const exists = this.storeObjectMap.has(item.id);
      if (!exists) create2DWallFromMeshData(item);
    });
  }

  /**
   * Compares two objects of the same shape using shallow equality.
   * T = Generic object type
   * We use T so this method can work with any object
   * (position, rotation, dimensions, etc.) instead of a fixed type.
   */
  private _isEqualObject<T extends object>(oldData?: T, newData?: T): boolean {
    if (!oldData || !newData) return false;

    return (Object.keys(oldData) as (keyof T)[]).every((key) => oldData[key] === newData[key]);
  }

  /**
   * Sets a value in the patch object in a type-safe way.
   * K = Key of MeshObjectData
   * Using K ensures:
   * - only valid keys of MeshObjectData are allowed
   * - value type always matches the given key
   */
  private _setPatchValue<K extends keyof MeshObjectData>(
    patch: Partial<MeshObjectData>,
    key: K,
    value: MeshObjectData[K]
  ): void {
    patch[key] = value;
  }

  // Gets the patch(changes key value pairs) for the mesh object
  private _getMeshObjectPatch(
    oldData: MeshObjectData,
    newData: MeshObjectData
  ): Partial<MeshObjectData> {
    const patch: Partial<MeshObjectData> = {};
    const keys = Object.keys(newData) as (keyof MeshObjectData)[];
    for (const key of keys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (Array.isArray(newValue)) {
        if (
          !Array.isArray(oldValue) ||
          oldValue.length !== newValue.length ||
          oldValue.some((value, index) => value !== newValue[index])
        ) {
          this._setPatchValue(patch, key, newValue);
        }
        continue;
      }

      if (
        typeof newValue === 'object' &&
        newValue !== null &&
        typeof oldValue === 'object' &&
        oldValue !== null
      ) {
        if (!this._isEqualObject(oldValue, newValue)) {
          this._setPatchValue(patch, key, newValue);
        }
        continue;
      }

      if (oldValue !== newValue) {
        this._setPatchValue(patch, key, newValue);
      }
    }

    return patch;
  }

  // Creates a new mesh
  private _createNewMesh(item?: MeshObjectData) {
    if (!this.meshBuilder) {
      if (item) {
        // If meshBuilder is not initialized (e.g. valid when processing an array),
        // initialize it temporarily for this item to create the mesh
        this.meshBuilder = new MeshBuilder(item, this.scene);
      } else {
        throw new Error('MeshBuilder is not initialized and no item provided.');
      }
    }
    const mesh = this.meshBuilder.createMesh();
    // Update map with new mesh
    if (mesh.userData?.objectId) {
      this.sceneObjectMap.set(mesh.userData.objectId, mesh);
    }
    return mesh;
  }

  // Updates the mesh
  private async _updateMesh(mesh: THREE.Mesh) {
    if (!this.oldData || !this.meshBuilder || this.isArray) return;

    const data = this.data as MeshObjectData;
    const changes = this._getMeshObjectPatch(this.oldData, data);
    await this.meshBuilder.updateMesh(mesh, changes, this.oldData.material);

    if (changes.dimensions && mesh.userData.isMain) {
      this._updateChildrenDimensions(mesh, changes.dimensions);
      this.meshBuilder.updateGrooving(mesh);
    }

    if (
      changes.dimensions &&
      (mesh.userData.type === PART_TYPES.BACK_PLANK || mesh.name.includes('BACK_PLANK'))
    ) {
      this.meshBuilder.updateGrooving(mesh);
    }

    // Update banding if dimensions changed or banding state changed
    if (changes.dimensions || changes.edgeBanding) {
      const name = mesh.name || '';

      // Check if this is a drawer plank by name (drawer planks should have banding)
      const isDrawerPlank = Object.values(DRAWER_PLANK_TYPES).some(
        (drawerPlankType) => name === drawerPlankType || name.includes(drawerPlankType)
      );

      if (!isDrawerPlank) {
        // Explicitly exclude drawer groups, doors, and handles
        if (
          mesh.userData.type === PART_TYPES.DRAWER ||
          mesh.userData.type === PART_TYPES.DOOR ||
          mesh.userData.type === PART_TYPES.HANDLE ||
          mesh.userData.type === PART_TYPES.L_SHAPE_OBJECT
        ) {
          return;
        }

        // Include all plank types (including any future plank types)
        const isPlank =
          mesh.userData.type === PART_TYPES.PLANK ||
          mesh.userData.type === PART_TYPES.VERTICAL_PLANK ||
          mesh.userData.type === PART_TYPES.HORIZONTAL_PLANK ||
          mesh.userData.type === PART_TYPES.BACK_PLANK ||
          Object.values(PART_TYPES).includes(mesh.userData.type);

        if (!isPlank) {
          return;
        }
      }

      // This is a plank (regular or drawer plank) - update banding
      if (changes.dimensions && data.dimensions) {
        // Only resize/reposition existing banding to new dimensions; do not reduce plank
        await this.meshBuilder.updateBanding(mesh, { isDimensionUpdate: true });
      } else if (changes.edgeBanding) {
        // Banding state changed - recreate banding
        await this.meshBuilder.applyBandingFromState();
      }
      updateMinifixesForCupboard(mesh);
    }

    if (mesh.userData.type === OBJECT_TYPES.SINK) {
      updatePlatformHolesForSink(this.scene, mesh);
    }
  }

  private _updateChildrenDimensions(
    mesh: THREE.Mesh,
    newDimensions: Partial<{ width: number; height: number; depth: number }>
  ): void {
    if (this.isArray || !this.oldData) return;

    const data = this.data as MeshObjectData;
    if (!data.dimensions) return;

    const oldWidth = this.oldData.dimensions?.width ?? 0;
    const oldHeight = this.oldData.dimensions?.height ?? 0;
    const oldDepth = this.oldData.dimensions?.depth ?? 0;

    const newWidth = newDimensions.width ?? data.dimensions.width ?? oldWidth;
    const newHeight = newDimensions.height ?? data.dimensions.height ?? oldHeight;
    const newDepth = newDimensions.depth ?? data.dimensions.depth ?? oldDepth;

    const MIN_DIM = 0.01;

    // Use MIN_DIM guard only when the old value is actually zero to prevent division by zero.
    // When old == new (axis unchanged), scale must be exactly 1.0 to avoid cumulative drift.
    const scaleX = newWidth / (oldWidth + MIN_DIM);
    const scaleY = newHeight / (oldHeight + MIN_DIM);
    const scaleZ = newDepth / (oldDepth + MIN_DIM);

    const updates: (Partial<MeshObjectData> & { id: string })[] = [];

    mesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.BoxGeometry)) return;

      const userDataStr = child.userData.type || '';
      const nameStr = (child.name || child.userData.name || '').toUpperCase();

      // 🔹 Handle Banding (unchanged)
      if (userDataStr === 'banding') {
        const edge = child.userData.edge;
        const bandingParams = child.geometry.parameters;
        const bandingThickness = Math.min(
          bandingParams.width,
          bandingParams.height,
          bandingParams.depth
        );

        let geo: THREE.BoxGeometry;
        let pos: THREE.Vector3;

        if (edge === 'top' || edge === 'bottom') {
          geo = new THREE.BoxGeometry(newWidth, bandingThickness, newDepth);
          pos = new THREE.Vector3(
            0,
            edge === 'top'
              ? newHeight / 2 - bandingThickness / 2
              : -newHeight / 2 + bandingThickness / 2,
            0
          );
        } else if (edge === 'left' || edge === 'right') {
          geo = new THREE.BoxGeometry(bandingThickness, newHeight, newDepth);
          pos = new THREE.Vector3(
            edge === 'left'
              ? -newWidth / 2 + bandingThickness / 2
              : newWidth / 2 - bandingThickness / 2,
            0,
            0
          );
        } else {
          geo = new THREE.BoxGeometry(newWidth, newHeight, bandingThickness);
          pos = new THREE.Vector3(
            0,
            0,
            edge === 'front'
              ? newDepth / 2 - bandingThickness / 2
              : -newDepth / 2 + bandingThickness / 2
          );
        }

        child.geometry.dispose();
        child.geometry = geo;
        child.position.copy(pos);
        return;
      }

      const params = child.geometry.parameters;

      // Always use current geometry parameters as the base.
      // child.userData.originalDimensions is set by banding tool to track pre-banding sizes
      // and represents a REDUCED size (after banding subtraction), NOT the real current geometry.
      // Using it here would cause stale values on axes that were already scaled in a previous
      // dimension change, leading to incorrect mapAxis results and "exploded" cupboard layouts.
      let baseWidth = params.width;
      let baseHeight = params.height;
      let baseDepth = params.depth;

      const isPlank =
        userDataStr === PART_TYPES.PLANK || userDataStr.toLowerCase().includes(PART_TYPES.PLANK);

      // Identify Plank Role for scaling locking
      const isVertical =
        isPlank &&
        (userDataStr === PART_TYPES.VERTICAL_PLANK ||
          nameStr.includes('LEFT') ||
          nameStr.includes('RIGHT') ||
          nameStr.includes('VERTICAL'));
      const isHorizontal =
        isPlank &&
        (userDataStr === PART_TYPES.HORIZONTAL_PLANK ||
          nameStr.includes('TOP') ||
          nameStr.includes('BOTTOM') ||
          nameStr.includes('HORIZONTAL') ||
          nameStr.includes('SKIRTING'));
      const isBack =
        isPlank &&
        (userDataStr === PART_TYPES.BACK_PLANK ||
          nameStr.includes('BACK') ||
          nameStr.includes('FRONT'));

      const isGeneric = !isVertical && !isHorizontal && !isBack;

      let nextWidth, nextHeight, nextDepth;
      let nextX, nextY, nextZ;

      if (isGeneric) {
        // fallback proportional scaling for undefined structures
        nextWidth = Math.max(baseWidth * scaleX, MIN_DIM);
        nextHeight = Math.max(baseHeight * scaleY, MIN_DIM);
        nextDepth = Math.max(baseDepth * scaleZ, MIN_DIM);
        nextX = child.position.x * scaleX;
        nextY = child.position.y * scaleY;
        nextZ = child.position.z * scaleZ;
      } else {
        // X-Axis mapping (Width)
        const resX = mapAxis(child.position.x, baseWidth, oldWidth, newWidth, isVertical);
        nextWidth = resX.nextSize;
        nextX = resX.nextCenter;

        // Y-Axis mapping (Height)
        const resY = mapAxis(child.position.y, baseHeight, oldHeight, newHeight, isHorizontal);
        nextHeight = resY.nextSize;
        nextY = resY.nextCenter;

        // Z-Axis mapping (Depth)
        const resZ = mapAxis(child.position.z, baseDepth, oldDepth, newDepth, isBack);
        nextDepth = resZ.nextSize;
        nextZ = resZ.nextCenter;
      }

      // Apply geometry
      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(nextWidth, nextHeight, nextDepth);

      child.position.set(nextX, nextY, nextZ);

      child.userData.dimensions = {
        width: nextWidth,
        height: nextHeight,
        depth: nextDepth,
      };

      // Keep originalDimensions in sync so banding tool uses correct base sizes
      if (child.userData.originalDimensions) {
        child.userData.originalDimensions = {
          width: nextWidth,
          height: nextHeight,
          depth: nextDepth,
        };
      }

      // 🔹 Update Banding Children on the Plank
      child.children.forEach((subChild) => {
        if (!(subChild instanceof THREE.Mesh) || !(subChild.geometry instanceof THREE.BoxGeometry))
          return;

        if (subChild.userData.type === 'banding') {
          const edge = subChild.userData.edge;
          const bandingParams = subChild.geometry.parameters;
          const bandingThickness = Math.min(
            bandingParams.width,
            bandingParams.height,
            bandingParams.depth
          );

          let geo: THREE.BoxGeometry;
          let pos: THREE.Vector3;

          if (edge === 'top' || edge === 'bottom') {
            geo = new THREE.BoxGeometry(nextWidth, bandingThickness, nextDepth);
            pos = new THREE.Vector3(
              0,
              edge === 'top'
                ? nextHeight / 2 - bandingThickness / 2
                : -nextHeight / 2 + bandingThickness / 2,
              0
            );
          } else if (edge === 'left' || edge === 'right') {
            geo = new THREE.BoxGeometry(bandingThickness, nextHeight, nextDepth);
            pos = new THREE.Vector3(
              edge === 'left'
                ? -nextWidth / 2 + bandingThickness / 2
                : nextWidth / 2 - bandingThickness / 2,
              0,
              0
            );
          } else {
            geo = new THREE.BoxGeometry(nextWidth, nextHeight, bandingThickness);
            pos = new THREE.Vector3(
              0,
              0,
              edge === 'front'
                ? nextDepth / 2 - bandingThickness / 2
                : -nextDepth / 2 + bandingThickness / 2
            );
          }

          subChild.geometry.dispose();
          subChild.geometry = geo;
          subChild.position.copy(pos);
        }
      });

      // Update Redux
      if (child.userData.objectId) {
        const childData = this.storeObjectMap.get(child.userData.objectId);
        if (childData) {
          updates.push({
            id: child.userData.objectId,
            dimensions: {
              width: nextWidth,
              height: nextHeight,
              depth: nextDepth,
            },
            position: {
              x: nextX,
              y: nextY,
              z: nextZ,
            },
          });
        }
      }
    });

    if (updates.length > 0) {
      store.dispatch(updateObjects(updates));
    }
  }

  private async _applyDrag(mesh: THREE.Object3D) {
    if (!this.moveHandlerRef) return;

    const pos = await this.moveHandlerRef.enableDragging(mesh);
    if (pos) mesh.position.set(pos.x, pos.y, pos.z);
  }

  private async _handleMultiple(list: MeshObjectData[], rootItem?: MeshObjectData) {
    // Clear existing meshes for all objects in this batch to prevent duplicates
    list.forEach((item) => {
      const existingMesh = this._findMeshById(item.id);
      if (existingMesh) {
        this._removeMeshFromScene(existingMesh);
      }
    });

    const builder = new DesignBuilder(list, this.scene);
    const root = await builder.createDesign();

    // Update map with new hierarchy
    root.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.objectId) {
        this.sceneObjectMap.set(child.userData.objectId, child);
      }
    });

    if (this._isObjectType(rootItem?.type ? rootItem.type : '')) {
      this.scene.add(root);
      if (!this.isAutoSync) await this._applyDrag(root);
    } else {
      this._attachToParentOrScene(root, rootItem?.parent);
    }

    // After banding is applied, detect and sync banding state to Redux
    this._syncBandingFromScene(list);
  }

  /**
   * Detect banding from scene meshes and sync to Redux store
   * This ensures banding data is stored when objects are initially added
   * Includes drawer planks but excludes drawer groups, doors, handles, and other non-plank types
   */
  private _syncBandingFromScene(list: MeshObjectData[]): void {
    const updates: (Partial<MeshObjectData> & { id: string })[] = [];

    list.forEach((meshData) => {
      const name = meshData.name || '';

      // Check if this is a drawer plank by name (drawer planks should have banding)
      const isDrawerPlank = Object.values(DRAWER_PLANK_TYPES).some(
        (drawerPlankType) => name === drawerPlankType || name.includes(drawerPlankType)
      );

      // If it's a drawer plank, continue to detect banding
      if (!isDrawerPlank) {
        // Explicitly exclude drawer groups, doors, and handles
        if (
          meshData.type === PART_TYPES.DRAWER ||
          meshData.type === PART_TYPES.DOOR ||
          meshData.type === PART_TYPES.HANDLE ||
          meshData.type === PART_TYPES.L_SHAPE_OBJECT
        ) {
          return;
        }

        // Include all plank types (including any future plank types)
        const isPlank =
          meshData.type === PART_TYPES.PLANK ||
          meshData.type === PART_TYPES.VERTICAL_PLANK ||
          meshData.type === PART_TYPES.HORIZONTAL_PLANK ||
          meshData.type === PART_TYPES.BACK_PLANK ||
          Object.values(PART_TYPES).includes(meshData.type);

        if (!isPlank) {
          return;
        }
      }

      const mesh = this._findMeshById(meshData.id);
      if (!mesh) return;

      // Detect banding meshes from children
      const detectedBanding: {
        top?: boolean;
        bottom?: boolean;
        left?: boolean;
        right?: boolean;
        front?: boolean;
        back?: boolean;
      } = mesh.userData.edgeBanding || {};

      // If we found banding and it's not already in Redux, update it
      if (Object.keys(detectedBanding).length > 0) {
        const existing = this.storeObjectMap.get(meshData.id);

        // Only update if banding state is different or missing
        if (existing) {
          const existingBanding = existing.edgeBanding || {};
          const hasChanges = Object.keys(detectedBanding).some(
            (edge) =>
              detectedBanding[edge as keyof typeof detectedBanding] !==
              existingBanding[edge as keyof typeof existingBanding]
          );

          if (hasChanges || Object.keys(existingBanding).length === 0) {
            updates.push({
              id: meshData.id,
              edgeBanding: detectedBanding,
            });
          }
        }
      }
    });

    if (updates.length > 0) {
      store.dispatch(updateObjects(updates));
    }
  }

  private async _handleSingle(item: MeshObjectData) {
    if (!item) return;
    const existingMesh = this._findMeshById(item.id);

    if (existingMesh) {
      await this._updateMesh(existingMesh);
      updateOrRefreshOutline(this.scene, existingMesh);
      if (existingMesh.userData.isMain) generateCompartmentsFromMesh(existingMesh);
      return;
    }

    const mesh = this._createNewMesh(item);

    if (this._isObjectType(item.type)) {
      this.scene.add(mesh);
      if (item.type === OBJECT_TYPES.SINK) {
        updatePlatformHolesForSink(this.scene, mesh);
      }
      if (!this.isAutoSync) await this._applyDrag(mesh);
      if (mesh.userData.isMain) generateCompartmentsFromMesh(mesh);
    } else {
      this._attachToParentOrScene(mesh, item.parent);
    }

    const name = item.name || '';

    // Check if this is a drawer plank by name (drawer planks should have banding)
    const isDrawerPlank = Object.values(DRAWER_PLANK_TYPES).some(
      (drawerPlankType) => name === drawerPlankType || name.includes(drawerPlankType)
    );

    if (!isDrawerPlank) {
      // Explicitly exclude drawer groups, doors, and handles
      if (
        item.type === PART_TYPES.DRAWER ||
        item.type === PART_TYPES.DOOR ||
        item.type === PART_TYPES.HANDLE ||
        item.type === PART_TYPES.L_SHAPE_OBJECT
      ) {
        return;
      }

      // Include all plank types (including any future plank types)
      const isPlank =
        item.type === PART_TYPES.PLANK ||
        item.type === PART_TYPES.VERTICAL_PLANK ||
        item.type === PART_TYPES.HORIZONTAL_PLANK ||
        item.type === PART_TYPES.BACK_PLANK ||
        Object.values(PART_TYPES).includes(item.type);

      if (!isPlank) {
        return;
      }
    }

    // Wait for the geometry and banding to be built
    if (this.meshBuilder?.geometryPromise) {
      await this.meshBuilder.geometryPromise;
    }

    // This is a plank (regular or drawer plank) - apply parent banding if needed
    if (item.parent && this.meshBuilder) {
      await this._applyParentBandingIfNeeded(item);
    }

    // Apply grooving if it is a Back Plank
    if (
      this.meshBuilder &&
      (item.type === PART_TYPES.BACK_PLANK ||
        (item.name && item.name.toUpperCase().includes('BACK_PLANK')))
    ) {
      this.meshBuilder.updateGrooving(mesh);
    }

    // Sync banding state to Redux for this single plank
    this._syncBandingFromScene([item]);
  }

  /**
   * Apply parent's banding material to a single plank if parent has banding
   */
  private async _applyParentBandingIfNeeded(item: MeshObjectData): Promise<void> {
    // If plank already has edgeBanding state, use it
    if (item.edgeBanding) {
      await this.meshBuilder?.applyBandingFromState();
      return;
    }

    // Check parent for banding material
    if (!item.parent) return;

    const parentData = this.storeObjectMap.get(item.parent);
    if (!parentData) return;

    // Find banding material in parent
    const materialArray = Array.isArray(parentData.material)
      ? parentData.material
      : parentData.material
        ? [parentData.material]
        : [];

    const parentBandingMaterial = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);

    if (parentBandingMaterial && this.meshBuilder) {
      // Find parent mesh to set it
      const parentMesh = this._findParentMesh(item.parent);
      if (parentMesh) {
        this.meshBuilder.setParentMesh(parentMesh);
      }

      // Apply parent banding material
      await this.meshBuilder.applyParentBandingMaterial(parentBandingMaterial);

      // Detect and sync banding state to Redux
      this._syncBandingFromScene([item]);
    }
  }

  private _attachToParentOrScene(mesh: THREE.Object3D, parentId?: string | null) {
    let targetParentId = parentId;
    if (!targetParentId) {
      const selectedChildObject = store.getState().data.selectedChildObject;
      if (selectedChildObject) {
        targetParentId = selectedChildObject;
      }
    }

    if (!targetParentId) {
      this.scene.add(mesh);
      return;
    }

    const targetMesh = this._findMeshById(targetParentId);
    if (!targetMesh) {
      this.scene.add(mesh);
      return;
    }

    const parent: THREE.Mesh = !targetMesh.parent?.userData?.isMain
      ? targetMesh
      : (targetMesh.parent as THREE.Mesh);

    parent.add(mesh);
    generateCompartmentsFromMesh(parent);
  }

  private async _sync3D(list: MeshObjectData[]): Promise<void> {
    if (!list || list.length === 0) return;

    const listIds = new Set(list.map((i) => i.id));
    const rootItem = list.find((i) => !i.parent || !listIds.has(i.parent));

    if (list.length > 1) {
      await this._handleMultiple(list, rootItem);
      return;
    }

    await this._handleSingle(list[0]);
  }
}
