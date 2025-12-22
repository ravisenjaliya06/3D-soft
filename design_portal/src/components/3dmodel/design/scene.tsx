import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../handler/items';
import { MoveHandler } from '../handler/moveHandlerInterface';
import { GLBLoader } from '../helper/glbLoader';
import { DesignBuilder } from '../sceneCreator/designBuilder';
import {
  DIRECTION_TYPES,
  GEOMETRY,
  MATERIAL_TYPE,
  OBJECT_TYPES,
  PART_TYPES,
} from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { store } from '../store';
import { SelectedCabinetItem } from '../toolbar/interface';
import { DimensionMeta, Part, ThreeDView } from './interface';

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

// Helper function to convert dimensions to mm
const convertDimensionsToMM = (dimensions: { width: number; height: number; depth: number }) => ({
  width: Math.round(dimensions.width * 1000),
  height: Math.round(dimensions.height * 1000),
  depth: Math.round(dimensions.depth * 1000),
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

export const addVerticalPlanksToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: SelectedCabinetItem | null = null
) => {
  showFullScreenLoader('Adding vertical planks.');
  if (!boxMesh || count <= 0) {
    hideFullScreenLoader();
    return;
  }

  const geometry = boxMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();

  if (!geometry.boundingBox) {
    hideFullScreenLoader();
    return;
  }

  const geometryBoundingBox = geometry.boundingBox;
  const size = new THREE.Vector3();
  geometryBoundingBox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);

  const span = width;
  const innerSpan = span - 2 * edgeClearance;

  if (innerSpan <= thickness) {
    hideFullScreenLoader();
    return;
  }

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const interval = innerSpan / (count + 1);

  const effectiveHeight = height;

  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: '/textures/light_wood.jpg',
    repeatX: 2,
    repeatY: 1,
  };

  const leftInnerX = geometryBoundingBox.min.x + edgeClearance;

  for (let i = 1; i <= count; i++) {
    const dims = {
      width: thickness,
      height: effectiveHeight,
      depth,
    };

    const localX = leftInnerX + interval * i;

    const localPosInBox = new THREE.Vector3(localX, 0, 0);

    const worldPos = boxMesh.localToWorld(localPosInBox.clone());
    const localPosInParent = parent.worldToLocal(worldPos.clone());

    const meshBuilder = new MeshBuilder({
      id: crypto.randomUUID(),
      name: `VERTICAL_PLANK`,
      type: PART_TYPES.PLANK,
      geometry_type: GEOMETRY.BOX_GEOMETRY,
      parent: parent.userData.objectId,
      dimensions: dims,
      position: localPosInParent,
      rotation: { x: 0, y: 0, z: 0 },
      material: commonMaterial,
      isMain: false,
    });

    const plank = meshBuilder.createMesh();

    plank.userData.isVerticalPlank = true;
    plank.userData.cabinetItem = selectedCabinetItem;
    plank.userData.dimensions = convertDimensionsToMM(dims);

    parent.add(plank);
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
  if (!boxMesh || count <= 0) {
    hideFullScreenLoader();
    return;
  }

  const geometry = boxMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();

  const geometryBoundingBox = geometry.boundingBox;
  if (!geometryBoundingBox) {
    hideFullScreenLoader();
    return;
  }

  const size = new THREE.Vector3();
  geometryBoundingBox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const innerHeight = height;

  if (innerHeight <= thickness) {
    hideFullScreenLoader();
    return;
  }

  const interval = innerHeight / (count + 1);

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: '/textures/light_wood.jpg',
    repeatX: 2,
    repeatY: 1,
  };

  for (let i = 1; i <= count; i++) {
    const yLocal = geometryBoundingBox.min.y + interval * i;

    const dims = {
      width: width,
      height: thickness,
      depth: depth,
    };

    const localPosInBox = new THREE.Vector3(boxCenterLocal.x, yLocal, boxCenterLocal.z);

    const worldPos = boxMesh.localToWorld(localPosInBox.clone());
    const parentLocalPos = parent.worldToLocal(worldPos.clone());

    const meshBuilder = new MeshBuilder({
      id: crypto.randomUUID(),
      name: `HORIZONTAL_PLANK`,
      type: PART_TYPES.PLANK,
      geometry_type: GEOMETRY.BOX_GEOMETRY,
      dimensions: dims,
      position: parentLocalPos,
      rotation: { x: 0, y: 0, z: 0 },
      material: commonMaterial,
      isMain: false,
    });

    const shelf = meshBuilder.createMesh();
    shelf.userData.isHorizontalPlank = true;
    shelf.userData.cabinetItem = selectedCabinetItem;
    shelf.userData.dimensions = convertDimensionsToMM(dims);

    parent.add(shelf);
  }

  generateCompartmentsFromMesh(parent);
  hideFullScreenLoader();
};

