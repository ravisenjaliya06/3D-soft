import * as THREE from 'three';
import { removeExistingLines } from '.';
import { TEXTURES_URLS } from '../constants';
import { RulePart } from '../handler/interface';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../handler/items';
import { metersToMM } from '../handler/unitConversion';
import { GLBLoader } from '../helper/glbLoader';
import { DesignBuilder } from '../sceneCreator/designBuilder';
import { GEOMETRY, MATERIAL_TYPE, OBJECT_TYPES, PART_TYPES } from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { store } from '../store';
import {
  setHoverdMesh,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
} from '../store/dataSlice';
import { SelectedCabinetItem } from '../toolbar/interface';
import { DimensionMeta, Part, ThreeDView } from './interface';
import { createRealisticMaterial } from './loadRealisticScene';

let cachedHandleModel: THREE.Object3D | null = null;

// Constants
const EPSILON_OFFSET = 0.001; // Small offset to avoid Z-fighting
const EPS = 1e-6;
const DIM_LABEL_PREFIX = 'dim_label_';
const DIMENSION_GROUP_PREFIX = 'dim_group_';

// Unit conversion helpers for dimension labels and editing
type Unit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
const metersToUnit = (m: number, unit: Unit): number => {
  switch (unit) {
    case 'mm':
      return m * 1000;
    case 'cm':
      return m * 100;
    case 'm':
      return m;
    case 'in':
      return m * 39.37007874015748;
    case 'ft':
      return m * 3.280839895013123;
    default:
      return m * 1000;
  }
};
const unitToMeters = (v: number, unit: Unit): number => {
  switch (unit) {
    case 'mm':
      return v / 1000;
    case 'cm':
      return v / 100;
    case 'm':
      return v;
    case 'in':
      return v / 39.37007874015748;
    case 'ft':
      return v / 3.280839895013123;
    default:
      return v / 1000;
  }
};
const getActiveUnit = (): Unit => {
  try {
    const unit = store.getState()?.measurement?.unitType as Unit | undefined;
    return (unit as Unit) || 'mm';
  } catch {
    return 'mm';
  }
};
const unitSuffix = (unit: Unit): string => unit;

const toAvoidOverlap = 0.01; // 1mm offset to avoid overlap z-fighting // so floor sits just up y=0.01 to avoid overlap grid

// Helper function to convert dimensions to mm
const convertDimensionsToMM = (dimensions: { width: number; height: number; depth: number }) => ({
  width: Math.round(dimensions.width * 1000),
  height: Math.round(dimensions.height * 1000),
  depth: Math.round(dimensions.depth * 1000),
});

// Helper function to convert position to mm
const convertPositionToMM = (position: { x: number; y: number; z: number }) => ({
  x: Math.round(position.x * 1000),
  y: Math.round(position.y * 1000),
  z: Math.round(position.z * 1000),
});

// Helper function to create invisible material
function createInvisibleMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
}

export const loadSinkModel = async (scene: THREE.Scene, url: string) => {
  let counterMesh = scene.getObjectByName('Counter_CenterWall') as THREE.Mesh | null;
  if (!counterMesh) {
    const lShape = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
    if (lShape) {
      counterMesh = lShape.children.find(
        (children) => children.name === 'Back Counter'
      ) as THREE.Mesh | null;
    }
  }
  if (!counterMesh) {
    scene.traverse((object) => {
      if (!counterMesh && object instanceof THREE.Mesh && object.name.startsWith('Counter_'))
        counterMesh = object;
    });
  }
  if (!counterMesh) return;

  const sinkModel = await GLBLoader(url, 'SinkGLB', { width: 0.6, height: 0.35, depth: 0.35 });
  sinkModel.position.set(counterMesh.position.x - 2, 0.52, counterMesh.position.z);
  scene.add(sinkModel);
};

// Helper function to create invisible box mesh
export function createInvisibleBox(
  dimensions: { width: number; height: number; depth: number },
  position: { x: number; y: number; z: number },
  name: string,
  userData = {}
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
  const material = createInvisibleMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position.x, position.y, position.z);
  mesh.userData = { ...userData, isInvisibleBox: true };
  return mesh;
}
export function createMeshObject(
  part: Part,
  setShadows: boolean = true,
  userData = {}
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(
    part.dimensions.width,
    part.dimensions.height,
    part.dimensions.depth
  );
  const material =
    part.material instanceof THREE.Material
      ? part.material
      : new THREE.MeshStandardMaterial(part.material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.name || 'unnamed_plank';

  if (part.position) {
    mesh.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
  }
  if (part.rotation) {
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.rotation.x || 0),
      THREE.MathUtils.degToRad(part.rotation.y || 0),
      THREE.MathUtils.degToRad(part.rotation.z || 0)
    );
  }
  if (setShadows) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  mesh.userData = { ...mesh.userData, ...userData };
  return mesh;
}

