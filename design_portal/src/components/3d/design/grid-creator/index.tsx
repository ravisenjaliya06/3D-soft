// GridCreator.ts
import * as THREE from 'three';

export const createGrid = (
  size: number,
  divisions: number,
): THREE.GridHelper => {
  const gridHelper = new THREE.GridHelper(size, divisions, 0xc8d1dc, 0xc8d1dc);
  gridHelper.position.set(0, -1, 0);
  return gridHelper;
};
