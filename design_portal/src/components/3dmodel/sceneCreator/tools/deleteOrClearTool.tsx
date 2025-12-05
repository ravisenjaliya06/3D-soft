import { generateCompartmentsFromMesh } from '@/components/3dmodel/handler/items';
import { store } from '@/components/3dmodel/store';
import * as THREE from 'three';
import { OBJECT_TYPES, PART_TYPES } from '../interface';

/**
 * Removes all objects from scene
 * If removedObject is passed, removes only that object
 */
export class ObjectsRemoverFromScene {
  private scene: THREE.Scene;
  private objectsToRemove: THREE.Mesh[] = [];
  private removedObjectParent: THREE.Mesh | null = null;

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
      object.parent?.remove(object);
      this.objectsToRemove = [];
    });

    this._reCreateCompartments();
    this._clearOutline();
  }

  private _addRemovedObjectInList() {
    this.scene.children.forEach((object) => {
      if (
        object instanceof THREE.Mesh &&
        (Object.values(OBJECT_TYPES).includes(object.userData.type) ||
          Object.values(PART_TYPES).includes(object.userData.type))
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
    this.scene.children.forEach((object) => {
      if (object instanceof THREE.LineSegments && object.name.includes('outline')) {
        this.scene.remove(object);
      }
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
  }

  public clearScene() {
    this._addRemovedObjectInList();
  }
}
