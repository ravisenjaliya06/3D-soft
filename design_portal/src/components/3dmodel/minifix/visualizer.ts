import * as THREE from 'three';
import type { MinifixConnection } from './types';

const STATIC_SCREW_SIZE = { diameter: 1, length: 5 };
const STATIC_CAM_SIZE = { diameter: 1, depth: 3 };
const STATIC_DOWEL_SIZE = { diameter: 1, length: 7 };

export function visualizeMinifixConnections(
  connections: MinifixConnection[],
  cupboardObject: THREE.Object3D
): void {
  removeExistingMinifix(cupboardObject);

  connections.forEach((connection, index) => {
    const screwMesh = createScrewVisualization(connection, index);
    screwMesh.name = `Minifix_Screw_${connection.id}`;
    screwMesh.visible = true;
    cupboardObject.add(screwMesh);

    const camMesh = createCamVisualization(connection, index);
    camMesh.name = `Minifix_Cam_${connection.id}`;
    camMesh.visible = true;
    cupboardObject.add(camMesh);

    const dowelMesh = createDowelVisualization(connection, index);
    dowelMesh.name = `Minifix_Dowel_${connection.id}`;
    dowelMesh.visible = true;
    cupboardObject.add(dowelMesh);

    const boltDrillMesh = createBoltDrillVisualization(connection, index);
    boltDrillMesh.name = `Minifix_BoltDrill_${connection.id}`;
    boltDrillMesh.visible = true;
    cupboardObject.add(boltDrillMesh);
  });
}

function createScrewVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    STATIC_SCREW_SIZE.diameter / 2,
    STATIC_SCREW_SIZE.diameter / 2,
    STATIC_SCREW_SIZE.length,
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
    STATIC_CAM_SIZE.diameter / 2,
    STATIC_CAM_SIZE.diameter / 2,
    STATIC_CAM_SIZE.depth / 3,
    16
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    metalness: 0.6,
    roughness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const screwDir = new THREE.Vector3(
    connection.screw.direction.x,
    connection.screw.direction.y,
    connection.screw.direction.z
  ).normalize();

  // Offset logic
  const isVertical = Math.abs(screwDir.y) > 0.9;

  if (isVertical) {
    mesh.position.set(
      connection.jointPosition.x - STATIC_SCREW_SIZE.diameter / 2,
      connection.jointPosition.y - STATIC_SCREW_SIZE.length / 2,
      connection.jointPosition.z
    );
    mesh.rotation.z = Math.PI / 2;
  } else {
    mesh.position.set(
      connection.jointPosition.x + STATIC_SCREW_SIZE.length / 2,
      connection.jointPosition.y + STATIC_SCREW_SIZE.diameter / 2,
      connection.jointPosition.z
    );
    mesh.rotation.y = Math.PI / 2;
  }

  mesh.userData = {
    minifixType: 'CAM',
    connectionId: connection.id,
    index: index,
  };

  return mesh;
}

function createBoltDrillVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    STATIC_SCREW_SIZE.diameter / 2,
    STATIC_SCREW_SIZE.diameter / 2,
    STATIC_SCREW_SIZE.length / 2,
    16
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.4,
    roughness: 0.6,
    visible: true,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const screwDir = new THREE.Vector3(
    connection.screw.direction.x,
    connection.screw.direction.y,
    connection.screw.direction.z
  ).normalize();

  // Offset logic
  const isVertical = Math.abs(screwDir.y) > 0.9;

  if (isVertical) {
    mesh.position.set(
      connection.jointPosition.x,
      connection.jointPosition.y - STATIC_SCREW_SIZE.length / 4,
      connection.jointPosition.z
    );
  } else {
    mesh.position.set(
      connection.jointPosition.x + STATIC_SCREW_SIZE.length / 4,
      connection.jointPosition.y,
      connection.jointPosition.z
    );
  }

  const direction = new THREE.Vector3(
    connection.boltDrill?.direction.x ?? connection.screw.direction.x,
    connection.boltDrill?.direction.y ?? connection.screw.direction.y,
    connection.boltDrill?.direction.z ?? connection.screw.direction.z
  ).normalize();

  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  mesh.userData = {
    minifixType: 'BOLT_DRILL',
    connectionId: connection.id,
    index: index,
  };

  return mesh;
}
function createDowelVisualization(connection: MinifixConnection, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(
    STATIC_DOWEL_SIZE.diameter / 2,
    STATIC_DOWEL_SIZE.diameter / 2,
    STATIC_DOWEL_SIZE.length / 2,
    16
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x00cc00,
    metalness: 0.2,
    roughness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    connection.jointPosition.x,
    connection.jointPosition.y,
    connection.jointPosition.z + 3
  );

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
  cupboardObject: THREE.Object3D
): void {
  visualizeMinifixConnections(connections, cupboardObject);
}
