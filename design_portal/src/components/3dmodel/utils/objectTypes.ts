import * as THREE from 'three';
import { FLOOR_PLAN_TYPES, PART_TYPES } from '../sceneCreator/interface';

// check if object is plank by name because plank can be vertical or horizontal and if i check by type then it will not work beacuse vertical plank and horizontal plank have same type which is plank
export const isPlankObjectFindByName = (obj: THREE.Object3D): boolean => {
  const name = (obj.name || '').toLowerCase();
  return (
    name.includes(PART_TYPES.PLANK) ||
    name.includes(PART_TYPES.VERTICAL_PLANK) ||
    name.includes(PART_TYPES.HORIZONTAL_PLANK)
  );
};

export const isWallObject = (obj: THREE.Object3D): boolean => {
  const type = (obj.userData?.type || '').toLowerCase();

  return type === FLOOR_PLAN_TYPES.WALL || type === FLOOR_PLAN_TYPES.CWALL;
};
