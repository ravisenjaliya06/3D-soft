import * as THREE from 'three';
import { HoleData } from '../sceneCreator/interface';

export const applyCSGHoles = async (
  baseGeometry: THREE.BufferGeometry,
  holes: HoleData[]
): Promise<THREE.BufferGeometry> => {
  if (!holes || holes.length === 0) {
    return baseGeometry.clone();
  }

  // Dynamically import three-bvh-csg to avoid SSR issues
  const { Brush, Evaluator, SUBTRACTION } = await import('three-bvh-csg');

  const evaluator = new Evaluator();

  // Initialize result brush from the clean base geometry
  let resultBrush = new Brush(baseGeometry.clone());

  // Brush uses the object's matrix.
  resultBrush.updateMatrixWorld();

  holes.forEach((hole) => {
    // Create hole geometry based on sink dimensions
    const holeGeometry = new THREE.BoxGeometry(40, 60, 40);
    const holeBrush = new Brush(holeGeometry);

    // Set hole position and rotation relative to base mesh
    holeBrush.position.set(hole.position.x, hole.position.y, hole.position.z);
    holeBrush.rotation.set(hole.rotation.x, hole.rotation.y, hole.rotation.z);
    holeBrush.updateMatrixWorld();

    // Perform subtraction
    const tempBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    resultBrush = tempBrush as any; // Cast as any if typing is tricky with dynamic import
  });

  return resultBrush.geometry;
};