export const addSimpleCabinet = (scene: THREE.Scene) => {
  const width = 1.5;
  const height = 2;
  const depth = 0.4;
  const thickness = 0.018;

  const placeX = 0;

  const woodTexturePath = '/textures/light_wood.jpg';

  const mainCupboardID = crypto.randomUUID();
  const planks = [
    {
      id: mainCupboardID,
      name: 'CUPBOARD',
      type: OBJECT_TYPES.CUPBOARD,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      isMain: true,
      dimensions: {
        width: width,
        height: height,
        depth: depth,
      },
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    {
      id: crypto.randomUUID(),
      name: 'LEFT_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: thickness,
        height: height,
        depth: depth,
      },
      position: {
        x: placeX - (width / 2 - thickness / 2),
        y: 0,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'RIGHT_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: thickness,
        height: height,
        depth: depth,
      },
      position: {
        x: placeX + (width / 2 - thickness / 2),
        y: 0,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'TOP_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: thickness,
        depth: depth,
      },
      position: {
        x: placeX,
        y: height / 2 - thickness / 2,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'BOTTOM_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: thickness,
        depth: depth,
      },
      position: {
        x: placeX,
        y: -(height / 2 - thickness / 2),
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'BACK_PLANK',
      type: PART_TYPES.BACK_PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: height - thickness * 2,
        depth: thickness,
      },
      position: {
        x: placeX,
        y: 0,
        z: -(depth / 2 - thickness / 2),
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
  ];

  const designsBuilder = new DesignBuilder(planks);
  const design = designsBuilder.createDesign();
  scene.add(design);
};

export const addSimpleCabinet1 = (scene: THREE.Scene) => {
  const width = 1.5;
  const height = 2;
  const depth = 0.4;
  const thickness = 0.018;

  const placeX = 0;

  const woodTexturePath = '/textures/light_wood.jpg';

  const mainCupboardID = crypto.randomUUID();
  const planks = [
    {
      id: mainCupboardID,
      name: 'CUPBOARD',
      type: OBJECT_TYPES.CUPBOARD,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      isMain: true,
      dimensions: {
        width: width,
        height: height,
        depth: depth,
      },
      position: { x: 2, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    {
      id: crypto.randomUUID(),
      name: 'LEFT_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: thickness,
        height: height,
        depth: depth,
      },
      position: {
        x: placeX - (width / 2 - thickness / 2),
        y: 0,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'RIGHT_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: thickness,
        height: height,
        depth: depth,
      },
      position: {
        x: placeX + (width / 2 - thickness / 2),
        y: 0,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'TOP_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: thickness,
        depth: depth,
      },
      position: {
        x: placeX,
        y: height / 2 - thickness / 2,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'BOTTOM_PLANK',
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: thickness,
        depth: depth,
      },
      position: {
        x: placeX,
        y: -(height / 2 - thickness / 2),
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
    {
      id: crypto.randomUUID(),
      name: 'BACK_PLANK',
      type: PART_TYPES.BACK_PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: mainCupboardID,
      dimensions: {
        width: width - thickness * 2,
        height: height - thickness * 2,
        depth: thickness,
      },
      position: {
        x: placeX,
        y: 0,
        z: -(depth / 2 - thickness / 2),
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: woodTexturePath,
        repeatX: 2,
        repeatY: 1,
      },
    },
  ];

  const designsBuilder = new DesignBuilder(planks);
  const design = designsBuilder.createDesign();
  scene.add(design);
};

export const addPlatformOnWall = async (
  scene: THREE.Scene,
  wallMesh: THREE.Mesh | null,
  counterTexture: THREE.Texture
) => {
  if (!counterTexture) {
    const textureLoader = new THREE.TextureLoader();
    counterTexture = textureLoader.load('/img14_64.jpg');
    counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
    counterTexture.repeat.set(10, 1);
  }
  const platformHeight = 0.7;
  const countertopThickness = 0.05;
  const defaultProtrusion = 0.74;

  const params = (wallMesh?.geometry as THREE.BoxGeometry).parameters;
  const wallW = params.width as number;
  const wallD = params.depth as number;

  const platformGroup = new THREE.Group();
  platformGroup.name = `Platform_${wallMesh?.name}`;

  const addedMeshes: Array<{
    name: string;
    width: number;
    height: number;
    depth: number;
    position: { x: number; y: number; z: number };
    data: { rotation: { x: number; y: number; z: number }; wall: string };
  }> = [];

  const counterMaterial = await createRealisticMaterial(scene, {
    textures: TEXTURES_URLS.PLATFORM,
    repeatX: 10,
    repeatY: 1,
    rotation:
      wallMesh?.name === 'Left Wall' || wallMesh?.name === 'Right Wall' ? Math.PI / 2 : null,
  });

  if (wallMesh?.name === 'Center Wall') {
    const wallCenterX = wallMesh.position.x;
    const halfLengthX = wallW / 2;
    let leftStartX = wallCenterX - halfLengthX;
    let rightEndX = wallCenterX + halfLengthX;

    const leftPlat = scene.getObjectByName('Counter_LeftWall') as THREE.Mesh | undefined;
    if (leftPlat) {
      const leftProtrusion = (leftPlat.geometry as THREE.BoxGeometry).parameters.width as number;
      leftStartX = Math.max(leftStartX, leftPlat.position.x + leftProtrusion / 2);
    }

    const rightPlat = scene.getObjectByName('Counter_RightWall') as THREE.Mesh | undefined;
    if (rightPlat) {
      const rightProtrusion = (rightPlat.geometry as THREE.BoxGeometry).parameters.width as number;
      rightEndX = Math.min(rightEndX, rightPlat.position.x - rightProtrusion / 2);
    }

    const lengthX = Math.max(rightEndX - leftStartX, 0.1);
    const centerX = (leftStartX + rightEndX) / 2;

    const topPart = {
      name: 'Counter_CenterWall',
      dimensions: {
        width: lengthX,
        height: countertopThickness,
        depth: defaultProtrusion,
      },
      position: {
        x: centerX,
        y: platformHeight + countertopThickness / 2,
        z: wallMesh.position.z + wallD / 2 + defaultProtrusion / 2,
      },
      material: counterMaterial,
    };
    const topMesh = createMeshObject(topPart);

    platformGroup.add(topMesh);

    addedMeshes.push({
      name: topPart.name,
      width: metersToMM(topPart.dimensions.width),
      height: metersToMM(topPart.dimensions.height),
      depth: metersToMM(topPart.dimensions.depth),
      position: {
        x: metersToMM(topPart.position.x),
        y: metersToMM(topPart.position.y),
        z: metersToMM(topPart.position.z),
      },
      data: {
        rotation: topMesh.rotation,
        wall: wallMesh?.name || '',
      },
    });
  } else if (wallMesh?.name === 'Left Wall' || wallMesh?.name === 'Right Wall') {
    const wallCenterZ = wallMesh.position.z;
    const halfRunZ = wallD / 2;
    const minZ = wallCenterZ - halfRunZ;
    const maxZ = wallCenterZ + halfRunZ;

    const backPlat = scene.getObjectByName('Counter_CenterWall') as THREE.Mesh | undefined;
    let startZ = minZ;
    if (backPlat) {
      startZ = backPlat.position.z + (backPlat.geometry as THREE.BoxGeometry).parameters.depth / 2;
    }
    const effectiveRun = Math.max(maxZ - startZ, 0.1);
    const centerZ = startZ + effectiveRun / 2;

    const dir = wallMesh.name === 'Left Wall' ? +1 : -1;

    const topPart = {
      name: `Counter_${wallMesh.name.replace(' ', '')}`,
      dimensions: {
        width: defaultProtrusion,
        height: countertopThickness,
        depth: effectiveRun,
      },
      position: {
        x: wallMesh.position.x + dir * (wallW / 2 + defaultProtrusion / 2),
        y: platformHeight + countertopThickness / 2,
        z: centerZ,
      },
      material: counterMaterial,
    };
    const topMesh = createMeshObject(topPart);

    platformGroup.add(topMesh);

    addedMeshes.push({
      name: topPart.name,
      width: metersToMM(topPart.dimensions.width),
      height: metersToMM(topPart.dimensions.height),
      depth: metersToMM(topPart.dimensions.depth),
      position: {
        x: metersToMM(topPart.position.x),
        y: metersToMM(topPart.position.y),
        z: metersToMM(topPart.position.z),
      },
      data: {
        rotation: topMesh.rotation,
        wall: wallMesh?.name || '',
      },
    });
  } else {
    return [];
  }

  scene.add(platformGroup);
  store.dispatch(setobjectSelected(null));
  store.dispatch(setSelectedChildObject(null));
  store.dispatch(setHoverdMesh(null));
  removeExistingLines();
  return { addedMeshes, platformGroup };
};

export const addVerticalPlanksToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: SelectedCabinetItem | null = null
) => {
  showFullScreenLoader('Adding vertical planks.');
  if (!boxMesh || count <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);

  const span = width;
  const innerSpan = span - 2 * edgeClearance;

  if (innerSpan <= thickness) return;

  let parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const interval = innerSpan / (count + 1);

  // No platform logic → full height used
  const effectiveHeight = height;

  // Common material
  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: '/textures/light_wood.jpg',
    repeatX: 2,
    repeatY: 1,
  };

  for (let i = 1; i <= count; i++) {
    const dims = {
      width: thickness,
      height: effectiveHeight,
      depth,
    };

    // simpler position (removed platform/wall offsets)
    const worldPos = new THREE.Vector3(-width / 2 + edgeClearance + interval * i, 0, 0);

    const parentWorldPos = boxMesh.localToWorld(worldPos.clone());
    const localPos = parent.worldToLocal(parentWorldPos);

    // Create plank
    const meshBuilder = new MeshBuilder({
      id: crypto.randomUUID(),
      name: `VERTICAL_PLANK_${i}`,
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: parent.userData.objectId,
      dimensions: dims,
      position: localPos,
      rotation: { x: 0, y: 0, z: 0 },
      material: commonMaterial,
      isMain: false,
    });

    const plank = meshBuilder.createMesh();

    plank.userData.isVerticalPlank = true;
    plank.userData.cabinetItem = selectedCabinetItem;
    plank.userData.dimensions = convertDimensionsToMM(dims);

    parent.add(plank);

    const plankDimsMM = plank.userData.dimensions;
    const plankPosMM = convertPositionToMM(plank.position);

    if (plank.userData.objectId) {
      const objInStore = store
        .getState()
        .data.objects.find((o) => o.id === plank.userData.objectId);

      if (objInStore) {
        store.dispatch(
          updateObject({
            ...objInStore,
            apiData: plank.userData.apiData,
            width: plankDimsMM.width,
            height: plankDimsMM.height,
            depth: plankDimsMM.depth,
            position: plankPosMM,
          })
        );
      }
    }
  }

  generateCompartmentsFromMesh(parent);
  hideFullScreenLoader();
};

export const addHorizontalPlanksInsideBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: SelectedCabinetItem | null = null
) => {
  showFullScreenLoader('Loading design objects.');
  if (!boxMesh || count <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const innerHeight = height;

  if (innerHeight <= thickness) return;

  const interval = innerHeight / (count + 1);

  // Parent (same logic as before)
  let parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const localCenter = parent.worldToLocal(center.clone());

  // Common texture
  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: '/textures/light_wood.jpg',
    repeatX: 2,
    repeatY: 1,
  };

  // Store compartment config (but now without platform/wall logic)
  parent.userData.compartmentConfig = {
    isHorizontal: true,
    boundsMin: -innerHeight / 2,
    boundsMax: innerHeight / 2,
    perpSizeX: width,
    perpSizeZ: depth,
    centerX: localCenter.x,
    centerZ: localCenter.z,
    thickness: thickness,
    groupName: boxMesh.name,
    divisionAxis: 'y',
    localCenter: { x: localCenter.x, y: localCenter.y, z: localCenter.z },
    span: height,
    perpDims: { x: width, z: depth },
    suffix: boxMesh.name,
  };

  // Create shelves
  for (let i = 1; i <= count; i++) {
    const yLocal = -innerHeight / 2 + interval * i;

    const dims = {
      width: width,
      height: thickness,
      depth: depth,
    };

    const worldPos = center.clone();
    worldPos.y += yLocal;

    const meshBuilder = new MeshBuilder({
      id: crypto.randomUUID(),
      name: `HORIZONTAL_PLANK_${i}`,
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: dims,
      position: parent.worldToLocal(worldPos),
      rotation: { x: 0, y: 0, z: 0 },
      material: commonMaterial,
      isMain: false,
    });

    const shelf = meshBuilder.createMesh();
    shelf.userData.isHorizontalPlank = true;
    shelf.userData.cabinetItem = selectedCabinetItem;
    shelf.userData.dimensions = convertDimensionsToMM(dims);

    parent.add(shelf);

    // Sync store object
    if (shelf.userData.objectId) {
      const objInStore = store
        .getState()
        .data.objects.find((o) => o.id === shelf.userData.objectId);

      if (objInStore) {
        const dimsMM = shelf.userData.dimensions;
        const rules = shelf.userData?.apiData?.rules;

        store.dispatch(
          updateObject({
            ...objInStore,
            apiData: shelf.userData.apiData,
            rules,
            ...(dimsMM && {
              width: dimsMM.width,
              height: dimsMM.height,
              depth: dimsMM.depth,
            }),
            position: convertPositionToMM(shelf.position),
          })
        );
      }
    }
  }

  generateCompartmentsFromMesh(parent);
  hideFullScreenLoader();
};

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  selectedCabinetItem: SelectedCabinetItem | null = null
) => {
  showFullScreenLoader('Loading design objects.');

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const worldCenter = new THREE.Vector3();
  bbox.getCenter(worldCenter);

  const w = size.x;
  const h = size.y;
  const d = size.z;

  // Parent detection
  let parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  // Load door texture
  const doorTexture = new THREE.TextureLoader().load('/Texture0004.jpg');
  doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
  doorTexture.repeat.set(2, 1);

  const doorMatProps = { map: doorTexture, side: THREE.DoubleSide };

  // ALWAYS front-facing door (no side logic)
  const facePart = {
    name: `Door_for_${boxMesh.name}`,
    dimensions: { width: w, height: h, depth: 0.02 },
    position: { x: 0, y: 0, z: 0 },
    material: doorMatProps,
  };

  const face = createMeshObject(facePart, true, { openDirection: 'right' });

  // Create door group
  const doorGroup = new THREE.Group();
  doorGroup.name = `DoorGroup_for_${boxMesh.name}`;
  doorGroup.userData = {
    type: 'DOOR',
    upward: false,
    cabinetItem: selectedCabinetItem,
    dimensions: convertDimensionsToMM(facePart.dimensions),
  };

  parent.add(doorGroup);

  // Place face on the **front Z** of the box
  const worldFacePos = worldCenter.clone();
  worldFacePos.z += d / 2; // always front

  parent.add(face);
  face.position.copy(parent.worldToLocal(worldFacePos));

  doorGroup.userData.openDirection = 'right';
  doorGroup.attach(face);

  // Store update
  if (doorGroup.userData.objectId) {
    const objInStore = store
      .getState()
      .data.objects.find((o) => o.id === doorGroup.userData.objectId);

    if (objInStore) {
      const dims = doorGroup.userData?.dimensions;
      const rules = doorGroup.userData?.apiData?.rules;

      store.dispatch(
        updateObject({
          ...objInStore,
          apiData: doorGroup.userData.apiData,
          rules,
          ...(dims && {
            width: dims.width,
            height: dims.height,
            depth: dims.depth,
          }),
          position: convertPositionToMM(doorGroup.position),
        })
      );
    }
  }

  // Load handle model
  await ensureHandleLoaded();
  if (cachedHandleModel) {
    const handle = cachedHandleModel.clone(true);

    // Compute handle position
    const doorBox = new THREE.Box3().setFromObject(face);
    const doorSize = new THREE.Vector3();
    doorBox.getSize(doorSize);
    const doorCenter = new THREE.Vector3();
    doorBox.getCenter(doorCenter);

    const marginX = 0.04;
    const offsetZ = doorSize.z / 2 + toAvoidOverlap;

    // Always handle on right side front
    const worldHandlePos = new THREE.Vector3(
      doorCenter.x - doorSize.x / 2 + marginX,
      doorCenter.y,
      doorCenter.z + offsetZ
    );

    handle.rotation.set(0, Math.PI / 2, 0); // always front-facing handle

    handle.name = `DoorHandle_for_${boxMesh.name}`;
    parent.add(handle);
    handle.position.copy(parent.worldToLocal(worldHandlePos));

    doorGroup.attach(handle);
  }

  hideFullScreenLoader();
};

export const addDrawersOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  drawers: number
) => {
  if (drawers <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const w = size.x;
  const h = size.y;
  const d = size.z;

  const eachH = h / drawers;
  const thickness = 0.018;
  const drawerType = 'fivePlank';

  await ensureHandleLoaded();

  // Materials
  const texLoader = new THREE.TextureLoader();
  const drawerTexture = texLoader.load('/Texture0004.jpg');
  drawerTexture.wrapS = drawerTexture.wrapT = THREE.RepeatWrapping;
  drawerTexture.repeat.set(2, 1);

  const drawerMatProps = { map: drawerTexture, side: THREE.DoubleSide };
  const sideMatProps = { color: 0xd9c7b8, roughness: 0.7 };
  const railMatProps = { color: 0x999999, metalness: 0.6, roughness: 0.3 };

  for (let i = 0; i < drawers; i++) {
    const yCenter = center.y - h / 2 + eachH * (i + 0.5);

    // Drawer group
    const drawerDimensions = {
      width: w - 0.01,
      height: eachH - 0.005,
      depth: 0.02,
    };

    const drawerGroup = new THREE.Group();
    drawerGroup.name = `Drawer_${i}_for_${boxMesh.name}`;
    drawerGroup.userData = {
      type: 'DRAWER',
      dimensions: convertDimensionsToMM(drawerDimensions),
    };
    scene.add(drawerGroup);

    // Face (always front-facing)
    const facePart = {
      name: 'DRAWER_FACE',
      dimensions: drawerDimensions,
      position: {
        x: center.x,
        y: yCenter,
        z: center.z + d / 2 + 0.01,
      },
      material: drawerMatProps,
    };

    const face = createMeshObject(facePart);
    scene.add(face);
    drawerGroup.attach(face);

    if (cachedHandleModel) {
      const handle = cachedHandleModel.clone(true);

      handle.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      handle.rotation.set(0, 0, 0);
      handle.rotation.z = Math.PI / 2;
      handle.rotation.x = -Math.PI / 2;

      handle.updateMatrixWorld(true);
      const hbox = new THREE.Box3().setFromObject(handle);

      const baseOffset = hbox.min.z;

      const frontZ = face.position.z;
      const doorFrontZ = frontZ + thickness / 2;

      handle.position.set(
        face.position.x,
        face.position.y,
        doorFrontZ - baseOffset + EPSILON_OFFSET
      );

      handle.name = `Handle_Drawer_${i}_for_${boxMesh.name}`;
      scene.add(handle);
      drawerGroup.attach(handle);
    }

    if (drawerType === 'fivePlank') {
      const innerW = Math.max(w - 2 * thickness - 0.02, 0.1);
      const innerD = Math.max(d - 0.06, 0.2);
      const innerH = Math.max(eachH - 0.06, 0.12);
      const baseY = yCenter;

      const leftPart = {
        name: 'LEFT_DRAWER_PLANK',
        dimensions: { width: thickness, height: innerH, depth: innerD },
        position: { x: center.x - innerW / 2, y: baseY, z: center.z },
        material: sideMatProps,
      };
      const leftSide = createMeshObject(leftPart);
      scene.add(leftSide);
      drawerGroup.attach(leftSide);

      const rightPart = {
        name: 'RIGHT_DRAWER_PLANK',
        dimensions: { width: thickness, height: innerH, depth: innerD },
        position: { x: center.x + innerW / 2, y: baseY, z: center.z },
        material: sideMatProps,
      };
      const rightSide = createMeshObject(rightPart);
      scene.add(rightSide);
      drawerGroup.attach(rightSide);

      const backPart = {
        name: 'BACK_DRAWER_PLANK',
        dimensions: { width: innerW, height: innerH, depth: thickness },
        position: { x: center.x, y: baseY, z: center.z - innerD / 2 },
        material: sideMatProps,
      };
      const back = createMeshObject(backPart);
      scene.add(back);
      drawerGroup.attach(back);

      const frontInnerPart = {
        name: 'FRONT_DRAWER_PLANK',
        dimensions: { width: innerW, height: innerH, depth: thickness },
        position: {
          x: center.x,
          y: baseY,
          z: center.z + innerD / 2 - thickness,
        },
        material: sideMatProps,
      };
      const frontInner = createMeshObject(frontInnerPart);
      scene.add(frontInner);
      drawerGroup.attach(frontInner);

      const bottomPart = {
        name: 'BOTTOM_DRAWER_PLANK',
        dimensions: { width: innerW, height: thickness, depth: innerD },
        position: {
          x: center.x,
          y: baseY - innerH / 2 + thickness / 2,
          z: center.z,
        },
        material: sideMatProps,
      };
      const bottom = createMeshObject(bottomPart);
      scene.add(bottom);
      drawerGroup.attach(bottom);
    }

    const railH = 0.02;
    const railT = 0.005;
    const railLen = Math.max(d - 0.06, 0.2);

    const leftRailPart = {
      name: `DrawerRail_L_${i}_for_${boxMesh.name}`,
      dimensions: { width: railT, height: railH, depth: railLen },
      position: {
        x: center.x - w / 2 + railT / 2 + 0.01,
        y: yCenter,
        z: center.z,
      },
      material: railMatProps,
    };
    const leftRail = createMeshObject(leftRailPart);
    scene.add(leftRail);
    drawerGroup.attach(leftRail);

    const rightRailPart = {
      name: `DrawerRail_R_${i}_for_${boxMesh.name}`,
      dimensions: { width: railT, height: railH, depth: railLen },
      position: {
        x: center.x + w / 2 - railT / 2 - 0.01,
        y: yCenter,
        z: center.z,
      },
      material: railMatProps,
    };
    const rightRail = createMeshObject(rightRailPart);
    scene.add(rightRail);
    drawerGroup.attach(rightRail);

    const ruleParts: RulePart[] = [];

    drawerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.geometry?.parameters) return;

        const formattedName = child.name
          .replace(/_/g, ' ')
          .trim()
          .toLowerCase()
          .replace(/plank/g, 'panel')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const geom = child.geometry.parameters;

        ruleParts.push({
          id: '',
          name: formattedName,
          width: metersToMM(geom.width || 0),
          height: metersToMM(geom.height || 0),
          depth: metersToMM(geom.depth || 0),
          thickness: null,
          position: {
            x: metersToMM(child.position.x),
            y: metersToMM(child.position.y),
            z: metersToMM(child.position.z),
          },
          handle_position: child.name.toLowerCase().includes('handle')
            ? {
                x: metersToMM(child.position.x),
                y: metersToMM(child.position.y),
                z: metersToMM(child.position.z),
              }
            : null,
          additional_data: {
            texture: formattedName.includes('Face')
              ? '/Texture0004.jpg'
              : '/textures/light_wood.jpg',
          },
        });
      }
    });

    if (drawerGroup.userData.objectId) {
      const obj = store.getState().data.objects.find((o) => o.id === drawerGroup.userData.objectId);

      if (obj) {
        const dims = drawerGroup.userData?.dimensions;
        const rules = drawerGroup.userData?.apiData?.rules;

        store.dispatch(
          updateObject({
            ...obj,
            apiData: drawerGroup.userData.apiData,
            rules,
            ...(dims && {
              width: dims.width,
              height: dims.height,
              depth: dims.depth,
            }),
            position: convertPositionToMM(drawerGroup.position),
          })
        );
      }
    }
  }
};

