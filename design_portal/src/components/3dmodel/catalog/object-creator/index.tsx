// @ts-nocheck
import { TEXTURE_MEDIA, TEXTURE_NAME } from '@/components/3d/utils/constants';
import { store } from '@/components/3dmodel/store';
import * as Three from 'three';
import {
  cylinderGeometryData,
  elementData,
  elementDataList,
  geoMetryData,
  GrooveDetail,
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
      material.side = Three.DoubleSide;
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
  const geometry = new Three.BoxGeometry(
    geoMetryData.width,
    geoMetryData.height,
    geoMetryData.depth,
  );

  // Create mesh directly with geometry and material
  const mesh = new Three.Mesh(geometry, material);
  mesh.name = geoMetryData.name;
  mesh.geometry.name = geoMetryData.name;
  mesh.userData.type = geoMetryData.catalog_type;
  mesh.userData.texture = geoMetryData.material.value;
  mesh.userData.objectId = geoMetryData.id;

  mesh.position.set(
    geoMetryData.position.x,
    geoMetryData.position.y,
    geoMetryData.position.z,
  );
  if (geoMetryData.name === 'BACK_PLANK') {
    mesh.position.z = geoMetryData.position.z + 0.5;
  }

  if (geoMetryData.name.includes('DOOR')) {
    mesh.userData.openDirection = geoMetryData.openDirection;
  }

  return mesh;
}

function applyCylinderGeometry(
  element: Three.Mesh,
  cylinderGeometryData: cylinderGeometryData,
): Three.Mesh {
  const material = applyMaterial(
    cylinderGeometryData.material.type,
    cylinderGeometryData.material.value,
  );
  const geometry = new Three.CylinderGeometry(
    cylinderGeometryData.radiusTop,
    cylinderGeometryData.radiusBottom,
    cylinderGeometryData.height,
    cylinderGeometryData.radialSegments,
  );

  const mesh = new Three.Mesh(geometry, material);
  mesh.position.set(
    cylinderGeometryData.position.x,
    cylinderGeometryData.position.y,
    cylinderGeometryData.position.z,
  );

  return mesh;
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
  const element = new Three.Mesh();

  // Create a temporary array to store child meshes
  const childMeshes: Three.Mesh[] = [];

  elementDataList.forEach((elementData) => {
    if (
      (viewType === 'MAX' &&
        (elementData.minMax === 'MAX' || elementData.minMax === 'BOTH')) ||
      (viewType === 'MIN' &&
        (elementData.minMax === 'MIN' || elementData.minMax === 'BOTH'))
    ) {
      const childMesh = handleElementData(new Three.Mesh(), elementData);
      if (elementData.data.grooves.length > 0) {
        childMesh.userData.grooves = elementData.data.grooves;
      }
      if (
        !elementData.data.name.includes('BACK_PLANK') &&
        elementData.data.name.includes('PLANK')
      ) {
        applyEdgeBanding(childMesh);
      }

      childMeshes.push(childMesh);
    }
  });

  if (childMeshes.length === 0) {
    return element;
  } else if (childMeshes.length === 1) {
    const singleMesh = childMeshes[0];
    return singleMesh;
  } else {
    childMeshes.forEach((child) => element.add(child));

    const boundingBox = new Three.Box3();
    childMeshes.forEach((child) => {
      boundingBox.expandByObject(child);
    });

    const width = boundingBox.max.x - boundingBox.min.x;
    const height = boundingBox.max.y - boundingBox.min.y;
    const depth = boundingBox.max.z - boundingBox.min.z;

    const mainGeometry = new Three.BoxGeometry(width, height, depth);
    const mainMaterial = new Three.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false,
      side: Three.DoubleSide,
    });

    element.geometry = mainGeometry;
    element.material = mainMaterial;

    element.position.set(
      (boundingBox.min.x + boundingBox.max.x) / 2,
      (boundingBox.min.y + boundingBox.max.y) / 2,
      (boundingBox.min.z + boundingBox.max.z) / 2,
    );
    applyGroove(element);
    return element;
  }
}

