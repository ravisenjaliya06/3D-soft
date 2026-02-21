import { toast } from 'react-toastify';
import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
  updateMinifixesForCupboard,
} from '../handler/items';
import { GLBLoader } from '../helper/glbLoader';
import { Dimensions } from '../interface';
import {
  DIRECTION_TYPES,
  DOUBLE_DOOR_PLANK_TYPES,
  DRAWER_PLANK_TYPES,
  DRAWER_TYPES,
  GEOMETRY,
  INVISIBLE_BOXES,
  Material,
  MATERIAL_TYPES,
  MeshObjectData,
  OBJECT_TYPES,
  PART_TYPES,
} from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { SyncManager } from '../sceneCreator/syncState';
import { LShapeObjectManager } from '../sceneCreator/tools/lShapeObjectTool';
import { store } from '../store';
import {
  removeObject,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
} from '../store/dataSlice';
import { CustomToast } from '../utils/CustomToast';

let cachedHandleModel: THREE.Object3D | null = null;

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

const meshBuilder = (data: MeshObjectData | MeshObjectData[]) => {
  const builder = new SyncManager(data);
  return builder.syncData();
};

export const addVerticalPlanksToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: MeshObjectData | null = null
) => {
  if (!selectedCabinetItem) return console.error('No cabinet item selected');

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

  const bbox = geometry.boundingBox;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 18;
  const innerDepth = 25;
  const edgeClearance = thickness;

  const innerSpan = width - 2 * edgeClearance;
  if (innerSpan <= thickness) {
    hideFullScreenLoader();
    return;
  }

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const interval = innerSpan / (count + 1);
  const leftInnerX = bbox.min.x + edgeClearance;

  const plankList: MeshObjectData[] = [];

  for (let i = 1; i <= count; i++) {
    const dims = {
      width: thickness,
      height: height,
      depth: depth - innerDepth,
    };

    const localX = leftInnerX + interval * i;
    const localPosInBox = new THREE.Vector3(localX, 0, -innerDepth / 2);

    const worldPos = boxMesh.localToWorld(localPosInBox.clone());
    const localPosInParent = parent.worldToLocal(worldPos.clone());

    plankList.push({
      ...selectedCabinetItem,
      id: crypto.randomUUID(),
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: dims,
      position: localPosInParent,
      parent: parent.userData.objectId,
    });
  }

  for (const plank of plankList) {
    await meshBuilder(plank);
  }

  generateCompartmentsFromMesh(parent);
  updateMinifixesForCupboard(parent);
  hideFullScreenLoader();
};

export const addHorizontalPlanksInsideBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: MeshObjectData | null = null
) => {
  if (!selectedCabinetItem) return console.error('No cabinet item selected');

  showFullScreenLoader('Loading design objects.');

  if (!boxMesh || count <= 0) {
    hideFullScreenLoader();
    return;
  }

  const geometry = boxMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;

  if (!bbox) {
    hideFullScreenLoader();
    return;
  }

  const size = new THREE.Vector3();
  bbox.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 18;
  const innerDepth = 25;

  if (height <= thickness) {
    hideFullScreenLoader();
    return;
  }

  const interval = height / (count + 1);

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  const boxCenterLocal = bbox.getCenter(new THREE.Vector3());

  const plankList: MeshObjectData[] = [];

  for (let i = 1; i <= count; i++) {
    const yLocal = bbox.min.y + interval * i;

    const dims = {
      width: width,
      height: thickness,
      depth: depth - innerDepth,
    };

    const localPosInBox = new THREE.Vector3(
      boxCenterLocal.x,
      yLocal,
      boxCenterLocal.z - innerDepth / 2
    );

    const worldPos = boxMesh.localToWorld(localPosInBox.clone());
    const parentLocalPos = parent.worldToLocal(worldPos.clone());

    plankList.push({
      ...selectedCabinetItem,
      id: crypto.randomUUID(),
      geometryType: GEOMETRY.BOX_GEOMETRY,
      parent: parent.userData.objectId, // Link to parent cupboard
      dimensions: dims,
      position: parentLocalPos,
    });
  }
  for (const plank of plankList) {
    await meshBuilder(plank);
  }

  generateCompartmentsFromMesh(parent);
  updateMinifixesForCupboard(parent);
  hideFullScreenLoader();
};

export const addLShapeObjectToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  selectedCabinetItem: MeshObjectData | null = null
) => {
  await LShapeObjectManager.createLShapeInBox(scene, boxMesh, selectedCabinetItem);
};

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  selectedCabinetItem: MeshObjectData | null = null
) => {
  if (!selectedCabinetItem) {
    console.error('No cabinet item selected');
    return;
  }
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

  // Check if boxMesh is a cupboard (main or otherwise, but acting as parent container)
  const isCupboard =
    boxMesh.userData.type === OBJECT_TYPES.CUPBOARD ||
    boxMesh.userData.isMain ||
    (boxMesh.parent &&
      boxMesh.parent.userData.type === OBJECT_TYPES.CUPBOARD &&
      boxMesh.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX);

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  if (isCupboard) {
    let existingDoor = false;
    parent.traverse((child) => {
      if (
        child.userData.type === PART_TYPES.DOOR ||
        child.userData.type === PART_TYPES.DOUBLE_DOOR
      ) {
        existingDoor = true;
      }
    });

    if (existingDoor) {
      hideFullScreenLoader();
      toast(({ closeToast }) => (
        <CustomToast
          appearance="error"
          message="Already have a whole cupboard door"
          closeToast={closeToast}
        />
      ));
      return;
    }
  }

  // Update matrices to ensure accurate positioning
  boxMesh.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const doorDepth = 18;

  const doorDimensions = {
    width: w,
    height: h,
    depth: doorDepth,
  };

  const localDoorPos = new THREE.Vector3(
    boxCenterLocal.x,
    boxCenterLocal.y,
    geometryBoundingBox.max.z + doorDimensions.depth / 2
  );

  const worldDoorPos = boxMesh.localToWorld(localDoorPos.clone());
  const parentLocalDoorPos = parent.worldToLocal(worldDoorPos.clone());

  // Adjust for Cupboard context vs InvisibleBox context
  let finalPosition = {
    x: parentLocalDoorPos.x,
    y: parentLocalDoorPos.y,
    z: parentLocalDoorPos.z,
  };

  if (
    boxMesh.userData.type === OBJECT_TYPES.CUPBOARD ||
    (boxMesh.userData.isMain && boxMesh.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX)
  ) {
    finalPosition = {
      x: boxCenterLocal.x,
      y: boxCenterLocal.y,
      z: geometryBoundingBox.max.z + doorDimensions.depth / 2,
    };
  }

  await meshBuilder({
    ...selectedCabinetItem,
    id: crypto.randomUUID(),
    dimensions: doorDimensions,
    position: {
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
    },
    isMain: false,
    openDirection: DIRECTION_TYPES.RIGHT,
    parent: parent.userData.objectId,
    material: [
      ...(Array.isArray(selectedCabinetItem.material)
        ? selectedCabinetItem.material
        : [selectedCabinetItem.material]
      ).filter((m): m is Material => !!m),
    ],
  });

  // await ensureHandleLoaded();
  hideFullScreenLoader();
};

