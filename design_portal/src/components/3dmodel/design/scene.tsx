import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../handler/items';
import { GLBLoader } from '../helper/glbLoader';
import { Dimensions } from '../interface';
import {
  DIRECTION_TYPES,
  GEOMETRY,
  MATERIAL_TYPE,
  MeshObjectData,
  PART_TYPES,
  TEXTURES,
} from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { SelectedCabinetItem } from '../toolbar/interface';

let cachedHandleModel: THREE.Object3D | null = null;

// Constants
const EPSILON_OFFSET = 0.001; // Small offset to avoid Z-fighting

const convertDimensionsToMM = (dimensions: { width: number; height: number; depth: number }) => ({
  width: Math.round(dimensions.width * 1000),
  height: Math.round(dimensions.height * 1000),
  depth: Math.round(dimensions.depth * 1000),
});

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

const meshBuilder = (data: MeshObjectData) => {
  const builder = new MeshBuilder(data);
  return builder.createMesh();
};

export const addVerticalPlanksToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: SelectedCabinetItem | null = null
) => {
  console.log('selectedCabinetItem', selectedCabinetItem);
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

  const thickness = 18;
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
    value: TEXTURES.LIGHT_WOOD,
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

    const plank = meshBuilder({
      id: crypto.randomUUID(),
      name: `VERTICAL_PLANK`,
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: parent.userData.objectId,
      dimensions: dims,
      position: localPosInParent,
      rotation: { x: 0, y: 0, z: 0 },
      material: commonMaterial,
      isMain: false,
    });

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

  const thickness = 18;
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
    value: TEXTURES.LIGHT_WOOD,
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

    const shelf = meshBuilder({
      id: crypto.randomUUID(),
      name: `HORIZONTAL_PLANK`,
      type: PART_TYPES.PLANK,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: parent.userData.objectId, // Link to parent cupboard
      dimensions: dims,
      position: parentLocalPos,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: commonMaterial,
      isMain: false,
    });
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

  const doorTexture = new THREE.TextureLoader().load(TEXTURES.WHITE_TEXTURE);
  doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
  doorTexture.repeat.set(2, 1);

  const doorMatProps = { map: doorTexture, side: THREE.DoubleSide };

  const facePart = {
    name: `Door_for_${boxMesh.name}`,
    dimensions: { width: w, height: h, depth: 18 },
    position: { x: 0, y: 0, z: 0 },
    material: doorMatProps,
  };

  const commonMaterial = {
    type: MATERIAL_TYPE.TEXTURE,
    value: TEXTURES.WHITE_TEXTURE,
    repeatX: 2,
    repeatY: 1,
  };

  const doorId = crypto.randomUUID();

  const doorGroup = meshBuilder({
    id: doorId,
    name: `Door_for_${boxMesh.name}`,
    type: PART_TYPES.DOOR,
    geometryType: GEOMETRY.BOX_GEOMETRY,
    dimensions: { width: w, height: h, depth: 18 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    material: commonMaterial,
    isMain: false,
    openDirection: DIRECTION_TYPES.RIGHT,
  });

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
    const handleGroup = cachedHandleModel.clone(true);
    let handle = handleGroup;

    // Extract the first mesh found in the group to use as the handle object
    // This ensures compatibility with UpdateHandler which strictly expects THREE.Mesh
    let meshFound = false;
    handleGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && !meshFound) {
        handle = child;
        // Apply the group's scale to the mesh, as GLBLoader applies scale to the root group
        handle.scale.multiply(handleGroup.scale);
        meshFound = true;
      }
    });

    const handleId = crypto.randomUUID();

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

      handle.rotation.set(0, 0, Math.PI / 2);
      handle.name = `DoorHandle_for_${boxMesh.name}`;
      handle.userData.objectId = handleId;

      parent.add(handle);
      handle.position.copy(parentLocalHandlePos);

      doorGroup.attach(handle);

      const handleData = {
        id: handleId,
        name: handle.name,
        type: 'handle',
        parent: doorId,
        geometryType: GEOMETRY.NONE,
        dimensions: { width: 0, height: 0, depth: 0 },
        position: {
          x: handle.position.x,
          y: handle.position.y,
          z: handle.position.z,
        },
        rotation: {
          x: THREE.MathUtils.radToDeg(handle.rotation.x),
          y: THREE.MathUtils.radToDeg(handle.rotation.y),
          z: THREE.MathUtils.radToDeg(handle.rotation.z),
        },
      };

      store.dispatch(addObjects([handleData]));
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
  const thickness = 18;
  const drawerType = 'fivePlank';

  await ensureHandleLoaded();

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  for (let i = 0; i < drawers; i++) {
    const yLocal = geometryBoundingBox.min.y + eachH * (i + 0.5);

    const drawerDimensions = {
      width: w - 10,
      height: eachH - 5,
      depth: 20,
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
      geometryBoundingBox.max.z + 0.002
    );

    const worldFacePos = boxMesh.localToWorld(localFacePos.clone());
    const parentFacePos = parent.worldToLocal(worldFacePos.clone());

    const face = meshBuilder({
      id: crypto.randomUUID(),
      name: 'DRAWER_FACE',
      type: PART_TYPES.DRAWER,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: drawerDimensions,
      position: { x: parentFacePos.x, y: parentFacePos.y, z: parentFacePos.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: TEXTURES.WHITE_TEXTURE,
        repeatX: 1,
        repeatY: 1,
      },
    });

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

      const createInnerPart = (name: string, dims: Dimensions, pos: THREE.Vector3) => {
        const worldPos = boxMesh.localToWorld(pos.clone());
        const parentLocal = parent.worldToLocal(worldPos.clone());

        const part = meshBuilder({
          id: crypto.randomUUID(),
          name,
          type: PART_TYPES.DRAWER,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: dims,
          position: parentLocal,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          material: {
            type: MATERIAL_TYPE.TEXTURE,
            value: TEXTURES.LIGHT_WOOD,
          },
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
        new THREE.Vector3(boxCenterLocal.x, baseY, geometryBoundingBox.max.z - thickness - 0.004)
      );

      createInnerPart(
        'BOTTOM_DRAWER_PLANK',
        { width: innerW, height: thickness, depth: innerD },
        new THREE.Vector3(boxCenterLocal.x, baseY - innerH / 2 + thickness / 2, boxCenterLocal.z)
      );
    }

    const railH = 20;
    const railT = 5;
    const railLen = Math.max(d - 60, 200);

    const createRail = (name: string, xOffset: number) => {
      const localPos = new THREE.Vector3(xOffset, yLocal, boxCenterLocal.z);

      const worldPos = boxMesh.localToWorld(localPos.clone());
      const parentLocal = parent.worldToLocal(worldPos.clone());

      const rail = meshBuilder({
        id: crypto.randomUUID(),
        name,
        type: PART_TYPES.DRAWER,
        geometryType: GEOMETRY.BOX_GEOMETRY,
        dimensions: { width: railT, height: railH, depth: railLen },
        position: parentLocal,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: {
          type: MATERIAL_TYPE.COLOR,
          value: '#000000',
        },
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
    width: 20,
    height: 30,
    depth: 100,
  });
};