export function applyEdgeBanding(plank: Three.Mesh): Three.Mesh {
  plank.geometry.computeBoundingBox();
  const box = plank.geometry.boundingBox;
  if (!box) return;

  const bandThickness = 0.05;

  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  const depth = box.max.z - box.min.z;

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const plank_width = plank.geometry.parameters.width;
  const plank_height = plank.geometry.parameters.height;
  const isHorizontalPlank = plank_width > plank_height;

  const blackMaterial = new Three.MeshBasicMaterial({ color: 0x5c4033 });

  const bandSides = isHorizontalPlank
    ? [
        {
          size: [bandThickness, height, depth],
          position: [-halfW - bandThickness / 2, 0, 0],
        },
        {
          size: [bandThickness, height, depth],
          position: [halfW + bandThickness / 2, 0, 0],
        },
        {
          size: [width, height, bandThickness],
          position: [0, 0, halfD + bandThickness / 2],
        },
        {
          size: [width, height, bandThickness],
          position: [0, 0, -halfD - bandThickness / 2],
        },
      ]
    : [
        {
          size: [width, bandThickness, depth],
          position: [0, halfH + bandThickness / 2, 0],
        },
        {
          size: [width, bandThickness, depth],
          position: [0, -halfH - bandThickness / 2, 0],
        },
        {
          size: [width, height, bandThickness],
          position: [0, 0, halfD + bandThickness / 2],
        },
        {
          size: [width, height, bandThickness],
          position: [0, 0, -halfD - bandThickness / 2],
        },
      ];

  bandSides.forEach(({ size, position }, index) => {
    const bandGeometry = new Three.BoxGeometry(...size);
    const bandMesh = new Three.Mesh(bandGeometry, blackMaterial);
    bandMesh.position.set(...position);
    bandMesh.name = `edge_banding_${index}`;
    bandMesh.visible = false;
    plank.add(bandMesh);
  });
}

function applyGroove(element: Three.Mesh): Three.Mesh {
  const connectedPlankPairs: [Three.Mesh, Three.Mesh][] = [];

  const planks: Three.Mesh[] = [];
  element.children.forEach((child) => {
    if (child instanceof Three.Mesh) {
      planks.push(child);
    }
  });

  planks.forEach((plank) => {
    if (!plank.userData.grooves) {
      plank.userData.grooves = [];
    }
  });

  const backPlanks = planks.filter((p) => p.name.includes('BACK_PLANK'));
  const otherPlanks = planks.filter((p) => !p.name.includes('BACK_PLANK'));

  backPlanks.forEach((backPlank) => {
    if (backPlank.userData.grooves.length > 0) {
      return element;
    }
    const boxBack = new Three.Box3().setFromObject(backPlank);

    otherPlanks.forEach((sidePlank) => {
      if (sidePlank.userData.grooves.length > 0) {
        return element;
      }
      const boxSide = new Three.Box3().setFromObject(sidePlank);

      if (boxesAreConnected(boxBack, boxSide)) {
        connectedPlankPairs.push([backPlank, sidePlank]);

        const fitmentDetail = calculateGrooveDetail(
          backPlank,
          sidePlank,
          'fitment',
          sidePlank.name,
          element,
        );
        backPlank.userData.grooves.push(fitmentDetail);

        const grooveDetail = calculateGrooveDetail(
          sidePlank,
          backPlank,
          'groove',
          backPlank.name,
          element,
        );
        sidePlank.userData.grooves.push(grooveDetail);
      }
    });
  });

  return element;
}

