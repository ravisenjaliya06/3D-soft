import {
  generateCompartmentsFromMesh,
  updateMinifixesForCupboard,
} from '@/components/3dmodel/handler/items';
import { store } from '@/components/3dmodel/store';
import * as THREE from 'three';
import {
  clearWalls,
  removeObject,
  setFloor,
  setHoverdMesh,
  setobjectSelected,
  setSelectedChildObject,
} from '../../store/dataSlice';
import { updatePlatformHolesForSink } from '../../utils/holeManager';
import { removeAllOutlines } from '../../utils/outlineHelpers';
import { DRAWER_PLANK_TYPES, FLOOR_PLAN_TYPES, OBJECT_TYPES, PART_TYPES } from '../interface';

/**
 * Removes all objects from scene
 * If removedObject is passed, removes only that object
 */
export class ObjectsRemoverFromScene {
  private scene: THREE.Scene;
  private objectsToRemove: THREE.Mesh[] = [];
  private removedObjectParent: THREE.Mesh | null = null;
  private readonly DISTANCE_GROUP_PREFIX = 'dist_group_';

  constructor() {
    this.scene = store.getState().scene?.scene;
  }

  private _reCreateCompartments() {
    if (this.removedObjectParent) {
      generateCompartmentsFromMesh(this.removedObjectParent);
    }
  }

  private _removeObjects() {
    this.objectsToRemove.forEach((object) => {
      if (
        object.parent instanceof THREE.Mesh &&
        Object.values(OBJECT_TYPES).includes(object.parent.userData.type)
      ) {
        this.removedObjectParent = object.parent;
      }
      if (object.userData.type === OBJECT_TYPES.SINK) {
        updatePlatformHolesForSink(this.scene, null, object.userData.objectId);
      }
      object.parent?.remove(object);
      store.dispatch(removeObject(object.userData.objectId));
    });
    this.objectsToRemove = [];

    this._reCreateCompartments();
    this._clearOutline();
    this._clearDistances();

    if (this.removedObjectParent) {
      updateMinifixesForCupboard(this.removedObjectParent);
    }
  }

  private _addRemovedObjectInList() {
    this.scene.children.forEach((object) => {
      if (
        object instanceof THREE.Mesh &&
        (Object.values(OBJECT_TYPES).includes(object.userData.type) ||
          Object.values(PART_TYPES).includes(object.userData.type) ||
          Object.values(DRAWER_PLANK_TYPES).includes(object.userData.type) ||
          Object.values(FLOOR_PLAN_TYPES).includes(object.userData.type))
      ) {
        this.objectsToRemove.push(object);
      }
    });

    this._removeObjects();
  }

  private _findByUserDataObjectId(targetId: string) {
    let found: THREE.Mesh | null = null;

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const objectId = object.userData;

      // Check ALL userData keys for a matching value
      for (const key in objectId) {
        if (objectId[key] === targetId) {
          found = object;
          break;
        }
      }
    });

    return found;
  }

  private _clearOutline() {
    removeAllOutlines(this.scene);
  }

  private _clearDistances() {
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.name && obj.name.startsWith(this.DISTANCE_GROUP_PREFIX)) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((group) => {
      this.scene.remove(group);
      // We could dispose resources here but distance.tsx usually handles it if clearAllDistances is called.
      // However, since we are doing manual removal, it's safer to just remove it.
    });
  }

  public findSingleObjectToRemove() {
    const selectedId =
      store.getState().data.selectedChildObject ?? store.getState().data.selectedObject;

    const object = this._findByUserDataObjectId(selectedId!);
    if (!object) {
      console.error('No any Object with selected id');
      return;
    }

    this.objectsToRemove.push(object);

    this._removeObjects();
    this._clearOutline();

    // Reset selection state in Redux
    store.dispatch(setobjectSelected(null));
    store.dispatch(setSelectedChildObject(null));
    store.dispatch(setHoverdMesh(null));
  }

  public clearScene() {
    // Clear selection state
    store.dispatch(setobjectSelected(null));
    store.dispatch(setSelectedChildObject(null));
    store.dispatch(setHoverdMesh(null));

    // Clear 2D data state
    store.dispatch(clearWalls());
    store.dispatch(setFloor([]));

    this._addRemovedObjectInList();
  }
}
