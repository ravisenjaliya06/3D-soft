import * as THREE from 'three';
import { MINIFIX_STANDARDS } from './constant';
import type { MinifixConnection, MinifixStandards } from './types';

export function visualizeMinifixConnections(
  connections: MinifixConnection[],
  cupboardObject: THREE.Object3D,
  standards: MinifixStandards = MINIFIX_STANDARDS
): void {
  removeExistingMinifix(cupboardObject);
  connections.forEach((connection, index) => {
    // Visualize Housing (Screw + Dowel + Cam)
    const screwHousingMesh = createScrewVisualization(connection, index, true);
    screwHousingMesh.name = `Minifix_ScrewHousing_${connection.id}`;
    screwHousingMesh.visible = false;
    cupboardObject.add(screwHousingMesh);

    const dowelHousingMesh = createDowelVisualization(connection, index, standards, true);
    dowelHousingMesh.name = `Minifix_DowelHousing_${connection.id}`;
    dowelHousingMesh.visible = false;
    cupboardObject.add(dowelHousingMesh);

    const camMesh = createCamVisualization(connection, index);
    camMesh.name = `Minifix_Cam_${connection.id}`;
    camMesh.visible = false;
    cupboardObject.add(camMesh);

    // Visualize Mating (Screw Hole + Dowel Hole) -> Represented as cylinders for now
    const screwMatingMesh = createScrewVisualization(connection, index, false);
    screwMatingMesh.name = `Minifix_ScrewMating_${connection.id}`;
    screwMatingMesh.visible = false;
    cupboardObject.add(screwMatingMesh);

    const dowelMatingMesh = createDowelVisualization(connection, index, standards, false);
    dowelMatingMesh.name = `Minifix_DowelMating_${connection.id}`;
    dowelMatingMesh.visible = false;
    cupboardObject.add(dowelMatingMesh);
  });
}

function createScrewVisualization(connection: MinifixConnection, index: number, isHousing: boolean): THREE.Mesh {
  const hole = isHousing ? connection.screwHousing : connection.screwMating;
  const geometry = new THREE.CylinderGeometry(
    (hole.diameter || 8) / 2,
    (hole.diameter || 8) / 2,
    hole.length || 30,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: isHousing ? 0x0066cc : 0x999999, // Blue for screw, Grey for mating hole
    metalness: 0.8,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    hole.position.x,
    hole.position.y,
    hole.position.z
  );
  // Shift cylinder center if needed?
  // Cylinder is centered at origin.
  // We want it to start at position and go in direction.
  // Or is position the center?
  // Usually minifix hole position is the START on the face/edge.
  // So we need to translate geometry by length/2 in direction.

  const direction = new THREE.Vector3(
    hole.direction.x,
    hole.direction.y,
    hole.direction.z
  ).normalize();

  // Align 'Y' axis of cylinder to Direction
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // Offset to start from surface
  mesh.position.add(direction.clone().multiplyScalar((hole.length || 30) / 2));

  mesh.userData = {
    minifixType: isHousing ? 'SCREW_HOUSING' : 'SCREW_MATING',
    connectionId: connection.id,
    index: index,
  };
  return mesh;
}

function createCamVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    (connection.cam.diameter || 15) / 2,
    (connection.cam.diameter || 15) / 2,
    connection.cam.depth || 12,
    32
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    metalness: 0.6,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const boltDir = new THREE.Vector3(
    connection.cam.direction.x,
    connection.cam.direction.y,
    connection.cam.direction.z
  ).normalize();
  // Position: always inside cam plank
  mesh.position.set(
    connection.cam.position.x,
    connection.cam.position.y,
    connection.cam.position.z
  );
  // Rotate cam face to look towards screw
  // Cylinder default axis = Y
  // We align Y (0, 1, 0) to boltDir (Drill Direction).
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), boltDir);

  // Legacy fix for Horizontal to Vertical? 
  // If we just align Y to direction, it should be correct regardless of joint type.
  // The calculator provides the correct world-space direction.
  // So we don't need the conditional override unless there's a specific texture alignment issue.
  // Assuming geometry is rotationally symmetric (Cylinder), aligning Axis is enough.

  // Flip logic removed. We rely on the calculator to provide correct "Inward" direction normals.
  mesh.userData = {
    minifixType: 'CAM',
    connectionId: connection.id,
    index,
  };
  return mesh;
}



function createDowelVisualization(
  connection: MinifixConnection,
  index: number,
  standards: MinifixStandards,
  isHousing: boolean
): THREE.Mesh {
  const hole = isHousing ? connection.dowelHousing : connection.dowelMating;
  const geometry = new THREE.CylinderGeometry(
    (hole.diameter || 8) / 2,
    (hole.diameter || 8) / 2,
    hole.length || 20,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x00cc00,
    metalness: 0.2,
    roughness: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // Position is already calculated in calculator as the start position on edge/face
  mesh.position.set(hole.position.x, hole.position.y, hole.position.z);

  const direction = new THREE.Vector3(
    hole.direction.x,
    hole.direction.y,
    hole.direction.z
  ).normalize();

  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // Offset to start from surface
  mesh.position.add(direction.clone().multiplyScalar((hole.length || 20) / 2));

  mesh.userData = {
    minifixType: isHousing ? 'DOWEL_HOUSING' : 'DOWEL_MATING',
    connectionId: connection.id,
    index: index,
  };
  return mesh;
}

function removeExistingMinifix(cupboardObject: THREE.Object3D): void {
  const toRemove: THREE.Object3D[] = [];
  cupboardObject.traverse((child) => {
    if (
      child.name.startsWith('Minifix_') ||
      child.name.startsWith('JointMarker_')
    ) {
      toRemove.push(child);
    }
  });
  toRemove.forEach((obj) => {
    cupboardObject.remove(obj);
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    }
  });
}

export function toggleMinifixVisibility(visible: boolean, scene: THREE.Scene): void {
  scene.traverse((child) => {
    if (child.name.startsWith('Minifix_')) {
      child.visible = visible;
    }
  });
}

export function updateMinifixVisualization(
  connections: MinifixConnection[],
  cupboardObject: THREE.Object3D,
  standards: MinifixStandards = MINIFIX_STANDARDS
): void {
  visualizeMinifixConnections(connections, cupboardObject, standards);
}