export const ensureHandleLoaded = async () => {
  if (cachedHandleModel) return;
  cachedHandleModel = await GLBLoader('/glb/door_handle.glb', 'DoorHandleGLB', {
    width: 0.02,
    height: 0.03,
    depth: 0.1,
  });
};

function createTextSprite(label: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 1024;
  canvas.height = 256;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 160px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.24, 0.06, 1);

  return sprite;
}

function addTick(group: THREE.Group, point: THREE.Vector3, direction: THREE.Vector3, size = 0.02) {
  const point1 = point.clone().addScaledVector(direction, size / 2);
  const point2 = point.clone().addScaledVector(direction, -size / 2);
  const geo = new THREE.BufferGeometry().setFromPoints([point1, point2]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x222222,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
}

function getAABB(obj: THREE.Object3D): THREE.Box3 {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  box.setFromObject(obj);
  return box;
}

function getBoxCenter(box: THREE.Box3): THREE.Vector3 {
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

function getBoxSize(box: THREE.Box3): THREE.Vector3 {
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}
function isWallObject(obj: THREE.Object3D): boolean {
  const name = (obj.name || '').toLowerCase();
  return name.includes('wall') || name.includes('cwall');
}
function isPlankObject(obj: THREE.Object3D): boolean {
  const name = (obj.name || '').toLowerCase();
  return (
    name.includes('plank') || name.includes('vertical_plank') || name.includes('horizontal_plank')
  );
}
function isSideWallPlank(mesh: THREE.Mesh, box: THREE.Box3): boolean {
  const center = getBoxCenter(box);
  const name = mesh.name.toLowerCase();
  return (
    name.includes('platform_leftwall') ||
    name.includes('platform_rightwall') ||
    mesh.userData?.isSideWall === true ||
    Math.abs(center.x) > 0.5
  );
}

// Geometry analyz
function analyzePlankGeometry(mesh: THREE.Mesh, box: THREE.Box3) {
  const params = (mesh.geometry as THREE.BoxGeometry).parameters || {};
  const size = getBoxSize(box);

  const width = params.width ?? size.x;
  const height = params.height ?? size.y;
  const depth = params.depth ?? size.z;

  const isHorizontal = height < width && height < depth;
  const isThinX = width <= depth && !isHorizontal;
  const isThinZ = depth < width && !isHorizontal;

  return { width, height, depth, isHorizontal, isThinX, isThinZ };
}

// Dimension line creation
function createDimensionLine(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  viewOffsetDir: THREE.Vector3,
  label: string,
  meta: DimensionMeta | null = null
) {
  const offset = 0.03;
  const startOffset = start.clone().addScaledVector(viewOffsetDir, offset);
  const endOffset = end.clone().addScaledVector(viewOffsetDir, offset);

  // Main dimension line
  const geo = new THREE.BufferGeometry().setFromPoints([startOffset, endOffset]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x111111,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);

  // Extension ticks
  const axis = endOffset.clone().sub(startOffset).normalize();
  const tickDir = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0));
  if (tickDir.lengthSq() < 1e-6) tickDir.set(1, 0, 0);
  tickDir.normalize();

  addTick(group, startOffset, tickDir);
  addTick(group, endOffset, tickDir);

  // Label
  const mid = startOffset.clone().lerp(endOffset, 0.5);
  const sprite = createTextSprite(label);
  sprite.name = DIM_LABEL_PREFIX + (meta?.side || '') + '_' + (meta?.axis || '');
  if (meta) sprite.userData.dimMeta = meta;
  sprite.position.copy(mid);
  group.add(sprite);

  return sprite;
}

