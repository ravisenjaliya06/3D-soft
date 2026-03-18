import { store } from '@/components/3dmodel/store';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { getThreeDViewOnly } from '../../design/sceneSingleton';
import { MeshObjectData } from '../interface';
import { convertKeysToSnake, CustomToast } from '../utils';

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
    toast(<CustomToast appearance="error" message={message} />, {
      position: 'top-center',
      className:
        '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0',
      style: { padding: 0, minHeight: 'auto' },
    });
  }

  private _showSuccess(message: string) {
    toast(<CustomToast appearance="success" message={message} />, {
      position: 'top-center',
      className:
        '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0',
      style: { padding: 0, minHeight: 'auto' },
    });
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
      this.payloadData = [];
      return true;
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

  private _getSelectedObjectData(name?: string) {
    const objects = store.getState().data.objects;
    const selectedObjectData = objects.find((o) => o.id === this.selectedObjectId);

    if (!selectedObjectData) {
      this._showError('No object selected');
      return false;
    }

    this.payloadData.push({
      ...selectedObjectData,
      name: name || selectedObjectData.name,
      isMain: true,
      image: this._takeScreenshot(),
    });
    this._findAllChildObjects(this.selectedObjectId, objects);
    return true;
  }

  private _takeScreenshot(): string | undefined {
    const designId = window.location.pathname.split('/')[2];
    if (!designId) return undefined;

    // Use a safe accessor to avoid moving the renderer to a dummy mount
    const threeDView = getThreeDViewOnly(designId);

    if (!threeDView || !threeDView.renderer) {
      console.error('ThreeDView not found for screenshot');
      return undefined;
    }

    const scene = threeDView.scene;
    const camera = threeDView.camera as THREE.PerspectiveCamera;
    const renderer = threeDView.renderer;

    // 1. Find the selected root mesh
    let selectedMesh: THREE.Object3D | undefined;
    const originalVisibilities: Map<THREE.Object3D, boolean> = new Map();

    scene.traverse((child: THREE.Object3D) => {
      // Store original visibility and hide everything except lights/cameras
      originalVisibilities.set(child, child.visible);

      // Match based on objectId which is standard across the codebase
      const childId = child.userData?.objectId || child.userData?.id || child.name;
      if (childId === this.selectedObjectId) {
        selectedMesh = child;
      }

      if (!(child instanceof THREE.Light) && !(child instanceof THREE.Camera) && child !== scene) {
        child.visible = false;
      }
    });

    if (!selectedMesh) {
      console.warn('selectedMesh not found for ID:', this.selectedObjectId);
      originalVisibilities.forEach((visible, child) => {
        child.visible = visible;
      });
      return undefined;
    }

    // Only make the selected object and children visible
    selectedMesh.visible = true;
    selectedMesh.traverse((child) => {
      child.visible = true;
    });

    // 2. Prepare for Zoom to Fit (Front View, Perfect Square)
    const box = new THREE.Box3().setFromObject(selectedMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Save original camera & renderer state
    const originalPosition = camera.position.clone();
    const originalRotation = camera.rotation.clone();
    const originalAspect = camera.aspect;
    const originalTarget = threeDView.controls?.target.clone() || new THREE.Vector3();

    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);

    const originalBackground = scene.background;
    const originalClearColor = new THREE.Color();
    renderer.getClearColor(originalClearColor);
    const originalClearAlpha = renderer.getClearAlpha();

    // Calculate camera distance for framing a square view
    const maxSize = Math.max(size.x, size.y, size.z);

    // TEMPORARILY RESIZE RENDERER BUFFER FOR SQUARE SHOT
    const snapshotSize = 512;
    renderer.setSize(snapshotSize, snapshotSize, false); // false = don't resize the actual canvas element in UI
    camera.aspect = 1;

    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 1.05 * Math.max(fitHeightDistance, fitWidthDistance);

    // Setup temporary camera view for screenshot (directly from front: Z-axis)
    const offset = new THREE.Vector3(0, 0, 1).multiplyScalar(distance);
    camera.position.copy(center).add(offset);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    // Set transparency for screenshot
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    // 3. Render and Capture
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(
        'Distortion-free screenshot captured for:',
        this.selectedObjectId,
        dataUrl?.substring(0, 50) + '...'
      );
    }

    // 4. Restore original state
    scene.traverse((child: THREE.Object3D) => {
      const orig = originalVisibilities.get(child);
      if (orig !== undefined) {
        child.visible = orig;
      }
    });

    // Restore renderer & camera
    scene.background = originalBackground;
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.setSize(originalSize.x, originalSize.y, false);

    camera.aspect = originalAspect;
    camera.position.copy(originalPosition);
    camera.rotation.copy(originalRotation);
    if (threeDView.controls) {
      threeDView.controls.target.copy(originalTarget);
      threeDView.controls.update();
    }
    camera.updateProjectionMatrix();

    // Re-render to restore view
    renderer.render(scene, camera);

    return dataUrl;
  }

  private _clearPayloadData() {
    this.payloadData = [];
  }

  private async _createAPICall() {
    const snakedItems = convertKeysToSnake(this.payloadData);
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('Sending payload items:', snakedItems);
    }
    const payload = {
      design_id: window.location.pathname.split('/')[2],
      items: snakedItems,
    };
    const response = await CommonService.post(
      API_ENDPOINT.CREATE_LIBRARY_CATALOGS(true, true),
      payload
    );
    if (response.status !== 201) {
      this._showError(response.data.detail || 'Catalog creation failed');
    } else {
      this._showSuccess('Catalogs created successfully');
      //create own event for fetch cabinet items from API and update setCabinetItems state on catalog update event
      window.dispatchEvent(new CustomEvent('catalog-updated'));
    }
  }

  private async _createAPICallForDesign() {
    const snakedItems = convertKeysToSnake(this.payloadData);
    const payload = {
      design_id: window.location.pathname.split('/')[2],
      items: snakedItems,
    };
    const response = await CommonService.post(
      API_ENDPOINT.CREATE_LIBRARY_CATALOGS(false, true),
      payload
    );
    if (response.status !== 201) {
      this._showError(response.data.detail || 'Catalog creation failed');
      return null;
    } else {
      this._showSuccess('Catalogs created successfully');
      window.dispatchEvent(new CustomEvent('catalog-updated'));
      return response.data?.version_id;
    }
  }

  /**
   * Saves all objects in the scene
   */
  public async saveAllObjects() {
    this._clearPayloadData();
    if (this._getAllObjectsData()) {
      return await this._createAPICallForDesign();
    }
    return null;
  }

  /**
   * Saves the selected object and its children
   */
  public saveObject(name?: string) {
    this._clearPayloadData();
    if (this._getSelectedObjectData(name ? name : undefined)) {
      this._createAPICall();
    }
  }
}