export const addDoubleDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  selectedCabinetItem: MeshObjectData[] | null = null
) => {
  if (!selectedCabinetItem) {
    console.error('No cabinet item selected');
    return;
  }
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

  // Update matrices to ensure accurate positioning
  boxMesh.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);

  // Update matrices to ensure accurate positioning
  boxMesh.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const doorDepth = 18;

  const doorDimensions = {
    width: w,
    height: h,
    depth: doorDepth,
  };

  const localDoorPos = new THREE.Vector3(
    boxCenterLocal.x,
    boxCenterLocal.y,
    geometryBoundingBox.max.z + doorDimensions.depth / 2
  );

  const worldDoorPos = boxMesh.localToWorld(localDoorPos.clone());
  const parentLocalDoorPos = parent.worldToLocal(worldDoorPos.clone());

  // Adjust for Cupboard context vs InvisibleBox context
  let finalPosition = {
    x: parentLocalDoorPos.x,
    y: parentLocalDoorPos.y,
    z: parentLocalDoorPos.z,
  };

  const isCupboard =
    boxMesh.userData.type === OBJECT_TYPES.CUPBOARD ||
    boxMesh.userData.isMain ||
    (boxMesh.parent &&
      boxMesh.parent.userData.type === OBJECT_TYPES.CUPBOARD &&
      boxMesh.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX);

  if (isCupboard) {
    let existingDoor = false;
    parent.traverse((child) => {
      if (
        child.userData.type === PART_TYPES.DOOR ||
        child.userData.type === PART_TYPES.DOUBLE_DOOR
      ) {
        existingDoor = true;
      }
    });

    if (existingDoor) {
      hideFullScreenLoader();
      toast(({ closeToast }) => (
        <CustomToast
          appearance="error"
          message="Already have a whole cupboard door"
          closeToast={closeToast}
        />
      ));
      return;
    }
  }

  if (
    boxMesh.userData.type === OBJECT_TYPES.CUPBOARD ||
    (boxMesh.userData.isMain && boxMesh.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX)
  ) {
    finalPosition = {
      x: boxCenterLocal.x,
      y: boxCenterLocal.y,
      z: geometryBoundingBox.max.z + doorDimensions.depth / 2,
    };
  }

  const doubleDoorGroupId = crypto.randomUUID();

  // Create Parent Double Door Group (Container)
  const doubleDoorGroup: MeshObjectData = {
    ...selectedCabinetItem[0],
    id: doubleDoorGroupId,
    name: 'DOUBLE_DOOR',
    type: PART_TYPES.DOUBLE_DOOR,
    geometryType: GEOMETRY.BOX_GEOMETRY,
    dimensions: doorDimensions,
    position: {
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    isMain: false,
    parent: parent.userData.objectId, // Parent is the cupboard/box
    material: [], // Material handled by children usually, or passed empty
  };

  const gapMM = 2;
  const doorWidth = (doorDimensions.width - gapMM) / 2;

  // Left Door
  const leftDoor: MeshObjectData = {
    ...selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.LEFT_PLANK),
    id: crypto.randomUUID(),
    name: DOUBLE_DOOR_PLANK_TYPES.LEFT_PLANK,
    type:
      selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.LEFT_PLANK)?.type ||
      PART_TYPES.DOOR, // As per user request "type": "plank" in JSON
    geometryType: GEOMETRY.BOX_GEOMETRY,
    parent: doubleDoorGroupId,
    dimensions: { width: doorWidth, height: doorDimensions.height, depth: doorDepth },
    position: {
      x: -doorDimensions.width / 2 + doorWidth / 2, // Relative to DoubleDoor Group center
      y: 0,
      z: 0,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    isMain: false,
    openDirection: DIRECTION_TYPES.LEFT,
    material:
      selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.LEFT_PLANK)
        ?.material || [],
  };

  // Right Door
  const rightDoor: MeshObjectData = {
    ...selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.RIGHT_PLANK),
    id: crypto.randomUUID(),
    name: DOUBLE_DOOR_PLANK_TYPES.RIGHT_PLANK,
    type:
      selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.RIGHT_PLANK)?.type ||
      PART_TYPES.DOOR,
    geometryType: GEOMETRY.BOX_GEOMETRY,
    parent: doubleDoorGroupId,
    dimensions: { width: doorWidth, height: doorDimensions.height, depth: doorDepth },
    position: {
      x: doorDimensions.width / 2 - doorWidth / 2, // Relative to DoubleDoor Group center
      y: 0,
      z: 0,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    isMain: false,
    openDirection: DIRECTION_TYPES.RIGHT,
    material:
      selectedCabinetItem.find((item) => item.name === DOUBLE_DOOR_PLANK_TYPES.RIGHT_PLANK)
        ?.material || [],
  };

  // Build the group and children
  // We need to pass the array of objects to meshBuilder
  await meshBuilder([doubleDoorGroup, leftDoor, rightDoor]);

  // await ensureHandleLoaded();
  hideFullScreenLoader();
};