export const addDoorOnInvisibleBox = async (scene: THREE.Scene, boxMesh: THREE.Mesh) => {
  showFullScreenLoader('Loading design objects.');

  if (!boxMesh) {
    hideFullScreenLoader();
    return;
  }

  const geometry = boxMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  const geometryBoundingBox = geometry.boundingBox;

  if (!geometryBoundingBox) {
    hideFullScreenLoader();
    return;
  }

  const size = new THREE.Vector3();
  geometryBoundingBox.getSize(size);

  const w = size.x;
  const h = size.y;

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const doorTexture = new THREE.TextureLoader().load('/Texture0004.jpg');
  doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
  doorTexture.repeat.set(2, 1);

  const doorMatProps = { map: doorTexture, side: THREE.DoubleSide };

  const facePart = {
    name: `Door_for_${boxMesh.name}`,
    dimensions: { width: w, height: h, depth: 0.02 },
    position: { x: 0, y: 0, z: 0 },
    material: doorMatProps,
  };

  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: '/Texture0004.jpg',
    repeatX: 2,
    repeatY: 1,
  };

  const meshBuilder = new MeshBuilder({
    id: crypto.randomUUID(),
    name: `Door_for_${boxMesh.name}`,
    type: PART_TYPES.DOOR,
    geometry_type: GEOMETRY.BOX_GEOMETRY,
    dimensions: { width: w, height: h, depth: 0.02 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: commonMaterial,
    isMain: false,
    openDirection: DIRECTION_TYPES.RIGHT,
  });

  const doorGroup = meshBuilder.createMesh();

  parent.add(doorGroup);

  const localDoorPos = new THREE.Vector3(
    boxCenterLocal.x,
    boxCenterLocal.y,
    geometryBoundingBox.max.z + facePart.dimensions.depth / 2
  );

  const worldDoorPos = boxMesh.localToWorld(localDoorPos.clone());
  const parentLocalDoorPos = parent.worldToLocal(worldDoorPos.clone());

  doorGroup.position.copy(parentLocalDoorPos);

  await ensureHandleLoaded();
  if (cachedHandleModel) {
    const handle = cachedHandleModel.clone(true);

    const doorGeo = doorGroup.geometry as THREE.BufferGeometry;
    doorGeo.computeBoundingBox();
    const doorBoundingBox = doorGeo.boundingBox;

    if (doorBoundingBox) {
      const doorSize = new THREE.Vector3();
      doorBoundingBox.getSize(doorSize);

      const marginX = 0.04;

      const localHandlePos = new THREE.Vector3(
        doorBoundingBox.min.x + marginX,
        0,
        doorBoundingBox.max.z
      );

      const worldHandlePos = doorGroup.localToWorld(localHandlePos.clone());
      const parentLocalHandlePos = parent.worldToLocal(worldHandlePos.clone());

      handle.rotation.set(0, Math.PI / 2, 0);
      handle.name = `DoorHandle_for_${boxMesh.name}`;

      parent.add(handle);
      handle.position.copy(parentLocalHandlePos);

      doorGroup.attach(handle);
    }
  }

  hideFullScreenLoader();
};

