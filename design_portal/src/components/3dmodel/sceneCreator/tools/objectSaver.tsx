import { store } from '@/components/3dmodel/store';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { MeshObjectData } from '../interface';
import { CustomToast } from '../utils';

/**
 * Saves objects from scene to catalog
 * Can save a selected object with its children or all objects in the scene
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
    toast(() => <CustomToast appearance="error" message={message} />);
  }

  private _showSuccess(message: string) {
    toast(() => <CustomToast appearance="success" message={message} />);
  }

  private _findAllChildObjects(
    parentId: string,
    objects: MeshObjectData[],
    visited = new Set<string>()
  ) {
    if (visited.has(parentId)) return;
    visited.add(parentId);

    const childObjects = objects.filter((o) => o.parent === parentId);

    childObjects.forEach((child) => {
      this.payloadData.push({ ...child, isMain: false });
      this._findAllChildObjects(child.id, objects, visited);
    });
  }

  private _getAllObjectsData() {
    const objects = store.getState().data.objects;

    if (objects.length === 0) {
      this._showError('No objects found in the scene');
      return false;
    }

    // Find all root objects (objects without a parent or with parent not in the objects list)
    const objectIds = new Set(objects.map((o) => o.id));
    const rootObjects = objects.filter((o) => !o.parent || !objectIds.has(o.parent));

    // Process each root object and its children
    rootObjects.forEach((rootObject) => {
      this.payloadData.push({ ...rootObject, isMain: true });
      this._findAllChildObjects(rootObject.id, objects);
    });

    return true;
  }

  private _getSelectedObjectData() {
    const objects = store.getState().data.objects;
    const selectedObjectData = objects.find((o) => o.id === this.selectedObjectId);

    if (!selectedObjectData) {
      this._showError('No object selected');
      return false;
    }

    this.payloadData.push({ ...selectedObjectData, isMain: true });
    this._findAllChildObjects(this.selectedObjectId, objects);
    return true;
  }

  private _clearPayloadData() {
    this.payloadData = [];
  }

  private async _createAPICall() {
    const payload = {
      design_id: window.location.pathname.split('/')[2],
      items: this.payloadData,
    };
    const response = await CommonService.post(API_ENDPOINT.CREATE_LIBRARY_CATALOGS(true), payload);
    if (response.status !== 201) {
      this._showError(response.data.detail || 'Catalog creation failed');
    } else {
      this._showSuccess('Catalogs created successfully');
    }
  }

  private async _createAPICallForDesign() {
    const payload = {
      design_id: window.location.pathname.split('/')[2],
      items: this.payloadData,
    };
    const response = await CommonService.post(API_ENDPOINT.CREATE_CATALOGS, payload);
    if (response.status !== 201) {
      this._showError(response.data.detail || 'Catalog creation failed');
    } else {
      this._showSuccess('Catalogs created successfully');
    }
  }

  /**
   * Saves all objects in the scene
   */
  public saveAllObjects() {
    this._clearPayloadData();
    if (this._getAllObjectsData()) {
      this._createAPICallForDesign();
    }
  }

  /**
   * Saves the selected object and its children
   */
  public saveObject() {
    this._clearPayloadData();
    if (this._getSelectedObjectData()) {
      this._createAPICall();
    }
  }
}