function boxesAreConnected(boxA: Three.Box3, boxB: Three.Box3): boolean {
  const threshold = 0.1;

  const xConnected =
    Math.abs(boxA.max.x - boxB.min.x) < threshold ||
    Math.abs(boxB.max.x - boxA.min.x) < threshold;

  const yOverlap = boxA.min.y < boxB.max.y && boxA.max.y > boxB.min.y;

  const zOverlap = boxA.min.z < boxB.max.z && boxA.max.z > boxB.min.z;

  const yConnected =
    Math.abs(boxA.max.y - boxB.min.y) < threshold ||
    Math.abs(boxB.max.y - boxA.min.y) < threshold;

  const xOverlap = boxA.min.x < boxB.max.x && boxA.max.x > boxB.min.x;

  return (
    (xConnected && yOverlap && zOverlap) || (yConnected && xOverlap && zOverlap)
  );
}

function calculateGrooveDetail(
  plankA: Three.Mesh,
  plankB: Three.Mesh,
  type: 'groove' | 'fitment',
  connectedTo: string,
  element: Three.Mesh,
): GrooveDetail {
  const designSettings = store.getState().designSettings.settings[0];
  const boxA = new Three.Box3().setFromObject(plankA);
  const boxB = new Three.Box3().setFromObject(plankB);
  const threshold = 0.1;

  const xConnected =
    Math.abs(boxA.max.x - boxB.min.x) < threshold ||
    Math.abs(boxB.max.x - boxA.min.x) < threshold;

  const yConnected =
    Math.abs(boxA.max.y - boxB.min.y) < threshold ||
    Math.abs(boxB.max.y - boxA.min.y) < threshold;

  let orientation: 'horizontal' | 'vertical';
  let worldX = 0,
    worldY = 0,
    worldZ = 0,
    length = 0;

  if (xConnected) {
    orientation = 'vertical';
    worldX = Math.min(boxA.max.x, boxB.max.x);
    worldY =
      (Math.max(boxA.min.y, boxB.min.y) + Math.min(boxA.max.y, boxB.max.y)) / 2;
    worldZ =
      (Math.max(boxA.min.z, boxB.min.z) + Math.min(boxA.max.z, boxB.max.z)) / 2;
    length = Math.abs(
      Math.min(boxA.max.y, boxB.max.y) - Math.max(boxA.min.y, boxB.min.y),
    );
  } else if (yConnected) {
    orientation = 'horizontal';
    worldX =
      (Math.max(boxA.min.x, boxB.min.x) + Math.min(boxA.max.x, boxB.max.x)) / 2;
    worldY = Math.min(boxA.max.y, boxB.max.y);
    worldZ =
      (Math.max(boxA.min.z, boxB.min.z) + Math.min(boxA.max.z, boxB.max.z)) / 2;
    length = Math.abs(
      Math.min(boxA.max.x, boxB.max.x) - Math.max(boxA.min.x, boxB.min.x),
    );
  } else {
    orientation = 'horizontal';
  }

  // Convert global coordinates to plankA's local coordinates
  const localPoint = plankA.worldToLocal(
    new Three.Vector3(worldX, worldY, worldZ),
  );

  const groove_gap = designSettings ? (designSettings.groove_gap ?? 0) : 0;
  const groove_dig = designSettings ? (designSettings.groove_dig ?? 0) : 0;

  return {
    type,
    x: localPoint.x,
    y: localPoint.y,
    position: { x: worldX, y: worldY, z: worldZ },
    length,
    orientation,
    connectedTo,
    groove_gap,
    groove_dig,
  };
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
      position: { x; y; z };
      material: { type; value };
      grooves: [];
      openDirection: string;
      catalog_type: string;
    }) => {
      if (element.material === undefined) {
        element.material = { type: 'TEXTURE', value: 'wood' };
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
            x: element.position.x,
            y: element.position.y,
            z: element.position.z || 0,
          },
          material: {
            type: 'TEXTURE',
            value: element.material.value,
          },
          grooves: element.grooves || [],
          openDirection: element.openDirection || '',
          catalog_type: element.catalog_type || '',
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
