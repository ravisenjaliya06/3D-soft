import * as THREE from 'three';
import { ThreeDView } from '../design/interface';
import { generateCompartmentsFromMesh } from '../handler/items';
import { MoveHandler } from '../handler/moveHandler';
import { store } from '../store';
import { addObjects, updateObject } from '../store/dataSlice';
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
import { convertKeysToCamel, create2DWallFromMeshData } from './utils';

export class SyncManager {
  private scene: THREE.Scene;
  private data: MeshObjectData | MeshObjectData[];
  private oldData: MeshObjectData | null = null;
  private meshBuilder: MeshBuilder | null = null;
  private isArray: boolean;
  private moveHandlerRef: MoveHandler | null = null;

  constructor(data: MeshObjectData | MeshObjectData[], threeDView?: ThreeDView) {
    const scene = store.getState().scene?.scene;
    this.scene = scene;
    // Convert snake_case keys from database to camelCase
    this.data = convertKeysToCamel<MeshObjectData | MeshObjectData[]>(data);
    this.isArray = Array.isArray(this.data);

    if (!this.isArray) {
      this.meshBuilder = new MeshBuilder(this.data as MeshObjectData);
    }

    if (threeDView?.camera && threeDView?.renderer && scene) {
      this.moveHandlerRef = new MoveHandler({
        scene: scene,
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

    const list = this._normalizeData(this.data);

    this._syncState(list);
    this._sync2D(list);
    await this._sync3D(list);
  }

  private _findMeshById(id: string): THREE.Mesh | null {
    let found: THREE.Mesh | null = null;

    this.scene.traverse((obj) => {
      if (!found && obj instanceof THREE.Mesh) {
        const objId = obj.userData?.objectId;
        if (objId === id) {
          found = obj;
        }
      }
    });

    return found;
  }

  private _findParentMesh(parentId: string): THREE.Mesh | null {
    let foundParent: THREE.Mesh | null = null;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.objectId === parentId) {
        foundParent = object;
      }
    });

    return foundParent;
  }

  private _isObjectType(type: string): boolean {
    return Object.values(OBJECT_TYPES).includes(type);
  }