export const addDrawersOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  drawers: number
) => {
  if (!boxMesh || drawers <= 0) return;

  const geometry = boxMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  const geometryBoundingBox = geometry.boundingBox;

  if (!geometryBoundingBox) return;

  const size = new THREE.Vector3();
  geometryBoundingBox.getSize(size);

  const w = size.x;
  const h = size.y;
  const d = size.z;

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const eachH = h / drawers;
  const thickness = 0.018;
  const drawerType = 'fivePlank';

  await ensureHandleLoaded();

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  // Materials
  const texLoader = new THREE.TextureLoader();
  const drawerTexture = texLoader.load('/Texture0004.jpg');
  drawerTexture.wrapS = drawerTexture.wrapT = THREE.RepeatWrapping;
  drawerTexture.repeat.set(2, 1);

  const drawerMatProps = { map: drawerTexture, side: THREE.DoubleSide };
  const sideMatProps = { color: 0xd9c7b8, roughness: 0.7 };
  const railMatProps = { color: 0x999999, metalness: 0.6, roughness: 0.3 };

  for (let i = 0; i < drawers; i++) {
    const yLocal = geometryBoundingBox.min.y + eachH * (i + 0.5);

    const drawerDimensions = {
      width: w - 0.01,
      height: eachH - 0.005,
      depth: 0.02,
    };

    const drawerGroup = new THREE.Mesh();
    drawerGroup.name = `Drawer_${i}_for_${boxMesh.name}`;
    drawerGroup.userData = {
      type: PART_TYPES.DRAWER,
      dimensions: convertDimensionsToMM(drawerDimensions),
    };
    parent.add(drawerGroup);

    const localFacePos = new THREE.Vector3(
      boxCenterLocal.x,
      yLocal,
      geometryBoundingBox.max.z - thickness
    );

    const worldFacePos = boxMesh.localToWorld(localFacePos.clone());
    const parentFacePos = parent.worldToLocal(worldFacePos.clone());

    const facePart = {
      name: 'DRAWER_FACE',
      dimensions: drawerDimensions,
      position: parentFacePos,
      material: drawerMatProps,
    };

    const face = createMeshObject(facePart);
    parent.add(face);
    drawerGroup.attach(face);

    if (cachedHandleModel) {
      const handle = cachedHandleModel.clone(true);

      handle.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

      handle.updateMatrixWorld(true);
      const hbox = new THREE.Box3().setFromObject(handle);
      const baseOffset = hbox.min.z;

      const frontZ = face.position.z + thickness / 2;

      handle.position.set(face.position.x, face.position.y, frontZ - baseOffset + EPSILON_OFFSET);

      handle.name = `Handle_Drawer_${i}_for_${boxMesh.name}`;
      parent.add(handle);
      drawerGroup.attach(handle);
    }

    if (drawerType === 'fivePlank') {
      const innerW = Math.max(w - 2 * thickness - 0.02, 0.1);
      const innerD = Math.max(d - 0.06, 0.2);
      const innerH = Math.max(eachH - 0.06, 0.12);
      const baseY = yLocal;

      const createInnerPart = (name: string, dims: any, pos: THREE.Vector3) => {
        const worldPos = boxMesh.localToWorld(pos.clone());
        const parentLocal = parent.worldToLocal(worldPos.clone());

        const part = createMeshObject({
          name,
          dimensions: dims,
          position: parentLocal,
          material: sideMatProps,
        });

        parent.add(part);
        drawerGroup.attach(part);
      };

      createInnerPart(
        'LEFT_DRAWER_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(boxCenterLocal.x - innerW / 2, baseY, boxCenterLocal.z)
      );

      createInnerPart(
        'RIGHT_DRAWER_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(boxCenterLocal.x + innerW / 2, baseY, boxCenterLocal.z)
      );

      createInnerPart(
        'BACK_DRAWER_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(boxCenterLocal.x, baseY, boxCenterLocal.z - innerD / 2)
      );

      createInnerPart(
        'FRONT_DRAWER_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(boxCenterLocal.x, baseY, boxCenterLocal.z + innerD / 2 - thickness / 2)
      );

      createInnerPart(
        'BOTTOM_DRAWER_PLANK',
        { width: innerW, height: thickness, depth: innerD },
        new THREE.Vector3(boxCenterLocal.x, baseY - innerH / 2 + thickness / 2, boxCenterLocal.z)
      );
    }

    const railH = 0.02;
    const railT = 0.005;
    const railLen = Math.max(d - 0.06, 0.2);

    const createRail = (name: string, xOffset: number) => {
      const localPos = new THREE.Vector3(xOffset, yLocal, boxCenterLocal.z);

      const worldPos = boxMesh.localToWorld(localPos.clone());
      const parentLocal = parent.worldToLocal(worldPos.clone());

      const rail = createMeshObject({
        name,
        dimensions: { width: railT, height: railH, depth: railLen },
        position: parentLocal,
        material: railMatProps,
      });

      parent.add(rail);
      drawerGroup.attach(rail);
    };

    createRail(
      `DrawerRail_L_${i}_for_${boxMesh.name}`,
      geometryBoundingBox.min.x + railT / 2 + 0.01
    );

    createRail(
      `DrawerRail_R_${i}_for_${boxMesh.name}`,
      geometryBoundingBox.max.x - railT / 2 - 0.01
    );
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
export function isPlankObject(obj: THREE.Object3D): boolean {
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

function removeOutlinesForObject(scene: THREE.Scene, target: THREE.Object3D) {
  const objectId = target.userData.objectId;
  const toRemove: THREE.Object3D[] = [];

  scene.traverse((obj) => {
    if (!obj.name) return;

    const name = obj.name.toLowerCase();
    if (
      name === `outline-${objectId}`.toLowerCase() ||
      name.includes('outline') ||
      obj.userData?.outlineFor === objectId
    ) {
      toRemove.push(obj);
    }
  });

  toRemove.forEach((o) => {
    if (o.parent) o.parent.remove(o);
    if ((o as any).geometry) (o as any).geometry.dispose?.();
    if ((o as any).material) (o as any).material.dispose?.();
  });
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
    generateCompartmentsFromMesh(target.parent as THREE.Mesh);

    // Clear selection (which removes outlines and dimensions)
    if (view.selector) {
      view.selector.deselect();
    } else {
      // Fallback if selector not available (should not happen in proper setup)
      clearAllPlankDimensions(view.scene);
      removeOutlinesForObject(view.scene, target);
    }

    view.renderer.render(view.scene, view.camera);
  };

  view.renderer.domElement.addEventListener('dblclick', onClick);
}
