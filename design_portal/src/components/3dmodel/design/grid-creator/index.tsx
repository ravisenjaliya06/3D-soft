// GridCreator.ts
import * as THREE from 'three';

export const createGrid = (
  size: number,
  divisions: number,
): THREE.GridHelper => {
  const gridHelper = new THREE.GridHelper(size, divisions, 0xc8d1dc, 0xc8d1dc);
  gridHelper.name = 'grid';
  gridHelper.position.set(0, 0, 0);
  return gridHelper;
};
