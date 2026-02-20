import * as THREE from 'three';
import { HoleData, MeshObjectData, OBJECT_TYPES, PART_TYPES } from '../sceneCreator/interface';
import { SyncManager } from '../sceneCreator/syncState';
import { store } from '../store';
import { updateObject } from '../store/dataSlice';

/**
 * Calculates a refined bounding box for the sink's basin, excluding taps and handles.
 */
const getSinkBasinBox = (sink: THREE.Object3D) => {
  const basinBox = new THREE.Box3();
  let hasValidMesh = false;

  sink.traverse((child) => {
    if (child instanceof THREE.Mesh && child.visible) {
      const name = child.name.toLowerCase();
      // it's just for other glb models
      if (
        name.includes('tap') ||
        name.includes('faucet') ||
        name.includes('handle') ||
        name.includes('water') ||
        name.includes('knob') ||
        name.includes('lever')
      ) {
        return;
      }
      child.updateMatrixWorld();
      basinBox.expandByObject(child);
      hasValidMesh = true;
    }
  });

  // Fallback to full object if no specific basin meshes found or multiple parts excluded
  if (!hasValidMesh) {
    return new THREE.Box3().setFromObject(sink);
  }
  return basinBox;
};

export const updatePlatformHolesForSink = (
  scene: THREE.Scene,
  sink: THREE.Mesh | null,
  sinkId?: string
) => {
  const idToMatch = sink ? sink.userData.objectId : sinkId;
  if (!idToMatch) return;

  const sinkBox = sink ? getSinkBasinBox(sink) : null;
  const platforms: THREE.Mesh[] = [];

  scene.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh &&
      (obj.userData.type === OBJECT_TYPES.PLATFORM ||
        obj.userData.type === PART_TYPES.HORIZONTAL_PLANK ||
        obj.userData.type === PART_TYPES.PLANK)
    ) {
      platforms.push(obj);
    }
  });

  const state = store.getState().data.objects;

  platforms.forEach((platform) => {
    const platformData = state.find((obj) => obj.id === platform.userData.objectId);
    if (!platformData) return;

    const currentHoles = (platformData.holes || []) as HoleData[];
    const holeIndex = currentHoles.findIndex((h) => h.id === idToMatch);

    let isOverlapping = false;
    let sinkDimensions = { width: 60, height: 20, depth: 40 };
    let localPos = new THREE.Vector3();
    let sinkRotation = new THREE.Euler();

    if (sink && sinkBox) {
      const platformBox = new THREE.Box3().setFromObject(platform);
      // Expand platform box slightly vertically
      const checkPadding = 1;
      platformBox.max.y += checkPadding;
      platformBox.min.y -= checkPadding;
      isOverlapping = platformBox.intersectsBox(sinkBox);

      if (isOverlapping) {
        platform.updateMatrixWorld(true);
        sink.updateMatrixWorld(true);

        const worldPos = new THREE.Vector3();
        sink.getWorldPosition(worldPos);
        localPos = platform.worldToLocal(worldPos.clone());
        sinkRotation = sink.rotation.clone();

        // Calculate dimensions from world box to local space
        const worldSize = new THREE.Vector3();
        sinkBox.getSize(worldSize);

        // We need to account for platform scale to get local dimensions
        const platformScale = new THREE.Vector3();
        platform.getWorldScale(platformScale);

        /**
         * SHRINK FACTOR: Sinks usually have a 2-3cm flange/lip that sits ON the counter.
         * The cut-out should be smaller than the total width/depth.
         * We reduce it by ~4 units (approx 4cm) if it's a large GLB.
         */
        const shrinkFactor = 4; // 4cm total shrink

        sinkDimensions = {
          width: Math.max(2, worldSize.x / Math.abs(platformScale.x || 1) - shrinkFactor),
          height: worldSize.y / Math.abs(platformScale.y || 1) + 10,
          depth: Math.max(2, worldSize.z / Math.abs(platformScale.z || 1) - shrinkFactor),
        };
      }
    }

    if (sink && isOverlapping) {
      const holeData: HoleData = {
        id: idToMatch,
        position: { x: localPos.x, y: localPos.y, z: localPos.z },
        dimensions: sinkDimensions,
        rotation: { x: sinkRotation.x, y: sinkRotation.y, z: sinkRotation.z },
      };

      const newHoles = [...currentHoles];
      if (holeIndex > -1) {
        newHoles[holeIndex] = holeData;
      } else {
        newHoles.push(holeData);
      }

      if (JSON.stringify(newHoles) !== JSON.stringify(currentHoles)) {
        store.dispatch(updateObject({ id: platform.userData.objectId, holes: newHoles }));

        // Force a sync for the platform mesh to reflect geometric changes
        const updatedPlatformData = { ...platformData, holes: newHoles };
        const syncManager = new SyncManager(updatedPlatformData as MeshObjectData);
        syncManager.syncData();
      }
    } else if (holeIndex > -1) {
      // Remove hole if sink is no longer overlapping OR sink was deleted
      const newHoles = currentHoles.filter((h) => h.id !== idToMatch);
      store.dispatch(updateObject({ id: platform.userData.objectId, holes: newHoles }));

      // Force a sync for the platform mesh
      const updatedPlatformData = { ...platformData, holes: newHoles };
      const syncManager = new SyncManager(updatedPlatformData as MeshObjectData);
      syncManager.syncData();
    }
  });
};