export const addDrawersOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  drawers: number,
  selectedCabinetItem: MeshObjectData[],
  drawerType: string = DRAWER_TYPES.INSET
) => {
  if (!boxMesh || drawers <= 0) return;

  showFullScreenLoader('Adding Drawer...');
  try {
    const geometry = boxMesh.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    const geometryBoundingBox = geometry.boundingBox;

    if (!geometryBoundingBox) return;

    const size = new THREE.Vector3();
    geometryBoundingBox.getSize(size);

    const w = size.x;
    const d = size.z;

    const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

    const thickness = 18;
    const drawerConstructionType = 'fivePlank';

    const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
      ? boxMesh
      : (boxMesh.parent as THREE.Mesh);

    // Update matrices once before calculating positions
    boxMesh.updateMatrixWorld(true);
    parent.updateMatrixWorld(true);

    // Calculate boxMesh bounding box corners in parent's local space ONCE
    const boxMinLocal = new THREE.Vector3(
      geometryBoundingBox.min.x,
      geometryBoundingBox.min.y,
      geometryBoundingBox.min.z
    );
    const boxMaxLocal = new THREE.Vector3(
      geometryBoundingBox.max.x,
      geometryBoundingBox.max.y,
      geometryBoundingBox.max.z
    );
    const boxCenterWorld = boxMesh.localToWorld(boxCenterLocal.clone());
    const boxMinWorld = boxMesh.localToWorld(boxMinLocal.clone());
    const boxMaxWorld = boxMesh.localToWorld(boxMaxLocal.clone());

    const boxCenterParent = parent.worldToLocal(boxCenterWorld.clone());
    const boxMinParent = parent.worldToLocal(boxMinWorld.clone());
    const boxMaxParent = parent.worldToLocal(boxMaxWorld.clone());

    // Calculate box dimensions in parent's local space
    const boxSizeParent = new THREE.Vector3();
    boxSizeParent.subVectors(boxMaxParent, boxMinParent);
    const wParent = Math.abs(boxSizeParent.x);
    const hParent = Math.abs(boxSizeParent.y);
    const dParent = Math.abs(boxSizeParent.z);

    // Calculate drawer height in parent space
    const eachH = hParent / drawers;

    for (let i = 0; i < drawers; i++) {
      // Calculate y position in parent's local space directly
      const yParent = boxMinParent.y + eachH * (i + 0.5);

      // Inset: fits inside. Overlay: covers front.
      const isOverlay = drawerType === DRAWER_TYPES.OVERLAY;

      // Face dimensions
      // User requested 30mm increase in width for Overlay. Height remains consistent with Inset.
      const faceW = isOverlay ? w + 30 : w - 10;
      const faceH = eachH - 5;
      const faceD = 20;

      const drawerDimensions = {
        width: w - 10,
        height: eachH - 5,
        depth: faceD,
      };

      const drawerGroupId = crypto.randomUUID();
      const drawerGroupWithAllPlank: MeshObjectData[] = [];

      // Calculate the group's position directly in parent's local space
      const parentGroupPos = new THREE.Vector3(boxCenterParent.x, yParent, boxCenterParent.z);

      const drawerGroup: MeshObjectData = {
        id: drawerGroupId,
        name: `Drawer`,
        type: PART_TYPES.DRAWER,
        geometryType: GEOMETRY.BOX_GEOMETRY,
        dimensions: drawerDimensions,
        position: { x: parentGroupPos.x, y: parentGroupPos.y, z: parentGroupPos.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        isMain: true,
        parent: parent.userData.objectId,
        openDirection: DIRECTION_TYPES.RIGHT,
        drawerType: drawerType,
        material: [
          ...(Array.isArray(selectedCabinetItem[0].material)
            ? selectedCabinetItem[0].material
            : [selectedCabinetItem[0].material]
          ).filter((m): m is Material => !!m && m.type !== MATERIAL_TYPES.PULL),
        ],
      };

      drawerGroupWithAllPlank.push(drawerGroup);

      // Calculate face position in parent's local space
      const faceZParent =
        boxCenterParent.z + (isOverlay ? dParent / 2 : dParent / 2 - faceD) + faceD / 2;
      const parentFacePos = new THREE.Vector3(boxCenterParent.x, yParent, faceZParent);

      const facePlank = selectedCabinetItem.find(
        (item) => item.name === DRAWER_PLANK_TYPES.DRAWER_FACE
      );

      // handle material for face
      const handleMaterial = (
        Array.isArray(selectedCabinetItem[0].material)
          ? selectedCabinetItem[0].material
          : [selectedCabinetItem[0].material]
      ).filter((m): m is Material => !!m && m.type === MATERIAL_TYPES.PULL);

      const face: MeshObjectData = {
        id: crypto.randomUUID(),
        name: DRAWER_PLANK_TYPES.DRAWER_FACE,
        type: DRAWER_PLANK_TYPES.DRAWER_FACE || PART_TYPES.DRAWER,
        parent: drawerGroupId,
        geometryType: GEOMETRY.BOX_GEOMETRY,
        dimensions: { width: faceW, height: faceH, depth: faceD },
        position: {
          x: parentFacePos.x - parentGroupPos.x,
          y: parentFacePos.y - parentGroupPos.y,
          z: parentFacePos.z - parentGroupPos.z,
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: [
          ...(Array.isArray(facePlank?.material)
            ? facePlank.material
            : facePlank?.material
              ? [facePlank.material]
              : []),
          ...handleMaterial,
        ],
      };

      drawerGroupWithAllPlank.push(face);

      if (drawerConstructionType === 'fivePlank') {
        const sideGap = 12; // REQUIRED 12mm spacing for standard drawer
        const drawerOuterW = w;
        const drawerOuterD = d;

        //Correct inner dimensions
        const innerW = Math.max(drawerOuterW - 2 * sideGap - 2 * thickness, 1);
        // Increase depth for overlay as it's not recessed
        const innerD = isOverlay
          ? Math.max(drawerOuterD - 40, 200)
          : Math.max(drawerOuterD - 60, 200);

        // Heights
        const innerH = Math.max(eachH - 50, 1);

        // Vertical alignment (bottom aligned) - calculate in parent's local space
        const baseYParent = yParent;
        const innerPartCenterYParent = baseYParent - (eachH - innerH) / 2;
        const boxFrontZRelParent = isOverlay ? dParent / 2 : dParent / 2 - faceD;

        const createInnerPartData = (
          name: string,
          dims: Dimensions,
          xOffset: number,
          yPos: number,
          zPos: number
        ) => {
          // Calculate position directly in parent's local space
          const partPosParent = new THREE.Vector3(
            boxCenterParent.x + xOffset,
            yPos,
            boxCenterParent.z + zPos
          );

          const part: MeshObjectData = {
            id: crypto.randomUUID(),
            name,
            type: Object.values(DRAWER_PLANK_TYPES).includes(name) ? name : PART_TYPES.DRAWER,
            parent: drawerGroupId,
            geometryType: GEOMETRY.BOX_GEOMETRY,
            dimensions: dims,
            position: {
              x: partPosParent.x - parentGroupPos.x,
              y: partPosParent.y - parentGroupPos.y,
              z: partPosParent.z - parentGroupPos.z,
            },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            material: selectedCabinetItem.find((item) => item.name === name)?.material,
          };
          drawerGroupWithAllPlank.push(part);
        };

        // LEFT plank position (12mm from left) - positions relative to box center in parent space
        createInnerPartData(
          DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK,
          { width: thickness, height: innerH, depth: innerD },
          -wParent / 2 + sideGap + thickness / 2,
          innerPartCenterYParent,
          boxFrontZRelParent - innerD / 2
        );

        // RIGHT plank position (12mm from right)
        createInnerPartData(
          DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK,
          { width: thickness, height: innerH, depth: innerD },
          wParent / 2 - sideGap - thickness / 2,
          innerPartCenterYParent,
          boxFrontZRelParent - innerD / 2
        );

        // BACK plank
        createInnerPartData(
          DRAWER_PLANK_TYPES.BACK_DRAWER_PLANK,
          { width: innerW, height: innerH, depth: thickness },
          0,
          innerPartCenterYParent,
          boxFrontZRelParent - innerD + thickness / 2
        );

        // FRONT plank
        createInnerPartData(
          DRAWER_PLANK_TYPES.FRONT_DRAWER_PLANK,
          { width: innerW, height: innerH, depth: thickness },
          0,
          innerPartCenterYParent,
          boxFrontZRelParent - thickness / 2
        );

        // BOTTOM plank
        createInnerPartData(
          DRAWER_PLANK_TYPES.BOTTOM_DRAWER_PLANK,
          { width: innerW, height: thickness, depth: innerD },
          0,
          baseYParent - eachH / 2 + thickness / 2,
          boxFrontZRelParent - innerD / 2
        );
      }

      await meshBuilder(drawerGroupWithAllPlank);

      store.dispatch(setobjectSelected(parent.userData.objectId));
      store.dispatch(setSelectedChildObject(drawerGroupId));

      // Find the drawer mesh we just created to update its own minifixes
      let createdDrawerMesh: THREE.Mesh | undefined;
      if (parent.children) {
        createdDrawerMesh = parent.children.find(
          (child) => child.userData.objectId === drawerGroupId && child instanceof THREE.Mesh
        ) as THREE.Mesh | undefined;
      }

      if (createdDrawerMesh) {
        updateMinifixesForCupboard(createdDrawerMesh);
      }
    }
    updateMinifixesForCupboard(parent);
  } finally {
    hideFullScreenLoader();
  }
};

export const updateDrawerType = (scene: THREE.Scene, drawerGroupId: string, newType: string) => {
  const findDrawerMesh = (): THREE.Object3D | null => {
    let found: THREE.Object3D | null = null;
    scene.traverse((obj) => {
      if (obj.userData.objectId === drawerGroupId) {
        found = obj;
      }
    });
    return found;
  };

  const drawerMesh = findDrawerMesh();

  if (!drawerMesh || !drawerMesh.parent) return;

  // Update minifixes for the drawer itself (its internal structure changed)
  if (drawerMesh instanceof THREE.Mesh) {
    updateMinifixesForCupboard(drawerMesh);
  }

  const parentBox = drawerMesh.parent as THREE.Mesh;
  const geometry = parentBox.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  const d = size.z;
  const thickness = 18;
  const faceD = 20;
  const isOverlay = newType === DRAWER_TYPES.OVERLAY;

  // Save drawer type
  drawerMesh.userData.drawerType = newType;

  // Redux update (drawer group only)
  const currentObjects = store.getState().data.objects;
  const drawerData = currentObjects.find((obj) => obj.id === drawerGroupId);
  if (drawerData) {
    store.dispatch(updateObject({ ...drawerData, drawerType: newType }));
  }

  // ===== INSET MODE →  =====
  if (!isOverlay) {
    // First, find the current face and handle positions BEFORE updating
    const drawerFace = drawerMesh.children.find(
      (c) => c instanceof THREE.Mesh && c.name === DRAWER_PLANK_TYPES.DRAWER_FACE
    ) as THREE.Mesh | undefined;

    let currentFaceZ = 0;
    let handleZOffsets: Map<string, number> = new Map();

    if (drawerFace) {
      currentFaceZ = drawerFace.position.z;

      // Store current handle offsets before updating face
      drawerMesh.children.forEach((child) => {
        if (child.userData.type === 'handle') {
          const handleId = child.userData.objectId;
          const zOffset = child.position.z - currentFaceZ;
          handleZOffsets.set(handleId, zOffset);
        }
      });
    }

    let insetFaceZ = 0;

    drawerMesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (child.name === DRAWER_PLANK_TYPES.DRAWER_FACE) {
        const geo = child.geometry as THREE.BoxGeometry;
        const height = geo.parameters.height;

        // Restore original INSET face size
        const originalWidth = geo.parameters.width - 30;

        const insetZ = geometry.boundingBox!.max.z - faceD / 2 - thickness;
        insetFaceZ = insetZ; // Store for handle update

        child.geometry.dispose();
        child.geometry = new THREE.BoxGeometry(originalWidth, height, faceD);

        child.position.z = insetZ;

        // Redux update (face only)
        const faceData = currentObjects.find((obj) => obj.id === child.userData.objectId);
        if (faceData) {
          store.dispatch(
            updateObject({
              ...faceData,
              dimensions: {
                ...faceData.dimensions,
                width: originalWidth,
                depth: faceD,
              },
              position: {
                ...faceData.position,
                z: insetZ,
              },
            })
          );

          // Refresh banding for the face
          const builder = new MeshBuilder(faceData, scene);
          builder.setParentMesh(drawerMesh as THREE.Mesh);
          builder.updateBanding(child, { isDimensionUpdate: true });
        }
      }
    });

    // Update handle positions using stored offsets
    drawerMesh.children.forEach((child) => {
      if (child.userData.type === 'handle') {
        const handleId = child.userData.objectId;
        const zOffset = handleZOffsets.get(handleId);

        if (zOffset !== undefined) {
          // New handle Z position: new face position + same offset
          const newHandleZ = insetFaceZ + zOffset;

          // Update handle position directly on the group
          child.position.z = newHandleZ;

          // Update Redux store
          const handleData = currentObjects.find((obj) => obj.id === handleId);
          if (handleData) {
            store.dispatch(
              updateObject({
                ...handleData,
                position: {
                  ...handleData.position,
                  z: newHandleZ,
                },
              })
            );
          }
        }
      }
    });

    return;
  }

  // ===== OVERLAY MODE → FULL RECALC =====

  // First, find the current face and handle positions BEFORE updating
  const drawerFace = drawerMesh.children.find(
    (c) => c instanceof THREE.Mesh && c.name === DRAWER_PLANK_TYPES.DRAWER_FACE
  ) as THREE.Mesh | undefined;

  let currentFaceZ = 0;
  let handleZOffsets: Map<string, number> = new Map();

  if (drawerFace) {
    currentFaceZ = drawerFace.position.z;

    // Store current handle offsets before updating face
    drawerMesh.children.forEach((child) => {
      if (child.userData.type === 'handle') {
        const handleId = child.userData.objectId;
        const zOffset = child.position.z - currentFaceZ;
        handleZOffsets.set(handleId, zOffset);
      }
    });
  }

  const innerD = d - 120;
  const innerZ = d / 2 - faceD - innerD / 2;
  const frontPlankZ = innerZ + innerD / 2 - thickness / 2;
  let newFaceZ = 0;

  drawerMesh.children.forEach((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const partName = child.name;
    const partId = child.userData.objectId;

    // Skip handles - we'll update them separately
    if (child.userData.type === 'handle') return;

    let newZ = child.position.z;
    let geo = child.geometry as THREE.BoxGeometry;
    let w = geo.parameters.width;
    let h = geo.parameters.height;
    let dep = geo.parameters.depth;

    if (partName === DRAWER_PLANK_TYPES.DRAWER_FACE) {
      w += 30;
      dep = faceD;
      newZ = frontPlankZ + thickness / 2 + faceD / 2;
      newFaceZ = newZ; // Store for handle update

      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(w, h, dep);
    } else if (
      [
        DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK,
        DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK,
        DRAWER_PLANK_TYPES.BOTTOM_DRAWER_PLANK,
      ].includes(partName)
    ) {
      dep = innerD;
      newZ = innerZ;

      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(w, h, dep);
    } else if (partName === DRAWER_PLANK_TYPES.FRONT_DRAWER_PLANK) {
      newZ = innerZ + innerD / 2 - thickness / 2;
    } else if (partName === DRAWER_PLANK_TYPES.BACK_DRAWER_PLANK) {
      newZ = innerZ - innerD / 2 + thickness / 2;
    }

    child.position.z = newZ;

    const partData = currentObjects.find((obj) => obj.id === partId);
    if (partData) {
      store.dispatch(
        updateObject({
          ...partData,
          dimensions: { ...partData.dimensions, width: w, height: h, depth: dep },
          position: { ...partData.position, z: newZ },
        })
      );

      // Refresh banding for the updated plank
      const builder = new MeshBuilder(partData, scene);
      builder.setParentMesh(drawerMesh as THREE.Mesh);
      builder.updateBanding(child, { isDimensionUpdate: true });
    }
  });

  // Update handle positions using stored offsets
  drawerMesh.children.forEach((child) => {
    if (child.userData.type === 'handle') {
      const handleId = child.userData.objectId;
      const zOffset = handleZOffsets.get(handleId);

      if (zOffset !== undefined) {
        // New handle Z position: new face position + same offset
        const newHandleZ = newFaceZ + zOffset;

        // Update handle position directly on the group
        child.position.z = newHandleZ;

        // Update Redux store
        const handleData = currentObjects.find((obj) => obj.id === handleId);
        if (handleData) {
          store.dispatch(
            updateObject({
              ...handleData,
              position: {
                ...handleData.position,
                z: newHandleZ,
              },
            })
          );
        }
      }
    }
  });

  const root: THREE.Mesh = !parentBox.parent?.userData.isMain
    ? parentBox
    : (parentBox.parent as THREE.Mesh);
  updateMinifixesForCupboard(root);
};

