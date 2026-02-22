import * as THREE from 'three';

export const getBoxCenter = (obj: THREE.Mesh): THREE.Vector3 => {
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
};

export const createLineObjects = (obj: THREE.Mesh, color: number): THREE.LineSegments => {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const edges = new THREE.EdgesGeometry(geo);
  const mat = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 2,
    depthTest: false,
  });
  const outline = new THREE.LineSegments(edges, mat);

  if (obj.userData.objectId) {
    outline.name = `outline-${obj.userData.objectId}`;
  } else {
    outline.name = 'outline-unknown';
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  outline.position.copy(center);

  // For group objects, we might still want to copy the world rotation/scale
  // but if we use setFromObject, the box is already in world space.
  // However, edges geometry for a box is local.
  // So we need to position it at the center of the bounding box.

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

export const updateOrRefreshOutline = (scene: THREE.Scene, mesh: THREE.Mesh): void => {
  mesh.updateWorldMatrix(true, false);

  // Solid Selection Outline
  const solidName = `outline-${mesh.userData.objectId}`;
  const solid = scene.getObjectByName(solidName) as THREE.LineSegments;

  if (solid) {
    solid.geometry.dispose();
    (solid.material as THREE.Material).dispose();

    const tempSolid = createLineObjects(mesh, 0xffff00);

    solid.geometry = tempSolid.geometry;
    solid.material = tempSolid.material;

    // Use the same center calculation as createLineObjects for consistency
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    solid.position.copy(center);
    // Reset transforms since center is in world space
    solid.quaternion.set(0, 0, 0, 1);
    solid.scale.set(1, 1, 1);
  }

  // Box Selection Outline
  const boxName = `outline_box-${mesh.userData.objectId}`;
  const boxOutline = scene.getObjectByName(boxName) as THREE.Mesh;

  if (boxOutline) {
    boxOutline.geometry.dispose();

    let box: THREE.Box3;
    if (mesh.geometry) {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      box = mesh.geometry.boundingBox!.clone();
    } else {
      box = new THREE.Box3().setFromObject(mesh);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    geometry.translate(center.x, center.y, center.z);
    boxOutline.geometry = geometry;

    if (mesh.geometry) {
      boxOutline.matrixAutoUpdate = false;
      boxOutline.matrix.copy(mesh.matrixWorld);
    } else {
      boxOutline.matrixAutoUpdate = true;
      boxOutline.position.copy(center);
    }
  }
};