// Overlap checking
function overlapsOnAxes(a: THREE.Box3, b: THREE.Box3, axes: Array<'x' | 'y' | 'z'>): boolean {
  for (const axis of axes) {
    if (axis === 'x' && (a.max.x <= b.min.x + EPS || a.min.x >= b.max.x - EPS)) return false;
    if (axis === 'y' && (a.max.y <= b.min.y + EPS || a.min.y >= b.max.y - EPS)) return false;
    if (axis === 'z' && (a.max.z <= b.min.z + EPS || a.min.z >= b.max.z - EPS)) return false;
  }
  return true;
}

function findNearestReferences(
  scene: THREE.Scene,
  self: THREE.Object3D,
  selfBox: THREE.Box3,
  axis: 'x' | 'y' | 'z',
  overlapAxes: Array<'x' | 'y' | 'z'>
) {
  scene.updateMatrixWorld(true);

  let minPlankPos: number | null = null;
  let maxPlankPos: number | null = null;
  let minBox: THREE.Box3 | null = null;
  let maxBox: THREE.Box3 | null = null;
  let minWallPos: number | null = null;
  let maxWallPos: number | null = null;
  let minSkirtingPos: number | null = null;
  let maxSkirtingPos: number | null = null;

  const selfMin = selfBox.min[axis];
  const selfMax = selfBox.max[axis];

  scene.traverse((obj) => {
    if (obj === self || !(obj instanceof THREE.Mesh)) return;

    const box = getAABB(obj);
    const isWall = isWallObject(obj);
    const isPlank = isPlankObject(obj);
    const isSkirting = (obj.name || '').toLowerCase().includes('skirting');

    if (!overlapsOnAxes(selfBox, box, overlapAxes)) return;

    // Check negative direction
    if (box.max[axis] <= selfMin - EPS) {
      if (isPlank) {
        if (minPlankPos === null || box.max[axis] > minPlankPos) {
          minPlankPos = box.max[axis];
          minBox = box;
        }
      } else if (isSkirting) {
        if (minSkirtingPos === null || box.max[axis] > minSkirtingPos) {
          minSkirtingPos = box.max[axis];
        }
      } else if (isWall) {
        if (minWallPos === null || box.max[axis] > minWallPos) {
          minWallPos = box.max[axis];
        }
      }
    }

    // Check positive direction
    if (box.min[axis] >= selfMax + EPS) {
      if (isPlank) {
        if (maxPlankPos === null || box.min[axis] < maxPlankPos) {
          maxPlankPos = box.min[axis];
          maxBox = box;
        }
      } else if (isSkirting) {
        if (maxSkirtingPos === null || box.min[axis] < maxSkirtingPos) {
          maxSkirtingPos = box.min[axis];
        }
      } else if (isWall) {
        if (maxWallPos === null || box.min[axis] < maxWallPos) {
          maxWallPos = box.min[axis];
        }
      }
    }
  });

  return {
    minPos: minPlankPos ?? minSkirtingPos ?? minWallPos,
    maxPos: maxPlankPos ?? maxSkirtingPos ?? maxWallPos,
    minBox: minPlankPos !== null ? minBox : null,
    maxBox: maxPlankPos !== null ? maxBox : null,
  };
}
function createDimensionForAxis({
  group,
  mesh,
  box,
  scene,
  mainAxis,
  secondaryAxes,
  offsetDirFn,
}: {
  group: THREE.Group;
  mesh: THREE.Mesh;
  box: THREE.Box3;
  scene: THREE.Scene;
  mainAxis: 'x' | 'y' | 'z';
  secondaryAxes: Array<'x' | 'y' | 'z'>;
  offsetDirFn: { (mesh: THREE.Mesh, box: THREE.Box3): THREE.Vector3 };
}): void {
  const { minPos, maxPos } = findNearestReferences(scene, mesh, box, mainAxis, secondaryAxes);

  const offsetDir = offsetDirFn(mesh, box);

  const getAxisCoord = (axis: 'x' | 'y' | 'z') =>
    axis === mainAxis ? null : (box.min[axis] + box.max[axis]) / 2;

  const fixedX = getAxisCoord('x');
  const fixedY = getAxisCoord('y');
  const fixedZ = getAxisCoord('z');

  // min side
  if (minPos !== null) {
    const unit = getActiveUnit();
    const distanceM = Math.abs(box.min[mainAxis] - minPos);
    const dist = metersToUnit(distanceM, unit);
    const point1 = new THREE.Vector3(fixedX ?? minPos, fixedY ?? minPos, fixedZ ?? minPos);
    const point2 = new THREE.Vector3(
      fixedX ?? box.min[mainAxis],
      fixedY ?? box.min[mainAxis],
      fixedZ ?? box.min[mainAxis]
    );
    createDimensionLine(
      group,
      point1,
      point2,
      offsetDir,
      `${dist.toFixed(1)} ${unitSuffix(unit)}`,
      { axis: mainAxis, side: 'min', ref: minPos, targetUuid: mesh.uuid }
    );
  }

  // max side
  if (maxPos !== null) {
    const unit = getActiveUnit();
    const distanceM = Math.abs(maxPos - box.max[mainAxis]);
    const dist = metersToUnit(distanceM, unit);
    const point1 = new THREE.Vector3(
      fixedX ?? box.max[mainAxis],
      fixedY ?? box.max[mainAxis],
      fixedZ ?? box.max[mainAxis]
    );
    const point2 = new THREE.Vector3(fixedX ?? maxPos, fixedY ?? maxPos, fixedZ ?? maxPos);
    createDimensionLine(
      group,
      point1,
      point2,
      offsetDir,
      `${dist.toFixed(1)} ${unitSuffix(unit)}`,
      { axis: mainAxis, side: 'max', ref: maxPos, targetUuid: mesh.uuid }
    );
  }
}
function createHorizontalDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'y',
    secondaryAxes: ['x', 'z'],
    offsetDirFn: () => new THREE.Vector3(1, 0, 0),
  });
}
function createVerticalXDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'x',
    secondaryAxes: ['y', 'z'],
    offsetDirFn: () => new THREE.Vector3(0, 1, 0),
  });
}
function createVerticalZDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'z',
    secondaryAxes: ['x', 'y'],
    offsetDirFn: (mesh: THREE.Mesh, box: THREE.Box3) => {
      const isSideWall = isSideWallPlank(mesh, box);
      return isSideWall
        ? new THREE.Vector3(mesh.position.x < 0 ? -1 : 1, 0, 0)
        : new THREE.Vector3(0, 0, 1);
    },
  });
}
// Cleanup functions
function disposeObjectResources(obj: THREE.Object3D) {
  obj.traverse((node: THREE.Object3D) => {
    if (node instanceof THREE.Mesh) {
      if (node.geometry) node.geometry.dispose?.();
    }
  });
}