export const addSkirtingPlanks = (boxMesh: THREE.Mesh) => {
  if (!boxMesh) return;

  const geometry = boxMesh.geometry;
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  const { x: width, y: height, z: depth } = size;

  const thickness = 18;
  const skirtingHeight = 82;

  // Remove existing first to avoid duplicates
  removeSkirtingPlanks(boxMesh);

  // Add Back Skirting
  const backSkirtingData: MeshObjectData = {
    id: crypto.randomUUID(),
    name: 'BACK_SKIRTING_PLANK',
    type: PART_TYPES.PLANK,
    geometryType: GEOMETRY.BOX_GEOMETRY,
    parent: boxMesh.userData.objectId,
    dimensions: { width, height: skirtingHeight, depth: thickness },
    // Back is Z negative. Cupboard is centered at 0 in its local space.
    position: { x: 0, y: -height / 2 + skirtingHeight / 2, z: -depth / 2 + thickness / 2 },
    rotation: { x: 0, y: 0, z: 0 },
    material: [],
    isMain: false,
  };

  const backSkirting = new MeshBuilder(backSkirtingData);
  const back = backSkirting.createMesh();
  back.userData.isSkirting = true;
  boxMesh.add(back);

  // Add Front Skirting
  const frontSkirtingData: MeshObjectData = {
    id: crypto.randomUUID(),
    name: 'FRONT_SKIRTING_PLANK',
    type: PART_TYPES.PLANK,
    geometryType: GEOMETRY.BOX_GEOMETRY,
    parent: boxMesh.userData.objectId,
    dimensions: { width, height: skirtingHeight, depth: thickness },
    // Front is Z positive.
    position: { x: 0, y: -height / 2 + skirtingHeight / 2, z: depth / 2 - thickness / 2 },
    rotation: { x: 0, y: 0, z: 0 },
    material: [],
    isMain: false,
  };

  const frontSkirting = new MeshBuilder(frontSkirtingData);
  const front = frontSkirting.createMesh();
  front.userData.isSkirting = true;
  boxMesh.add(front);
};

