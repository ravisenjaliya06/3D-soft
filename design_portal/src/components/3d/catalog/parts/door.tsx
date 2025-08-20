// @ts-nocheck
import * as THREE from 'three';
import { TEXTURE_MEDIA } from '../../utils/constants';
import { convertDataToGeometry, createDesign } from '../object-creator/index';

const Door = (
  data,
  width: number,
  height: number,
  depth: number,
  plankSize: number,
): THREE.Object3D => {
  let plankData;
  if (data.doorData) {
    plankData = Array.isArray(data.doorData) ? data.doorData : [data.doorData];
  } else {
    plankData = Array.isArray(data) ? data : [data];
  }

  if (data.action === 'ADD_OBJECT') {
    plankData = [
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width / 2,
          height: height,
          depth: plankSize,
          position: { x: -width / 4, y: 0, z: depth / 2 },
          name: 'LEFT_DOOR',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.wood },
        },
        minMax: 'MAX',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width / 2,
          height: height,
          depth: plankSize,
          position: { x: width / 4, y: 0, z: depth / 2 },
          name: 'RIGHT_DOOR',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.wood },
        },
        minMax: 'MAX',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width / 30,
          height: height / 10,
          depth: 1,
          position: { x: -width / 10, y: 0, z: depth / 2 + 2 },
          name: 'LEFT_DOOR_HANDLE',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'MAX',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width / 30,
          height: height / 10,
          depth: 1,
          position: { x: width / 10, y: 0, z: depth / 2 + 2 },
          name: 'RIGHT_DOOR_HANDLE',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'MAX',
      },
    ];
  }

  if (plankData[0].type !== 'GEOMETRY_DATA' && data.doorData) {
    plankData = convertDataToGeometry(plankData);
  }
  const door = createDesign(plankData, 'MAX');
  if (data.position) {
    door.position.set(data.position.x, data.position.y, 0);
  } else {
    door.position.set(0, 0, 0);
  }
  door.name = 'DOOR';
  door.geometry.name = 'DOOR';
  return door;
};

export default Door;
