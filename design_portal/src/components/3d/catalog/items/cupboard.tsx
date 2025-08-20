import * as THREE from 'three';
import { TEXTURE_MEDIA } from '../../utils/constants';
import { createDesign } from '../object-creator/index';
import { elementDataList } from '../object-creator/interfaces';

const WIDTH = 120;
const HEIGHT = 120;
const DEPTH = 20;
const plankSize = 2;

const Cupboard = (
  width: number = WIDTH,
  height: number = HEIGHT,
  depth: number = DEPTH,
): THREE.Object3D => {
  const getElementData = (
    width: number,
    height: number,
    depth: number,
    plankSize: number,
  ): elementDataList => {
    return [
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: plankSize,
          height: height + plankSize,
          depth: depth + plankSize,
          position: { x: -width / 2, y: 0, z: 0 },
          name: 'LEFT_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: plankSize,
          height: height + plankSize,
          depth: depth + plankSize,
          position: { x: width / 2, y: 0, z: 0 },
          name: 'RIGHT_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width - plankSize,
          height: plankSize,
          depth: depth + plankSize,
          position: { x: 0, y: height / 2, z: 0 },
          name: 'TOP_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width - plankSize,
          height: plankSize,
          depth: depth + plankSize,
          position: { x: 0, y: -(height / 2), z: 0 },
          name: 'BOTTOM_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width - plankSize,
          height: height - plankSize,
          depth: plankSize,
          position: { x: 0, y: 0, z: -depth / 2 },
          name: 'BACK_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
    ];
  };

  const elementDataList = getElementData(width, height, depth, plankSize);
  const cupboardObject = createDesign(elementDataList, 'MAX');
  cupboardObject.scale.set(0.01, 0.01, 0.01);
  cupboardObject.userData.width = width;
  cupboardObject.userData.height = height;
  cupboardObject.userData.depth = depth;
  cupboardObject.userData.plankSize = plankSize;

  // adding flag to local storage
  localStorage.setItem('cupboard', 'true');

  return cupboardObject;
};

export default Cupboard;