export const removeSkirtingPlanks = (boxMesh: THREE.Mesh) => {
  if (!boxMesh) return;
  const toRemove: THREE.Object3D[] = [];
  boxMesh.children.forEach((child) => {
    if (child.name && child.name.includes('SKIRTING_PLANK')) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((child) => {
    const objectId = child.userData.objectId;
    if (objectId) {
      store.dispatch(removeObject(objectId));
    }
    boxMesh.remove(child);
  });
};

export const ensureHandleLoaded = async (model?: string) => {
  if (cachedHandleModel) return;
  let url = '/glb/door_model.glb';
  if (model) {
    url = `${process.env.NEXT_PUBLIC_PUBLIC_API} ` + model;
  }
  cachedHandleModel = await GLBLoader(url, 'DoorHandleGLB', {
    width: 20,
    height: 30,
    depth: 100,
  });
};

/**
 * Remove all L-shape objects from a cupboard (l-shape objects are children of cupboard)
 */
export const removeLShapeObjects = async (cupboardMesh: THREE.Mesh) => {
  await LShapeObjectManager.removeLShapeObjects(cupboardMesh);
};

/**
 * Add L-shape objects to all drawers and doors in a cupboard
 */
export const addLShapeToDrawersAndDoors = async (scene: THREE.Scene, cupboardMesh: THREE.Mesh) => {
  await LShapeObjectManager.addLShapeToDrawersAndDoors(scene, cupboardMesh);
};

/**
 * Helper function to manually update banding mesh dimensions and positions
 */
const updateBandingMeshes = (
  mesh: THREE.Mesh,
  newWidth: number,
  newHeight: number,
  newDepth: number
) => {
  mesh.children.forEach((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.type !== 'banding') return;
    if (!(child.geometry instanceof THREE.BoxGeometry)) return;

    const edge = child.userData.edge;
    const bandingParams = child.geometry.parameters;
    const bandingThickness = Math.min(
      bandingParams.width,
      bandingParams.height,
      bandingParams.depth
    );

    // Update banding geometry and position based on edge
    let newGeometry: THREE.BoxGeometry;
    let newPosition: THREE.Vector3;

    if (edge === 'top' || edge === 'bottom') {
      newGeometry = new THREE.BoxGeometry(newWidth, bandingThickness, newDepth);
      newPosition = new THREE.Vector3(
        0,
        edge === 'top'
          ? newHeight / 2 - bandingThickness / 2
          : -newHeight / 2 + bandingThickness / 2,
        0
      );
    } else if (edge === 'left' || edge === 'right') {
      newGeometry = new THREE.BoxGeometry(bandingThickness, newHeight, newDepth);
      newPosition = new THREE.Vector3(
        edge === 'left'
          ? -newWidth / 2 + bandingThickness / 2
          : newWidth / 2 - bandingThickness / 2,
        0,
        0
      );
    } else if (edge === 'front' || edge === 'back') {
      newGeometry = new THREE.BoxGeometry(newWidth, newHeight, bandingThickness);
      newPosition = new THREE.Vector3(
        0,
        0,
        edge === 'front'
          ? newDepth / 2 - bandingThickness / 2
          : -newDepth / 2 + bandingThickness / 2
      );
    } else {
      return; // Unknown edge
    }

    child.geometry.dispose();
    child.geometry = newGeometry;
    child.position.copy(newPosition);
  });
};

/**
 * Update drawer/door height and handle visibility based on handle/handleless mode
 * Reduces height by 25mm from bottom, updates banding, and adjusts position
 */
export const updateDrawerDoorForHandleMode = async (
  scene: THREE.Scene,
  cupboardMesh: THREE.Mesh,
  isHandleless: boolean
) => {
  if (!cupboardMesh) return;

  const drawersAndDoors: THREE.Mesh[] = [];

  cupboardMesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const type = child.userData.type;
    if (type !== PART_TYPES.DRAWER && type !== PART_TYPES.DOOR) return;

    if (child.userData.isMain || child.name?.includes('DRAWER') || child.name?.includes('DOOR')) {
      drawersAndDoors.push(child);
    }
  });

  const currentObjects = store.getState().data.objects;
  // Reduction amount should match the vertical plank height (100mm)
  const REDUCTION_AMOUNT = 50; // 100mm reduction to match vertical plank height

  for (const drawerOrDoor of drawersAndDoors) {
    if (drawerOrDoor.userData.type === PART_TYPES.DRAWER) {
      // Find drawer face
      drawerOrDoor.traverse(async (child) => {
        if (
          child instanceof THREE.Mesh &&
          (child.name === DRAWER_PLANK_TYPES.DRAWER_FACE || child.name === 'DRAWER_FACE')
        ) {
          await updateMeshHeightAndBanding(child, currentObjects, isHandleless, REDUCTION_AMOUNT);
        }
      });
    } else if (drawerOrDoor.userData.type === PART_TYPES.DOOR) {
      // For doors, update the door mesh itself
      await updateMeshHeightAndBanding(
        drawerOrDoor,
        currentObjects,
        isHandleless,
        REDUCTION_AMOUNT
      );
    }

    // Update handle visibility
    drawerOrDoor.traverse((child) => {
      if (child.userData.type === 'handle') {
        child.visible = !isHandleless;
      }
    });
  }
};

