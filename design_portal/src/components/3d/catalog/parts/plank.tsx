// @ts-nocheck
import * as THREE from 'three';
import { TEXTURE_MEDIA } from '../../utils/constants';
import { convertDataToGeometry, createDesign } from '../object-creator/index';
import { elementDataList } from '../object-creator/interfaces';

const Planks = (
  data,
  width: number,
  height: number,
  depth: number,
): THREE.Object3D => {
  // Ensure data is an array
  let plankData: elementDataList = Array.isArray(data) ? data : [data];

  if (data.action === 'ADD_OBJECT') {
    plankData = [
      {
        type: 'GEOMETRY_DATA',
        data: {
          width: width,
          height: height,
          depth: depth,
          position: { x: 0, y: 0, z: 0 },
          name: 'PLANK',
          material: { type: 'TEXTURE', value: TEXTURE_MEDIA.wood },
        },
        minMax: 'BOTH',
      },
    ];
  }

  if (plankData[0].type !== 'GEOMETRY_DATA' && data) {
    plankData = convertDataToGeometry(plankData);
  }

  const plankObject = createDesign(plankData, 'MAX');
  if (data.data != null) {
    plankObject.name = data.data.name;
  } else {
    plankObject.name = data.name;
  }
  plankObject.position.set(0, 0, 0);
  return plankObject;
};

export default Planks;
