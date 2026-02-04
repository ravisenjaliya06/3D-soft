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
    const screwMesh = createScrewVisualization(connection, index);
    screwMesh.name = `Minifix_Screw_${connection.id}`;
    screwMesh.visible = false;
    cupboardObject.add(screwMesh);
    const camMesh = createCamVisualization(connection, index);
    camMesh.name = `Minifix_Cam_${connection.id}`;
    camMesh.visible = false;
    cupboardObject.add(camMesh);
    const dowelMesh = createDowelVisualization(connection, index, standards);
    dowelMesh.name = `Minifix_Dowel_${connection.id}`;
    dowelMesh.visible = false;
    cupboardObject.add(dowelMesh);
    const boltDrillMesh = createBoltDrillVisualization(connection, index);
    boltDrillMesh.name = `Minifix_BoltDrill_${connection.id}`;
    boltDrillMesh.visible = false;
    cupboardObject.add(boltDrillMesh);
  });
}

function createScrewVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    connection.screw.diameter / 2,
    connection.screw.diameter / 2,
    connection.screw.length,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x0066cc, // Blue for screw
    metalness: 0.8,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    connection.jointPosition.x,
    connection.jointPosition.y,
    connection.jointPosition.z
  );
  // Rotate to match direction
  const direction = new THREE.Vector3(
    connection.screw.direction.x,
    connection.screw.direction.y,
    connection.screw.direction.z
  ).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  mesh.userData = {
    minifixType: 'SCREW',
    connectionId: connection.id,
    index: index,
  };
  return mesh;
}

function createCamVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    connection.cam.diameter / 2,
    connection.cam.diameter / 2,
    connection.cam.depth,
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
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 0), boltDir);
  if (connection.connectionType == 'HORIZONTAL_TO_VERTICAL') {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), boltDir);
  }

  // Flip logic removed. We rely on the calculator to provide correct "Inward" direction normals.
  mesh.userData = {
    minifixType: 'CAM',
    connectionId: connection.id,
    index,
  };
  return mesh;
}

function createBoltDrillVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    (connection.boltDrill.diameter ?? connection.screw.diameter) / 2,
    (connection.boltDrill.diameter ?? connection.screw.diameter) / 2,
    connection.boltDrill.length ?? connection.screw.length / 2,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.4,
    roughness: 0.6,
    visible: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    connection.boltDrill.position.x,
    connection.boltDrill.position.y,
    connection.boltDrill.position.z
  );
  const direction = new THREE.Vector3(
    connection.boltDrill.direction.x,
    connection.boltDrill.direction.y,
    connection.boltDrill.direction.z
  ).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  mesh.userData = {
    minifixType: 'BOLT_DRILL',
    connectionId: connection.id,
    index: index,
  };
  return mesh;
}

function createDowelVisualization(
  connection: MinifixConnection,
  index: number,
  standards: MinifixStandards
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    connection.dowel.diameter / 2,
    connection.dowel.diameter / 2,
    connection.dowel.length / 2,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x00cc00,
    metalness: 0.2,
    roughness: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // Determine offset axis based on connection type
  const offsetAxis = connection.connectionType === 'VERTICAL_TO_VERTICAL' ? 'y' : 'z';
  const pos = {
    x: connection.jointPosition.x,
    y: connection.jointPosition.y + (offsetAxis === 'y' ? standards.dowelDistance : 0),
    z: connection.jointPosition.z + (offsetAxis === 'z' ? standards.dowelDistance : 0),
  };
  mesh.position.set(pos.x, pos.y, pos.z);
  const direction = new THREE.Vector3(
    connection.dowel.direction.x,
    connection.dowel.direction.y,
    connection.dowel.direction.z
  ).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  mesh.userData = {
    minifixType: 'DOWEL',
    connectionId: connection.id,
    index: index,
  };
  return mesh;
}

function removeExistingMinifix(cupboardObject: THREE.Object3D): void {
  const toRemove: THREE.Object3D[] = [];
  cupboardObject.traverse((child) => {
    if (
      child.name.startsWith('Minifix_Screw_') ||
      child.name.startsWith('Minifix_Cam_') ||
      child.name.startsWith('Minifix_Dowel_') ||
      child.name.startsWith('Minifix_BoltDrill_') ||
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