/**
 * Helper function to find the cupboard parent by traversing up the scene graph
 * This handles cases where doors are wrapped in pivot groups
 */
const findCupboardParent = (mesh: THREE.Mesh): THREE.Mesh | null => {
  let current: THREE.Object3D | null = mesh.parent;

  while (current) {
    // Check if this is a cupboard (has isMain flag or is a main mesh)
    if (
      current instanceof THREE.Mesh &&
      (current.userData.isMain || current.userData.type === 'cupboard')
    ) {
      return current;
    }
    // Also check if parent has objectId that matches a cupboard in Redux
    const objectId = current.userData.objectId;
    if (objectId) {
      const currentObjects = store.getState().data.objects;
      const objData = currentObjects.find((obj: MeshObjectData) => obj.id === objectId);
      if (objData && objData.isMain && current instanceof THREE.Mesh) {
        return current;
      }
    }
    current = current.parent;
  }

  return null;
};

/**
 * Apply handleless height adjustment to a mesh
 * Reduces height from bottom (top stays fixed) when handleless, or restores original height
 */
const applyHandlelessHeightAdjustment = async (
  mesh: THREE.Mesh,
  meshData: MeshObjectData | undefined,
  cupboardParent: THREE.Mesh,
  currentWidth: number,
  currentHeight: number,
  currentDepth: number,
  isHandleless: boolean,
  reductionAmount: number
) => {
  if (isHandleless) {
    // Use Redux store data for original position (relative to cupboard) if available
    // This ensures we use the correct position even if door has been moved by pivot group
    const originalHeight = meshData?.dimensions?.height ?? currentHeight;
    const originalY = meshData?.position?.y ?? mesh.position.y;

    // Store original height and position if not already stored
    if (!mesh.userData.originalHeight) {
      mesh.userData.originalHeight = originalHeight;
      mesh.userData.originalY = originalY;
    }

    // Reduce height by reductionAmount from bottom (top stays fixed)
    const newHeight = Math.max(50, originalHeight - reductionAmount);
    const originalTopEdgeY = originalY + originalHeight / 2;
    const newCenterY = originalTopEdgeY - newHeight / 2;

    // Calculate new Y position in cupboard's local space
    // Then convert to mesh's immediate parent local space (which might be a pivot group)
    mesh.updateMatrixWorld(true);
    cupboardParent.updateMatrixWorld(true);

    // Create position vector in cupboard's local space with new Y
    const currentCupboardLocalX = meshData?.position?.x ?? 0;
    const currentCupboardLocalZ = meshData?.position?.z ?? 0;
    const newCupboardLocalPos = new THREE.Vector3(
      currentCupboardLocalX,
      newCenterY,
      currentCupboardLocalZ
    );

    // Convert to world space, then to mesh's parent local space
    const newWorldPos = cupboardParent.localToWorld(newCupboardLocalPos.clone());
    const newParentLocalPos = mesh.parent
      ? mesh.parent.worldToLocal(newWorldPos.clone())
      : newCupboardLocalPos;

    // Update geometry
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(currentWidth, newHeight, currentDepth);

    // Update position relative to immediate parent (preserving X and Z, updating Y)
    mesh.position.x = newParentLocalPos.x;
    mesh.position.y = newParentLocalPos.y;
    mesh.position.z = newParentLocalPos.z;

    // Manually update banding meshes to match new dimensions
    updateBandingMeshes(mesh, currentWidth, newHeight, currentDepth);

    // Update Redux
    if (meshData) {
      const updatedMeshData = {
        ...meshData,
        dimensions: {
          ...meshData.dimensions,
          height: newHeight,
        },
        position: {
          ...meshData.position,
          y: newCenterY,
        },
      };

      store.dispatch(updateObject(updatedMeshData));

      // Also update banding using MeshBuilder to ensure consistency
      try {
        const meshBuilder = new MeshBuilder(updatedMeshData);
        meshBuilder.setParentMesh(mesh.parent as THREE.Mesh);
        await meshBuilder.updateBanding(mesh);
      } catch (error) {
        console.warn('Failed to update banding:', error);
      }
    }
  } else {
    // Restore original height and position
    const originalHeight =
      mesh.userData.originalHeight || (meshData?.dimensions?.height ?? currentHeight);
    const originalY = mesh.userData.originalY ?? meshData?.position?.y ?? mesh.position.y;

    if (originalHeight && originalHeight !== currentHeight) {
      // Convert original position from cupboard's local space to mesh's parent local space
      mesh.updateMatrixWorld(true);
      cupboardParent.updateMatrixWorld(true);

      // Create position vector in cupboard's local space with original Y
      const currentCupboardLocalX = meshData?.position?.x ?? 0;
      const currentCupboardLocalZ = meshData?.position?.z ?? 0;
      const originalCupboardLocalPos = new THREE.Vector3(
        currentCupboardLocalX,
        originalY,
        currentCupboardLocalZ
      );

      // Convert to world space, then to mesh's parent local space
      const originalWorldPos = cupboardParent.localToWorld(originalCupboardLocalPos.clone());
      const originalParentLocalPos = mesh.parent
        ? mesh.parent.worldToLocal(originalWorldPos.clone())
        : originalCupboardLocalPos;

      // Update geometry
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(currentWidth, originalHeight, currentDepth);

      // Update position relative to immediate parent
      mesh.position.x = originalParentLocalPos.x;
      mesh.position.y = originalParentLocalPos.y;
      mesh.position.z = originalParentLocalPos.z;

      // Manually update banding meshes to match restored dimensions
      updateBandingMeshes(mesh, currentWidth, originalHeight, currentDepth);

      // Update banding if mesh has banding
      if (meshData) {
        const meshBuilder = new MeshBuilder(meshData);
        meshBuilder.setParentMesh(mesh.parent as THREE.Mesh);
        await meshBuilder.updateBanding(mesh);
      }

      // Clear stored original values
      delete mesh.userData.originalHeight;
      delete mesh.userData.originalY;

      if (meshData) {
        store.dispatch(
          updateObject({
            ...meshData,
            dimensions: {
              ...meshData.dimensions,
              height: originalHeight,
            },
            position: {
              ...meshData.position,
              y: originalY,
            },
          })
        );
      }
    }
  }
};

/**
 * Helper function to update mesh height, position, and banding
 * Reduces from bottom (top stays fixed, position moves down)
 */
