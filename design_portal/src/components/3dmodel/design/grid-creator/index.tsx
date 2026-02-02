// GridCreator.ts
import * as THREE from 'three';

export const createGrid = (size: number, divisions: number): THREE.GridHelper => {
  /** create grid in 3D scene. */

  const gridHelper = new THREE.GridHelper(size, divisions, 0xbebebe, 0xbebebe);
  gridHelper.name = 'grid';
  gridHelper.material.opacity = 0.9;
  gridHelper.material.depthWrite = false;
  gridHelper.material.transparent = true;
  gridHelper.renderOrder = -1; // Lower render order so it appears behind outline lines
  return gridHelper;
};