export function clearPlankDimensions(scene: THREE.Scene, mesh: THREE.Object3D) {
  const name = DIMENSION_GROUP_PREFIX + mesh.uuid;
  const existing = scene.getObjectByName(name) as THREE.Group | null;
  if (existing) {
    scene.remove(existing);
    disposeObjectResources(existing);
  }
}

export function clearAllPlankDimensions(scene: THREE.Scene) {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name && obj.name.startsWith(DIMENSION_GROUP_PREFIX)) {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((group) => {
    scene.remove(group);
    disposeObjectResources(group);
  });
}

// Main dimension display function
export function showPlankDimensions(scene: THREE.Scene, mesh: THREE.Mesh) {
  clearPlankDimensions(scene, mesh);

  const group = new THREE.Group();
  group.name = DIMENSION_GROUP_PREFIX + mesh.uuid;

  const box = getAABB(mesh);
  const geometryInfo = analyzePlankGeometry(mesh, box);

  if (geometryInfo.isHorizontal) {
    createHorizontalDimensions(group, mesh, box, scene);
  } else if (geometryInfo.isThinX) {
    createVerticalXDimensions(group, mesh, box, scene);
  } else if (geometryInfo.isThinZ) {
    createVerticalZDimensions(group, mesh, box, scene);
  }

  if (group.children.length > 0) {
    scene.add(group);
  }
}
function calculateDistance(box: THREE.Box3, meta: DimensionMeta): number {
  const { axis, side, ref } = meta;

  if (axis === 'x') {
    return side === 'min' ? box.min.x - ref : ref - box.max.x;
  } else if (axis === 'y') {
    return side === 'min' ? box.min.y - ref : ref - box.max.y;
  } else {
    return side === 'min' ? box.min.z - ref : ref - box.max.z;
  }
}