const updateMeshHeightAndBanding = async (
  mesh: THREE.Mesh,
  currentObjects: MeshObjectData[],
  isHandleless: boolean,
  reductionAmount: number
) => {
  const geo = mesh.geometry as THREE.BoxGeometry;
  const currentHeight = geo.parameters.height;
  const currentWidth = geo.parameters.width;
  const currentDepth = geo.parameters.depth;

  const meshData = currentObjects.find((obj) => obj.id === mesh.userData.objectId);

  // Find the actual cupboard parent (traverse up past pivot groups)
  const cupboardParent = findCupboardParent(mesh);
  if (!cupboardParent) {
    console.warn('Could not find cupboard parent for mesh:', mesh.userData.objectId);
    return;
  }

  await applyHandlelessHeightAdjustment(
    mesh,
    meshData,
    cupboardParent,
    currentWidth,
    currentHeight,
    currentDepth,
    isHandleless,
    reductionAmount
  );
};

export const checkSideObjectExists = (cupboardMesh: THREE.Mesh, direction: string): boolean => {
  if (!cupboardMesh) return false;
  let exists = false;
  cupboardMesh.children.forEach((child) => {
    if (
      (child.userData.type === PART_TYPES.L_SHAPE_OBJECT ||
        child.userData.type === PART_TYPES.U_SHAPE_OBJECT) &&
      child.userData.direction === direction
    ) {
      exists = true;
    }
  });
  return exists;
};

export const addSideObjectToCupboard = async (
  scene: THREE.Scene,
  cupboardMesh: THREE.Mesh,
  type: string,
  direction: string,
  selectedCabinetItem: MeshObjectData
) => {
  if (!cupboardMesh) return;

  if (checkSideObjectExists(cupboardMesh, direction)) {
    toast(
      ({ closeToast }) => (
        <CustomToast
          appearance="error"
          message="Already have a side object on this side"
          closeToast={closeToast}
        />
      ),
      {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeButton: false,
        className: '!bg-transparent !shadow-none !p-0',
      }
    );
    return;
  }

  showFullScreenLoader(`Adding ${type === PART_TYPES.U_SHAPE_OBJECT ? 'U' : 'L'} -Shape object`);

  const geometry = cupboardMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const { x: width, y: height, z: depth } = size;

  // Defaults
  const thickness = 18;
  const stripWidth = 50;
  const material = selectedCabinetItem.material;

  const planks: MeshObjectData[] = [];

  const createPlank = (
    w: number,
    h: number,
    d: number,
    relX: number,
    relY: number,
    relZ: number,
    name: string
  ): MeshObjectData => {
    return {
      id: crypto.randomUUID(),
      name: name,
      type: isU ? PART_TYPES.U_SHAPE_OBJECT : PART_TYPES.L_SHAPE_OBJECT,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: { width: w, height: h, depth: d },
      position: { x: relX, y: relY, z: relZ },
      rotation: { x: 0, y: 0, z: 0 },
      parent: cupboardMesh.userData.objectId,
      material: material,
      isMain: false,
      direction: direction,
    };
  };

  const uStripWidth = 80;

  const isU = type === PART_TYPES.U_SHAPE_OBJECT;
  const currentStripWidth = isU ? uStripWidth : stripWidth;
  const isTop = direction === DIRECTION_TYPES.TOP || direction === 'top';

  if (isTop) {
    if (!isU) {
      // L-Shape Top
      planks.push(
        createPlank(
          width,
          currentStripWidth,
          thickness,
          0,
          height / 2 + currentStripWidth / 2,
          depth / 2 - thickness / 2,
          'L_Front'
        ),
        createPlank(
          width,
          thickness,
          currentStripWidth,
          0,
          height / 2 + thickness / 2,
          depth / 2 - thickness - currentStripWidth / 2,
          'L_Top'
        )
      );
    } else {
      // U-Shape Top
      const innerGap = currentStripWidth - 2 * thickness;
      planks.push(
        createPlank(
          width,
          thickness,
          currentStripWidth,
          0,
          height / 2 + thickness / 2,
          depth / 2 - currentStripWidth / 2,
          'U_Top'
        ),
        createPlank(
          width,
          innerGap,
          thickness,
          0,
          height / 2 + currentStripWidth / 2,
          depth / 2 - thickness / 2,
          'U_Front'
        ),
        createPlank(
          width,
          thickness,
          currentStripWidth,
          0,
          height / 2 + currentStripWidth - thickness / 2,
          depth / 2 - currentStripWidth / 2,
          'U_Inner_Top'
        )
      );
    }
  } else {
    // Side (Left / Right)
    const sign = direction === DIRECTION_TYPES.RIGHT ? 1 : -1;

    if (!isU) {
      // L-Shape Side
      planks.push(
        createPlank(
          currentStripWidth,
          height,
          thickness,
          sign * (width / 2 + currentStripWidth / 2),
          0,
          depth / 2 - thickness / 2,
          'L_Front'
        ),
        createPlank(
          thickness,
          height,
          currentStripWidth,
          sign * (width / 2 + thickness / 2),
          0,
          depth / 2 - thickness - currentStripWidth / 2,
          'L_Side'
        )
      );
    } else {
      // U-Shape Side
      const innerGap = currentStripWidth - 2 * thickness;
      planks.push(
        createPlank(
          thickness,
          height,
          currentStripWidth,
          sign * (width / 2 + thickness / 2),
          0,
          depth / 2 - currentStripWidth / 2,
          'U_Side_Outer'
        ),
        createPlank(
          innerGap,
          height,
          thickness,
          sign * (width / 2 + currentStripWidth / 2),
          0,
          depth / 2 - thickness / 2,
          'U_Front'
        ),
        createPlank(
          thickness,
          height,
          currentStripWidth,
          sign * (width / 2 + currentStripWidth - thickness / 2),
          0,
          depth / 2 - currentStripWidth / 2,
          'U_Side_Inner'
        )
      );
    }
  }

  // Create objects (planks)
  for (const plank of planks) {
    await meshBuilder(plank);
  }

  hideFullScreenLoader();
};

export const removeNailers = async (scene: THREE.Scene, cupboardMesh: THREE.Mesh) => {
  if (!cupboardMesh) return;
  const toRemove: THREE.Object3D[] = [];
  cupboardMesh.children.forEach((child) => {
    if (child.userData.isNailer) {
      toRemove.push(child);
    }
  });

  if (toRemove.length > 0) {
    toRemove.forEach((child) => {
      cupboardMesh.remove(child);
    });

    const shiftHeight = cupboardMesh.userData.nailerShift || 0;
    cupboardMesh.position.y -= shiftHeight;
    cupboardMesh.userData.nailerShift = 0;

    const cupboardId = cupboardMesh.userData.objectId;
    if (cupboardId) {
      const currentObjects = store.getState().data.objects;
      const cupboardData = currentObjects.find((o) => o.id === cupboardId);
      if (cupboardData) {
        store.dispatch(
          updateObject({
            ...cupboardData,
            position: {
              ...cupboardData.position,
              y: cupboardMesh.position.y,
            },
            nailerEnabled: false,
          })
        );
      }
    }

    // Restore side planks if they were adjusted
    const currentObjects = store.getState().data.objects;
    cupboardMesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.originalHeight !== undefined) {
        const originalHeight = child.userData.originalHeight;
        const originalY = child.userData.originalY;

        child.geometry.dispose();
        child.geometry = new THREE.BoxGeometry(
          (child.geometry as THREE.BoxGeometry).parameters.width,
          originalHeight,
          (child.geometry as THREE.BoxGeometry).parameters.depth
        );
        child.position.y = originalY;

        const childData = currentObjects.find((o) => o.id === child.userData.objectId);
        if (childData) {
          store.dispatch(
            updateObject({
              ...childData,
              dimensions: { ...childData.dimensions, height: originalHeight },
              position: { ...childData.position, y: originalY },
            })
          );

          const builder = new MeshBuilder(childData, scene);
          builder.setParentMesh(cupboardMesh);
          builder.updateBanding(child, { isDimensionUpdate: true });
        }

        delete child.userData.originalHeight;
        delete child.userData.originalY;
      }
    });
  }
};

