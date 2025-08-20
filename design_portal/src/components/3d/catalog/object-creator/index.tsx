// @ts-nocheck
import * as Three from 'three';
import { TEXTURE_MEDIA, TEXTURE_NAME } from '../../utils/constants';
import {
  cylinderGeometryData,
  elementData,
  elementDataList,
  geoMetryData,
} from './interfaces';

const textureLoader = new Three.TextureLoader();

function applyTexture(texture: string): Three.MeshPhongMaterial {
  if (texture === TEXTURE_NAME.WOOD) {
    texture = TEXTURE_MEDIA.wood;
  } else if (texture === TEXTURE_NAME.LIGHT_WOOD) {
    texture = TEXTURE_MEDIA.light_wood;
  } else if (texture === TEXTURE_NAME.DARK_BROWN) {
    texture = TEXTURE_MEDIA.dark_brown;
  } else if (texture === TEXTURE_NAME.OFF_WHITE) {
    texture = TEXTURE_MEDIA.off_white;
  } else if (texture === TEXTURE_NAME.GROSSY_BROWN) {
    texture = TEXTURE_MEDIA.grossy_brown;
  } else if (texture === TEXTURE_NAME.LIGHT_BROWN) {
    texture = TEXTURE_MEDIA.light_brown;
  } else if (texture === TEXTURE_NAME.WOOD_1) {
    texture = TEXTURE_MEDIA.wood_1;
  } else if (texture === TEXTURE_NAME.WOOD_2) {
    texture = TEXTURE_MEDIA.wood_2;
  } else if (texture === TEXTURE_NAME.WOOD_3) {
    texture = TEXTURE_MEDIA.wood_3;
  } else if (texture === TEXTURE_NAME.WOOD_4) {
    texture = TEXTURE_MEDIA.wood_4;
  } else if (texture === TEXTURE_NAME.WOOD_5) {
    texture = TEXTURE_MEDIA.wood_5;
  } else if (texture === TEXTURE_NAME.WOOD_6) {
    texture = TEXTURE_MEDIA.wood_6;
  } else if (texture === TEXTURE_NAME.WOOD_7) {
    texture = TEXTURE_MEDIA.wood_7;
  }
  const textureURL = texture || TEXTURE_MEDIA.wood;
  const material = new Three.MeshPhongMaterial();
  textureLoader.load(
    textureURL,
    (loadedTexture) => {
      material.map = loadedTexture;
      material.needsUpdate = true;
    },
    undefined,
    (error) => console.error('Error loading texture:', error),
  );
  return material;
}

function applyColor(color: string): Three.MeshLambertMaterial {
  return new Three.MeshLambertMaterial({ color: color });
}

function applyMaterial(
  material_type: string,
  value: string,
): Three.MeshLambertMaterial | Three.MeshPhongMaterial {
  if (material_type === 'COLOR') {
    return applyColor(value);
  } else if (material_type === 'TEXTURE') {
    return applyTexture(value);
  }
  return applyColor('0xffffff');
}

function applyGeometry(
  element: Three.Mesh,
  geoMetryData: geoMetryData,
): Three.Mesh {
  const material = applyMaterial(
    geoMetryData.material.type,
    geoMetryData.material.value,
  );
  const geometry = new Three.Mesh(
    new Three.BoxGeometry(
      geoMetryData.width,
      geoMetryData.height,
      geoMetryData.depth,
    ),
    material,
  );
  geometry.name = geoMetryData.name;
  geometry.geometry.name = geoMetryData.name;
  geometry.userData.texture = geoMetryData.material.value;

  geometry.position.set(
    geoMetryData.position.x,
    geoMetryData.position.y,
    geoMetryData.position.z,
  );
  element.add(geometry);

  return element;
}

function applyCylinderGeometry(
  element: Three.Mesh,
  cylinderGeometryData: cylinderGeometryData,
): Three.Mesh {
  const material = applyMaterial(
    cylinderGeometryData.material.type,
    cylinderGeometryData.material.value,
  );
  const cylinderGeometry = new Three.Mesh(
    new Three.CylinderGeometry(
      cylinderGeometryData.radiusTop,
      cylinderGeometryData.radiusBottom,
      cylinderGeometryData.height,
      cylinderGeometryData.radialSegments,
    ),
    material,
  );

  cylinderGeometry.position.set(
    cylinderGeometryData.position.x,
    cylinderGeometryData.position.y,
    cylinderGeometryData.position.z,
  );
  element.add(cylinderGeometry);

  return element;
}

function handleElementData(
  element: Three.Mesh,
  elementData: elementData,
): Three.Mesh {
  if (elementData.type === 'GEOMETRY_DATA') {
    return applyGeometry(element, elementData.data as geoMetryData);
  } else if (elementData.type === 'CYLINDER_GEOMETRY_DATA') {
    return applyCylinderGeometry(
      element,
      elementData.data as cylinderGeometryData,
    );
  }

  return element;
}

function createDesign(
  elementDataList: elementDataList,
  viewType: string,
): Three.Mesh {
  let element = new Three.Mesh();

  elementDataList.forEach((elementData) => {
    if (
      (viewType === 'MAX' &&
        (elementData.minMax === 'MAX' || elementData.minMax === 'BOTH')) ||
      (viewType === 'MIN' &&
        (elementData.minMax === 'MIN' || elementData.minMax === 'BOTH'))
    ) {
      element = handleElementData(element, elementData);
    }
  });

  return element;
}

function convertDataToGeometry(data) {
  const dataList = [];
  data.forEach(
    (element: {
      name;
      width;
      height;
      depth;
      plankSize;
      center_point: { x; y; z };
      material: { type; value };
    }) => {
      if (element.name === 'BACK_PLANK') {
        element.center_point.z = -10;
      }
      const geometry = {
        type: 'GEOMETRY_DATA',
        data: {
          name: element.name,
          width: element.width,
          height: element.height,
          depth: element.depth,
          plankSize: element.plankSize,
          position: {
            x: element.center_point.x,
            y: element.center_point.y,
            z: element.center_point.z || 0,
          },
          material: {
            type: 'TEXTURE',
            value: element.texture,
          },
        },
        minMax: 'BOTH',
      };
      dataList.push(geometry);
    },
  );

  return dataList;
}

function applySelectedHelperLine(element: Three.LOD): Three.LineSegments {
  const bbox = new Three.Box3().setFromObject(element);
  const edges = new Three.EdgesGeometry(
    new Three.BoxGeometry(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z,
    ),
  );
  const line = new Three.LineSegments(
    edges,
    new Three.LineBasicMaterial({ color: 0x1e90ff, linewidth: 5 }),
  );
  line.position.set(
    (bbox.min.x + bbox.max.x) / 2,
    (bbox.min.y + bbox.max.y) / 2,
    (bbox.min.z + bbox.max.z) / 2,
  );
  return line;
}

export { applySelectedHelperLine, convertDataToGeometry, createDesign };
