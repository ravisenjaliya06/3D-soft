import { store } from '@/components/3dmodel/store';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { MeshObjectData } from '../interface';
import { CustomToast } from '../utils';

/**
 * Removes all objects from scene
 * If removedObject is passed, removes only that object
 */
export class ObjectsSaver {
  private scene: THREE.Scene;
  private selectedObjectId: string;
  private payloadData: MeshObjectData[] = [];

  constructor() {
    this.scene = store.getState().scene?.scene;
    this.selectedObjectId = store.getState().data.selectedObject || '';
  }

  private _showError(message: string) {
    toast(() => (
      <CustomToast appearance="error" message={message} />
    ));
  }

  private _findAllChildObjects(parentId?: string, visited = new Set<string>()) {
    const objects = store.getState().data.objects;
    const parentObjectId = parentId || this.selectedObjectId;

    if (visited.has(parentObjectId)) return;
    visited.add(parentObjectId);

    const childObjects = objects.filter((o) => o.parent === parentObjectId);

    childObjects.forEach((child) => {
      this.payloadData.push({ ...child, isMain: false });
      this._findAllChildObjects(child.id, visited);
    });
  }

  private _getObjectData() {
    const objects = store.getState().data.objects;
    const selectedObjectData = objects.find((o) => o.id === this.selectedObjectId);
    if (!selectedObjectData) {
      this._showError('No any Object selected');
      return;
    }
    this.payloadData.push(selectedObjectData);
    this._findAllChildObjects();
  }

  private _clearPayloadData() {
    this.payloadData = [];
  }

  private async _createAPICall() {
    const payload = {
      design_id: window.location.pathname.split('/')[2],
      items: this.payloadData,
    };
    const response = await CommonService.post(API_ENDPOINT.CREATE_CATALOGS, payload);
    if (response.status !== 201) {
      this._showError(response.data.detail || 'Catalog creation failed');
    } else {
      this._showError('Catalogs created successfully');
    }
  }

  public saveObject() {
    this._clearPayloadData();
    this._getObjectData();
    this._createAPICall();
  }
}
