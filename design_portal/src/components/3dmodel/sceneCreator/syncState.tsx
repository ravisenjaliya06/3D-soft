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
    this.meshBuilder.updateMesh(mesh, changes);
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
