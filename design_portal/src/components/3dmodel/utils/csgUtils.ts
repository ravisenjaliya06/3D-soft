import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { HoleData } from '../sceneCreator/interface';

export const applyCSGHoles = (baseMesh: THREE.Mesh, holes: HoleData[]): THREE.BufferGeometry => {
  if (!holes || holes.length === 0) {
    return baseMesh.geometry.clone();
  }

  const evaluator = new Evaluator();

  //its csg parts of the base mesh
  let resultBrush = new Brush(baseMesh.geometry.clone());

  // Brush uses the object's matrix.
  resultBrush.updateMatrixWorld();
  console.log(holes, 'holes');
  holes.forEach((hole) => {
    const holeGeometry = new THREE.BoxGeometry(40, 60, 40);
    console.log(holeGeometry, 'holeGeometry');
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
