import * as THREE from 'three';
import { store } from '../store';

export const getBoxCenter = (obj: THREE.Mesh): THREE.Vector3 => {
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
};

export const createLineObjects = (obj: THREE.Mesh, color: number): THREE.LineSegments => {
  const edges = new THREE.EdgesGeometry(obj.geometry);
  const mat = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 2,
    depthTest: false,
  });
  const outline = new THREE.LineSegments(edges, mat);

  if (obj.userData.objectId) {
    outline.name = `outline-${obj.userData.objectId}`;
  } else {
    // Fallback or keep it generic if no ID, but typically used for selection
    outline.name = 'outline-unknown';
  }

  obj.updateWorldMatrix(true, false);
  obj.getWorldPosition(outline.position);
  outline.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
  return outline;
};

export const createDashedLineObject = (
  object: THREE.Mesh,
  color: number,
  center: THREE.Vector3
): THREE.LineSegments => {
  const geometry = object.geometry as THREE.BoxGeometry;
  // Handle case where geometry might not be BoxGeometry, though in this project it mostly is.
  // If params are missing (e.g. loaded model), we might need bounding box.
  // But strictly following original logic:
  const width = geometry.parameters?.width ?? 1;
  const height = geometry.parameters?.height ?? 1;
  const depth = geometry.parameters?.depth ?? 1;

  const geo = new THREE.BoxGeometry(width * 1.05, height * 1.05, depth * 1.05);
  const edges = new THREE.EdgesGeometry(geo);

  const dashedMat = new THREE.LineDashedMaterial({
    color: color,
    dashSize: 0.04,
    gapSize: 0.02,
    linewidth: 2,
  });

  const outline = new THREE.LineSegments(edges, dashedMat);
  outline.position.copy(center);
  outline.rotation.copy(object.rotation);
  outline.computeLineDistances();
  outline.name = 'cupboard_big_dotted_outline';
  return outline;
};

export const removeAllOutlines = (scene: THREE.Scene) => {
  const outlinesToRemove: THREE.Object3D[] = [];

  scene.traverse((object) => {
    if (object instanceof THREE.LineSegments && object.name.includes('outline')) {
      outlinesToRemove.push(object);
    }
  });

  outlinesToRemove.forEach((object) => {
    if (object.parent) {
      object.parent.remove(object);
    }
  });
};
