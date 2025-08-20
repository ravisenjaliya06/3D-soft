// @ts-nocheck
import * as THREE from 'three';
import { TEXTURE_MEDIA } from '../../utils/constants';
import { convertDataToGeometry, createDesign } from '../object-creator/index';

const Drawer = (
  data,
  width: number,
  height: number,
  depth: number,
  plankSize: number,
): THREE.Object3D => {
  let plankData;
  if (data.drawerData) {
    plankData = Array.isArray(data.drawerData)
      ? data.drawerData
      : [data.drawerData];
  } else {
    plankData = Array.isArray(data) ? data : [data];
  }

  if (data.action === 'ADD_OBJECT') {
    plankData = [
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width,
          height: height,
          depth: plankSize,
          position: { x: 0, y: 0, z: depth / 2 },
          name: 'FRONT_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.wood },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: plankSize,
          height: height - plankSize,
          depth: depth - plankSize,
          position: { x: -width / 2, y: 0, z: 0 },
          name: 'LEFT_SIDE_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: plankSize,
          height: height - plankSize,
          depth: depth - plankSize,
          position: { x: width / 2, y: 0, z: 0 },
          name: 'RIGHT_SIDE_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width - plankSize,
          height: plankSize,
          depth: depth - plankSize,
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
          position: { x: 0, y: 0, z: -(depth / 2) },
          name: 'BACK_PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width / 2,
          height: plankSize,
          depth: plankSize / 2,
          position: { x: 0, y: height / 4, z: depth / 2 + 2 },
          name: 'HANDLE',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.dark_brown },
        },
        minMax: 'BOTH',
      },
    ];
  }

  if (plankData[0].type !== 'GEOMETRY_DATA' && data.drawerData) {
    plankData = convertDataToGeometry(plankData);
  }

  const drawer = createDesign(plankData, 'MAX');
  if (data.position) {
    drawer.position.set(data.position.x, data.position.y, 0);
  } else {
    drawer.position.set(0, 0, 0);
  }
  drawer.name = 'DRAWER';
  drawer.geometry.name = 'DRAWER';
  return drawer;
};

export default Drawer;