  private _removeMeshFromScene(mesh: THREE.Mesh): void {
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
    const existingObjects = store.getState().data.objects;

    const toAdd: MeshObjectData[] = [];
    const toUpdate: MeshObjectData[] = [];

    list.forEach((item) => {
      const existing = existingObjects.find((o) => o.id === item.id);

      if (existing) {
        if (list.length === 1) {
          this.oldData = structuredClone(existing);
        }
        toUpdate.push(item);
      } else {
        const itemWithBanding = this._detectBandingFromScene(item);
        toAdd.push(itemWithBanding);
      }
    });

    if (toAdd.length) {
      store.dispatch(addObjects(toAdd));
    } else {
      toUpdate.forEach((obj) => store.dispatch(updateObject(obj)));
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
    } = {};

    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.type === 'banding') {
        const edge = child.userData.edge;
        if (edge && typeof edge === 'string') {
          detectedBanding[edge as keyof typeof detectedBanding] = true;
        }
      }
    });

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
    const existingObjects = store.getState().data.objects;

    list.forEach((item) => {
      if (item.type !== FLOOR_PLAN_TYPES.WALL) return;

      const exists = existingObjects.find((o) => o.id === item.id);
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
  private _createNewMesh() {
    if (!this.meshBuilder) {
      throw new Error('MeshBuilder is not initialized. This should not happen for single objects.');
    }
    const mesh = this.meshBuilder.createMesh();
    return mesh;
  }

  // Updates the mesh
  private async _updateMesh(mesh: THREE.Mesh) {
    if (!this.oldData || !this.meshBuilder || this.isArray) return;

    const data = this.data as MeshObjectData;
    const changes = this._getMeshObjectPatch(this.oldData, data);
    this.meshBuilder.updateMesh(mesh, changes, this.oldData.material);

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
        await this.meshBuilder.updateBanding(mesh);
      } else if (changes.edgeBanding) {
        // Banding state changed - recreate banding
        await this.meshBuilder.applyBandingFromState();
      }
    }

    if (changes.dimensions && mesh.userData.isMain) {
      this._updateChildrenDimensions(mesh, changes.dimensions);
    }
  }

  // Updates children dimensions when parent dimensions change
  private _updateChildrenDimensions(
    mesh: THREE.Mesh,
    newDimensions: Partial<{ width: number; height: number; depth: number }>
  ): void {
    if (this.isArray || !this.oldData) return;

    const data = this.data as MeshObjectData;
    if (!data.dimensions) return;

    // Use oldData dimensions (before update) and new data dimensions (after update)
    const oldWidth = this.oldData.dimensions?.width ?? 0;
    const oldHeight = this.oldData.dimensions?.height ?? 0;
    const oldDepth = this.oldData.dimensions?.depth ?? 0;
    const newWidth = newDimensions.width ?? data.dimensions.width ?? oldWidth;
    const newHeight = newDimensions.height ?? data.dimensions.height ?? oldHeight;
    const newDepth = newDimensions.depth ?? data.dimensions.depth ?? oldDepth;

    // Temporary fix for zero dimension
    const MIN_DIM = 0.01;

    /**
     * Calculate how much the parent mesh has scaled.
     * Example:
     *  oldWidth = 100, newWidth = 200 → scaleX = 2
     *  That means children should also double in width.
     */
    const scaleX = newWidth / (oldWidth + MIN_DIM);
    const scaleY = newHeight / (oldHeight + MIN_DIM);
    const scaleZ = newDepth / (oldDepth + MIN_DIM);

    mesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.BoxGeometry)) return;

      // Skip banding meshes - they will be updated separately
      if (child.userData.type === 'banding') {
        // Update banding mesh dimensions and position
        const edge = child.userData.edge;
        const bandingParams = child.geometry.parameters;
        const bandingThickness = Math.min(
          bandingParams.width,
          bandingParams.height,
          bandingParams.depth
        );

        let newBandingGeometry: THREE.BoxGeometry;
        let newBandingPosition: THREE.Vector3;

        if (edge === 'top' || edge === 'bottom') {
          newBandingGeometry = new THREE.BoxGeometry(newWidth, bandingThickness, newDepth);
          newBandingPosition = new THREE.Vector3(
            0,
            edge === 'top'
              ? newHeight / 2 - bandingThickness / 2
              : -newHeight / 2 + bandingThickness / 2,
            0
          );
        } else if (edge === 'left' || edge === 'right') {
          newBandingGeometry = new THREE.BoxGeometry(bandingThickness, newHeight, newDepth);
          newBandingPosition = new THREE.Vector3(
            edge === 'left'
              ? -newWidth / 2 + bandingThickness / 2
              : newWidth / 2 - bandingThickness / 2,
            0,
            0
          );
        } else if (edge === 'front' || edge === 'back') {
          newBandingGeometry = new THREE.BoxGeometry(newWidth, newHeight, bandingThickness);
          newBandingPosition = new THREE.Vector3(
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
        child.geometry = newBandingGeometry;
        child.position.copy(newBandingPosition);
        return;
      }

      const childParams = child.geometry.parameters;

      /**
       * New child dimensions after scaling.
       * If the parent grows or shrinks, each child grows/shrinks proportionally.
       */
      const nextWidth = Math.max(childParams.width * scaleX, MIN_DIM);
      const nextHeight = Math.max(childParams.height * scaleY, MIN_DIM);
      const nextDepth = Math.max(childParams.depth * scaleZ, MIN_DIM);

      /**
       * Update child position as well.
       * If the parent gets bigger, children move farther away proportionally.
       * If the parent gets smaller, children move closer proportionally.
       */
      const nextX = child.position.x * scaleX;
      const nextY = child.position.y * scaleY;
      const nextZ = child.position.z * scaleZ;

      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(nextWidth, nextHeight, nextDepth);

      child.position.set(nextX, nextY, nextZ);

      // Update banding for this child plank if it has any
      if (
        child.userData.type &&
        ['plank', 'verticalPlank', 'horizontalPlank', 'backPlank'].includes(child.userData.type)
      ) {
        // Update banding meshes for this child plank
        child.children.forEach((bandingChild) => {
          if (!(bandingChild instanceof THREE.Mesh) || bandingChild.userData.type !== 'banding')
            return;
          if (!(bandingChild.geometry instanceof THREE.BoxGeometry)) return;

          const bandingEdge = bandingChild.userData.edge;
          const bandingParams = bandingChild.geometry.parameters;
          const bandingThickness = Math.min(
            bandingParams.width,
            bandingParams.height,
            bandingParams.depth
          );

          let newBandingGeometry: THREE.BoxGeometry;
          let newBandingPosition: THREE.Vector3;

          if (bandingEdge === 'top' || bandingEdge === 'bottom') {
            newBandingGeometry = new THREE.BoxGeometry(nextWidth, bandingThickness, nextDepth);
            newBandingPosition = new THREE.Vector3(
              0,
              bandingEdge === 'top'
                ? nextHeight / 2 - bandingThickness / 2
                : -nextHeight / 2 + bandingThickness / 2,
              0
            );
          } else if (bandingEdge === 'left' || bandingEdge === 'right') {
            newBandingGeometry = new THREE.BoxGeometry(bandingThickness, nextHeight, nextDepth);
            newBandingPosition = new THREE.Vector3(
              bandingEdge === 'left'
                ? -nextWidth / 2 + bandingThickness / 2
                : nextWidth / 2 - bandingThickness / 2,
              0,
              0
            );
          } else if (bandingEdge === 'front' || bandingEdge === 'back') {
            newBandingGeometry = new THREE.BoxGeometry(nextWidth, nextHeight, bandingThickness);
            newBandingPosition = new THREE.Vector3(
              0,
              0,
              bandingEdge === 'front'
                ? nextDepth / 2 - bandingThickness / 2
                : -nextDepth / 2 + bandingThickness / 2
            );
          } else {
            return;
          }

          bandingChild.geometry.dispose();
          bandingChild.geometry = newBandingGeometry;
          bandingChild.position.copy(newBandingPosition);
        });
      }

      // Note: We don't update outline for children - only the selected parent should have an outline

      /**
       * If this child also exists in your Redux store,
       * update its dimensions + position there as well.
       */
      if (child.userData.objectId) {
        const existingObjects = store.getState().data.objects;
        const childData = existingObjects.find((obj) => obj.id === child.userData.objectId);

        if (childData) {
          store.dispatch(
            updateObject({
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
            })
          );
        }
      }
    });
  }

  private async _applyDrag(mesh: THREE.Mesh) {
    if (!this.moveHandlerRef) return;

    const pos = await this.moveHandlerRef.enableDragging(mesh);
    if (pos) mesh.position.set(pos.x, pos.y, pos.z);
  }

  private async _handleMultiple(list: MeshObjectData[], rootItem?: MeshObjectData) {
    const builder = new DesignBuilder(list, this.scene);
    const root = await builder.createDesign();

    if (this._isObjectType(rootItem?.type ? rootItem.type : '')) {
      this.scene.add(root);
      await this._applyDrag(root);
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
      } = {};

      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData.type === 'banding') {
          const edge = child.userData.edge;
          if (edge && typeof edge === 'string') {
            detectedBanding[edge as keyof typeof detectedBanding] = true;
          }
        }
      });

      // If we found banding and it's not already in Redux, update it
      if (Object.keys(detectedBanding).length > 0) {
        const existingObjects = store.getState().data.objects;
        const existing = existingObjects.find((o) => o.id === meshData.id);

        // Only update if banding state is different or missing
        if (existing) {
          const existingBanding = existing.edgeBanding || {};
          const hasChanges = Object.keys(detectedBanding).some(
            (edge) =>
              detectedBanding[edge as keyof typeof detectedBanding] !==
              existingBanding[edge as keyof typeof existingBanding]
          );

          if (hasChanges || Object.keys(existingBanding).length === 0) {
            store.dispatch(
              updateObject({
                id: meshData.id,
                edgeBanding: detectedBanding,
              })
            );
          }
        }
      }
    });
  }

  private async _handleSingle(item: MeshObjectData) {
    const existingMesh = this._findMeshById(item.id);

    if (existingMesh) {
      await this._updateMesh(existingMesh);
      updateOrRefreshOutline(this.scene, existingMesh);
      if (existingMesh.userData.isMain) generateCompartmentsFromMesh(existingMesh);
      return;
    }

    const mesh = this._createNewMesh();

    if (this._isObjectType(item.type)) {
      this.scene.add(mesh);
      await this._applyDrag(mesh);
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

    // This is a plank (regular or drawer plank) - apply parent banding if needed
    if (item.parent && this.meshBuilder) {
      await this._applyParentBandingIfNeeded(item);
    }
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

    const existingObjects = store.getState().data.objects;
    const parentData = existingObjects.find((obj) => obj.id === item.parent);
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
    const rootItem = list.find((i) => !i.parent);

    if (list.length > 1) {
      await this._handleMultiple(list, rootItem);
      return;
    }

    await this._handleSingle(list[0]);
  }
}
