import * as THREE from 'three';
import { GeometryData, ShapeData as Shape } from '../interface';
import { createObject } from './objectCreator';

export const updateGeometry = (mesh: THREE.Mesh, selectedShape: Shape) => {
  const geometryData: GeometryData = {
    type: selectedShape.type,
    dimensions: selectedShape.properties.dimensions || {},
    color: selectedShape.properties.color || 0x808080,
    material:
      mesh.material instanceof THREE.Material ? mesh.material : undefined,
  };
  const newMesh = createObject(geometryData);
  const newGeometry = (newMesh as THREE.Mesh).geometry;
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  mesh.geometry = newGeometry;
  if (selectedShape.type === 'circle' || selectedShape.type === 'plane') {
    mesh.rotation.x = Math.PI / 2;
  }
};

export const updateMeshTransform = (mesh: THREE.Mesh, selectedShape: Shape) => {
  mesh.position.set(
    selectedShape.position.x,
    selectedShape.position.y,
    selectedShape.position.z,
  );

  mesh.rotation.set(
    selectedShape.rotation.x,
    selectedShape.rotation.y,
    selectedShape.rotation.z,
  );

  mesh.scale.set(
    selectedShape.scale.x,
    selectedShape.scale.y,
    selectedShape.scale.z,
  );
};
