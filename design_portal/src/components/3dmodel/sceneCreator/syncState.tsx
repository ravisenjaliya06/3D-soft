import * as THREE from 'three';
import { store } from '../store';
import { addObjects, updateObject } from '../store/dataSlice';
import { updateOrRefreshOutline } from '../utils/outlineHelpers';
import { FLOOR_PLAN_TYPES, MeshObjectData } from './interface';
import { MeshBuilder } from './meshBuilder';
import { create2DWallFromMeshData } from './utils';

export class SyncManager {
  private scene: THREE.Scene;
  private data: MeshObjectData;
  private oldData: MeshObjectData | null = null;
  private meshBuilder: MeshBuilder;

  constructor(data: MeshObjectData) {
    this.scene = store.getState().scene?.scene;
    this.data = data;
    this.meshBuilder = new MeshBuilder(data);
  }

  // Syncs the data with the scene
  public syncData(): void {
    this._handleState();
    this._handle2d();
    this._handle3d();
  }

  // Updates the data in the redux store
  private _handleState() {
    const existingObjects = store.getState().data.objects;

    const existing = existingObjects.find((obj) => obj.id === this.data.id);

    if (existing) {
      // SAVE OLD DATA FIRST
      this.oldData = structuredClone(existing);

      // THEN UPDATE REDUX
      store.dispatch(updateObject({ ...this.data, id: this.data.id }));
    } else {
      store.dispatch(addObjects([this.data]));
    }
  }

  // Updates the 2D in the canvas
  private _handle2d() {
    if (!(this.data.type === FLOOR_PLAN_TYPES.WALL)) return;

    const existing2DWall = store.getState().data.objects.find((obj) => obj.id === this.data.id);
    if (existing2DWall) {
      return;
    }
    create2DWallFromMeshData(this.data);
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
    const mesh = this.meshBuilder.createMesh();
    return mesh;
  }

  // Updates the mesh
  private _updateMesh(mesh: THREE.Mesh) {
    if (!this.oldData) return;
    const changes = this._getMeshObjectPatch(this.oldData, this.data);
    this.meshBuilder.updateMesh(mesh, changes, this.oldData.material);

    // Update children if dimensions changed and this is a main object (cupboard)
    if (changes.dimensions && mesh.userData.isMain) {
      this._updateChildrenDimensions(mesh, changes.dimensions);
    }
  }

  private _findMeshById(): THREE.Mesh | null {
    let foundMesh: THREE.Mesh | null = null;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.objectId === this.data.id) {
        foundMesh = object;
      }
    });

    return foundMesh;
  }

  // Updates children dimensions when parent dimensions change
  private _updateChildrenDimensions(
    mesh: THREE.Mesh,
    newDimensions: Partial<{ width: number; height: number; depth: number }>
  ): void {
    if (!this.oldData || !this.data.dimensions) return;

    // Use oldData dimensions (before update) and new data dimensions (after update)
    const oldWidth = this.oldData.dimensions?.width ?? 0;
    const oldHeight = this.oldData.dimensions?.height ?? 0;
    const oldDepth = this.oldData.dimensions?.depth ?? 0;

    const newWidth = newDimensions.width ?? this.data.dimensions.width ?? oldWidth;
    const newHeight = newDimensions.height ?? this.data.dimensions.height ?? oldHeight;
    const newDepth = newDimensions.depth ?? this.data.dimensions.depth ?? oldDepth;

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

  // Handles the 3D mesh
  private _handle3d() {
    if (!this.scene) return;

    const existingMesh = this._findMeshById();

    if (existingMesh !== null) {
      this._updateMesh(existingMesh);
      // Update outline if it exists
      updateOrRefreshOutline(this.scene, existingMesh);
    } else {
      const mesh = this._createNewMesh();
      this.scene.add(mesh);
    }
  }
}
