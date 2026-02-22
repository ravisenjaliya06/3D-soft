import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { HoleData } from '../sceneCreator/interface';

export const applyCSGHoles = (
  baseGeometry: THREE.BufferGeometry,
  holes: HoleData[]
): THREE.BufferGeometry => {
  if (!holes || holes.length === 0) {
    return baseGeometry.clone();
  }

  const evaluator = new Evaluator();

  // Initialize result brush from the clean base geometry
  let resultBrush = new Brush(baseGeometry.clone());

  // Brush uses the object's matrix.
  resultBrush.updateMatrixWorld();

  holes.forEach((hole) => {
    // Create hole geometry based on sink dimensions
    const holeGeometry = new THREE.BoxGeometry(
      40, 60, 40
    );
    const holeBrush = new Brush(holeGeometry);

    // Set hole position and rotation relative to base mesh
    holeBrush.position.set(hole.position.x, hole.position.y, hole.position.z);
    holeBrush.rotation.set(hole.rotation.x, hole.rotation.y, hole.rotation.z);
    holeBrush.updateMatrixWorld();

    // Perform subtraction
    const tempBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    resultBrush = tempBrush as Brush;
  });

  return resultBrush.geometry;
};