function getCurrentFacePosition(box: THREE.Box3, meta: DimensionMeta): number {
  const { axis, side } = meta;

  if (axis === 'x') return side === 'min' ? box.min.x : box.max.x;
  if (axis === 'y') return side === 'min' ? box.min.y : box.max.y;
  return side === 'min' ? box.min.z : box.max.z;
}

function applyPositionDelta(target: THREE.Object3D, axis: string, delta: number) {
  if (axis === 'x') target.position.x += delta;
  else if (axis === 'y') target.position.y += delta;
  else target.position.z += delta;
}

export function enablePlankDimensionEditing(view: ThreeDView) {
  const onClick = (event: MouseEvent) => {
    const rect = view.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, view.camera);

    const sprites: THREE.Object3D[] = [];
    view.scene.traverse((obj) => {
      if (obj instanceof THREE.Sprite && obj.name.startsWith(DIM_LABEL_PREFIX)) {
        sprites.push(obj);
      }
    });

    const hits = ray.intersectObjects(sprites, true);
    if (!hits.length) return;

    const sprite = hits[0].object;
    const meta = sprite.userData?.dimMeta;
    if (!meta) return;

    const target = view.scene.getObjectByProperty('uuid', meta.targetUuid) as THREE.Mesh | null;
    if (!target) return;

    const box = getAABB(target);
    const currentDistanceM = calculateDistance(box, meta);
    const unit = getActiveUnit();
    const currentInUnit = Math.max(0, metersToUnit(currentDistanceM, unit));

    const input = prompt(`Enter new distance (${unitSuffix(unit)}):`, currentInUnit.toFixed(1));
    if (!input) return;
    const newVal = parseFloat(input);
    if (!Number.isFinite(newVal) || newVal < 0) return;

    const newM = unitToMeters(newVal, unit);
    const desiredFace = meta.ref + (meta.side === 'min' ? newM : -newM);
    const currentFace = getCurrentFacePosition(box, meta);
    const delta = desiredFace - currentFace;

    applyPositionDelta(target, meta.axis, delta);
    showPlankDimensions(view.scene, target);
    generateCompartmentsFromMesh(target.parent as THREE.Mesh);
    view.renderer.render(view.scene, view.camera);
  };

  view.renderer.domElement.addEventListener('dblclick', onClick);
}
