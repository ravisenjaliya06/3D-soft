// GridCreator.ts
import * as THREE from 'three';

export const createGrid = (size: number, divisions: number): THREE.GridHelper => {
  /** create grid in 3D scene. */

  const gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
  gridHelper.name = 'grid';
  gridHelper.material.opacity = 0.9;
  gridHelper.material.depthWrite = false;
  gridHelper.material.transparent = true;
  return gridHelper;
};
