// @ts-nocheck
import * as THREE from 'three';
import { convertDataToGeometry, createDesign } from '../object-creator/index';

const WIDTH = 118;
const HEIGHT = 118;
const DEPTH = 20;
const plankSize = 2;

const Cupboard = (
  data,
  width: number = WIDTH,
  height: number = HEIGHT,
  depth: number = DEPTH,
): THREE.Object3D => {
  if (data.blankCupboardData) {
    width = data.blankCupboardData.width;
    height = data.blankCupboardData.height;
    data = [
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: plankSize,
          height: height + plankSize,
          depth: depth + plankSize,
          position: { x: -width / 2, y: 0, z: 0 },
          name: 'LEFT_PLANK',
          material: {
            type: 'TEXTURE',
            value: 'wood_3',
          },
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
          material: {
            type: 'TEXTURE',
            value: 'wood_3',
          },
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
          material: {
            type: 'TEXTURE',
            value: 'wood_3',
          },
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
          material: {
            type: 'TEXTURE',
            value: 'wood_3',
          },
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
          material: {
            type: 'TEXTURE',
            value: 'wood_3',
          },
        },
        minMax: 'BOTH',
      },
    ];
  }

  if (data[0].type !== 'GEOMETRY_DATA') {
    data = convertDataToGeometry(data);
  }

  const cupboardObject = createDesign(data, 'MAX');
  cupboardObject.name = 'MAIN_CUPBOARD';
  cupboardObject.scale.set(0.01, 0.01, 0.01);
  cupboardObject.userData.width = width;
  cupboardObject.userData.height = height;
  cupboardObject.userData.depth = depth;
  cupboardObject.userData.plankSize = plankSize;

  return cupboardObject;
};

export default Cupboard;