const buildNailerMeshes = async (cupboardMesh: THREE.Mesh, modelName: string) => {
  const geometry = cupboardMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return null;

  const cupboardSize = new THREE.Vector3();
  geometry.boundingBox.getSize(cupboardSize);
  const w = cupboardSize.x;
  const h = cupboardSize.y;
  const d = cupboardSize.z;

  const nailerHeight = 100;
  const nailerW = 50;
  const nailerD = 50;
  const insetX = 40;
  const insetZ = 40;

  let url = `/glb/${modelName}.glb`;
  if (process.env.NEXT_PUBLIC_PUBLIC_API && !url.startsWith('http') && !url.startsWith('/glb')) {
    url = `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`;
  }

  let bottomPlank: THREE.Mesh | null = null;
  const verticalPlanks: THREE.Mesh[] = [];

  cupboardMesh.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      const name = child.name || '';
      if (name === 'BOTTOM_PLANK' || name.includes('BOTTOM_PLANK')) {
        if (!bottomPlank || child.position.y < bottomPlank.position.y) bottomPlank = child;
      } else if (
        name === 'LEFT_PLANK' ||
        name === 'RIGHT_PLANK' ||
        name.includes('LEFT_PLANK') ||
        name.includes('RIGHT_PLANK') ||
        child.userData.type === PART_TYPES.VERTICAL_PLANK
      ) {
        verticalPlanks.push(child);
      }
    }
  });

  const bp = bottomPlank as THREE.Mesh | null;
  const actualBottomY = bp
    ? bp.position.y +
      ((bp.geometry as THREE.BoxGeometry).boundingBox?.min.y ||
        -(bp.geometry as THREE.BoxGeometry).parameters.height / 2)
    : -h / 2;

  const positions = [
    { x: -w / 2 + nailerW / 2 + insetX, z: -d / 2 + nailerD / 2 + insetZ },
    { x: w / 2 - nailerW / 2 - insetX, z: -d / 2 + nailerD / 2 + insetZ },
    { x: -w / 2 + nailerW / 2 + insetX, z: d / 2 - nailerD / 2 - insetZ },
    { x: w / 2 - nailerW / 2 - insetX, z: d / 2 - nailerD / 2 - insetZ },
  ];

  let baseNailerModel: THREE.Object3D | null = null;
  let physicalHeight = nailerHeight;

  try {
    baseNailerModel = await GLBLoader(url, `Nailer_Base`, {
      width: nailerW,
      height: nailerHeight,
      depth: nailerD,
    });

    baseNailerModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(baseNailerModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    physicalHeight = size.y;
  } catch (err) {
    console.error('Failed to load base nailer', err);
    return null;
  }

  for (let i = 0; i < 4; i++) {
    try {
      const nailer = baseNailerModel.clone();
      nailer.name = `Nailer_${i}`;

      const nailerGroup = new THREE.Group();
      nailerGroup.add(nailer);
      nailerGroup.userData.isNailer = true;
      nailerGroup.userData.type = 'nailer';
      nailerGroup.userData.nailerHeight = nailerHeight;
      nailerGroup.userData.physicalHeight = physicalHeight;

      nailerGroup.position.set(positions[i].x, actualBottomY - physicalHeight / 2, positions[i].z);
      cupboardMesh.add(nailerGroup);
    } catch (err) {
      console.error('Failed to parse nailer clone', err);
    }
  }

  return { bottomPlank, verticalPlanks, actualBottomY, physicalHeight };
};

export const addNailers = async (
  scene: THREE.Scene,
  cupboardMesh: THREE.Mesh,
  modelName: string = 'stand_1'
) => {
  if (!cupboardMesh) return;
  showFullScreenLoader('Adding nailers...');

  await removeNailers(scene, cupboardMesh);

  const nailerData = await buildNailerMeshes(cupboardMesh, modelName);

  if (!nailerData) {
    hideFullScreenLoader();
    return;
  }

  const { bottomPlank, verticalPlanks, actualBottomY } = nailerData;

  let lowestVpMinY: number | null = null;
  const currentObjectsForPlanks = store.getState().data.objects;

  if (bottomPlank) {
    verticalPlanks.forEach((vp) => {
      const vpGeo = vp.geometry as THREE.BoxGeometry;
      const vpMinY = vp.position.y - vpGeo.parameters.height / 2;
      const vpMaxY = vp.position.y + vpGeo.parameters.height / 2;

      if (vpMinY < actualBottomY - 1) {
        if (lowestVpMinY === null || vpMinY < lowestVpMinY) {
          lowestVpMinY = vpMinY;
        }

        const newHeight = vpMaxY - actualBottomY;
        if (newHeight > 0) {
          const newCenterY = actualBottomY + newHeight / 2;

          if (vp.userData.originalHeight === undefined) {
            vp.userData.originalHeight = vpGeo.parameters.height;
            vp.userData.originalY = vp.position.y;
          }

          vp.geometry.dispose();
          vp.geometry = new THREE.BoxGeometry(
            vpGeo.parameters.width,
            newHeight,
            vpGeo.parameters.depth
          );
          vp.position.y = newCenterY;

          const vpData = currentObjectsForPlanks.find((obj) => obj.id === vp.userData.objectId);
          if (vpData) {
            store.dispatch(
              updateObject({
                ...vpData,
                dimensions: { ...vpData.dimensions, height: newHeight },
                position: { ...vpData.position, y: newCenterY },
              })
            );

            const builder = new MeshBuilder(vpData, scene);
            builder.setParentMesh(cupboardMesh);
            builder.updateBanding(vp, { isDimensionUpdate: true });
          }
        }
      }
    });

    if (lowestVpMinY === null) {
      console.log('[Scene] lowestVpMinY', lowestVpMinY);
      const amountToShift = 0.1;

      cupboardMesh.position.y += amountToShift;
      cupboardMesh.userData.nailerShift = amountToShift;
    } else {
      cupboardMesh.userData.nailerShift = 0;
    }
  }

  const cupboardId = cupboardMesh.userData.objectId;
  const finalObjects = store.getState().data.objects;

  if (cupboardId) {
    const cupboardData = finalObjects.find((obj) => obj.id === cupboardId);
    if (cupboardData) {
      store.dispatch(
        updateObject({
          ...cupboardData,
          position: {
            ...cupboardData.position,
            y: cupboardMesh.position.y,
          },
          nailerEnabled: true,
          nailerModel: modelName,
        })
      );
    }
  }

  hideFullScreenLoader();
};

export const hydrateNailers = async (cupboardMesh: THREE.Mesh, modelName: string = 'stand_1') => {
  if (!cupboardMesh) return;
  await buildNailerMeshes(cupboardMesh, modelName);
};
