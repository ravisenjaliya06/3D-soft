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

    // Update transforms to match createLineObjects logic
    solid.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
    solid.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
    solid.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
  } else {
    const newSolid = createLineObjects(mesh, 0xffff00);
    scene.add(newSolid);
  }
};
