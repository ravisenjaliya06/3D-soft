import * as THREE from 'three';
import {
  generateCompartmentsFromMesh,
  hideFullScreenLoader,
  showFullScreenLoader,
} from '../handler/items';
import { GLBLoader } from '../helper/glbLoader';
import { Dimensions } from '../interface';
import { DesignBuilder } from '../sceneCreator/designBuilder';
import {
  DIRECTION_TYPES,
  DRAWER_PLANK_TYPES,
  DRAWER_TYPES,
  GEOMETRY,
  MATERIAL_TYPE,
  MeshObjectData,
  PART_TYPES,
  TEXTURES,
} from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { store } from '../store';
import {
  addObjects,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
} from '../store/dataSlice';
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

      // Calculate minZ offset from geometry (unaffected by rotation, only scale)
      // This assumes the handle model is aligned such that Z-min is the back face.
      (handle as THREE.Mesh).geometry.computeBoundingBox();
      const minZ = ((handle as THREE.Mesh).geometry.boundingBox?.min.z ?? 0) * handle.scale.z;

      parent.add(handle);
      handle.position.copy(parentLocalHandlePos);

      // Adjust Z to align minZ with surface
      handle.position.z -= minZ;

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
  drawers: number,
  drawerType: string = DRAWER_TYPES.INSET
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
  const drawerConstructionType = 'fivePlank';

  await ensureHandleLoaded();

  const parent: THREE.Mesh = !boxMesh.parent?.userData.isMain
    ? boxMesh
    : (boxMesh.parent as THREE.Mesh);

  for (let i = 0; i < drawers; i++) {
    const yLocal = geometryBoundingBox.min.y + eachH * (i + 0.5);

    // Inset: fits inside. Overlay: covers front.
    const isOverlay = drawerType === DRAWER_TYPES.OVERLAY;

    // Face dimensions
    // User requested 30mm increase in width for Overlay. Height remains consistent with Inset.
    const faceW = isOverlay ? w + 30 : w - 10;
    const faceH = eachH - 5;
    const faceD = 20;
    const boxFrontZRel = isOverlay ? d / 2 : d / 2 - faceD;

    const drawerDimensions = {
      width: w - 10,
      height: eachH - 5,
      depth: faceD,
    };

    const drawerGroupId = crypto.randomUUID();
    const drawerGroupWithAllPlank: MeshObjectData[] = [];

    // Calculate the group's position in parent's local space
    const worldGroupPos = boxMesh.localToWorld(
      new THREE.Vector3(boxCenterLocal.x, yLocal, boxCenterLocal.z)
    );
    const parentGroupPos = parent.worldToLocal(worldGroupPos.clone());

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
      openDirection: DIRECTION_TYPES.RIGHT,
      drawerType: drawerType, // Store the drawer type
    };

    drawerGroupWithAllPlank.push(drawerGroup);

    // Face position relative to group center
    const faceZRel = boxFrontZRel + faceD / 2;

    const localFacePos = new THREE.Vector3(boxCenterLocal.x, yLocal, boxCenterLocal.z + faceZRel);

    const worldFacePos = boxMesh.localToWorld(localFacePos.clone());
    const parentFacePos = parent.worldToLocal(worldFacePos.clone());

    const face: MeshObjectData = {
      id: crypto.randomUUID(),
      name: 'DRAWER_FACE',
      type: PART_TYPES.DRAWER,
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
      material: {
        type: MATERIAL_TYPE.TEXTURE,
        value: TEXTURES.WHITE_TEXTURE,
        repeatX: 1,
        repeatY: 1,
      },
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

      // Vertical alignment (bottom aligned)
      const baseY = yLocal;
      const innerPartCenterY = baseY - (eachH - innerH) / 2;

      const createInnerPartData = (name: string, dims: Dimensions, pos: THREE.Vector3) => {
        const worldPos = boxMesh.localToWorld(pos.clone());
        const parentLocal = parent.worldToLocal(worldPos.clone());

        const part: MeshObjectData = {
          id: crypto.randomUUID(),
          name,
          type: Object.values(DRAWER_PLANK_TYPES).includes(name) ? name : PART_TYPES.DRAWER,
          parent: drawerGroupId,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: dims,
          position: {
            x: parentLocal.x - parentGroupPos.x,
            y: parentLocal.y - parentGroupPos.y,
            z: parentLocal.z - parentGroupPos.z,
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          material: {
            type: MATERIAL_TYPE.TEXTURE,
            value: TEXTURES.LIGHT_WOOD,
          },
        };
        drawerGroupWithAllPlank.push(part);
      };

      // LEFT plank position (12mm from left)
      createInnerPartData(
        'LEFT_DRAWER_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(
          boxCenterLocal.x - drawerOuterW / 2 + sideGap + thickness / 2,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD / 2
        )
      );

      // RIGHT plank position (12mm from right)
      createInnerPartData(
        'RIGHT_DRAWER_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(
          boxCenterLocal.x + drawerOuterW / 2 - sideGap - thickness / 2,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD / 2
        )
      );

      // BACK plank
      createInnerPartData(
        'BACK_DRAWER_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(
          boxCenterLocal.x,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD + thickness / 2
        )
      );

      // FRONT plank
      createInnerPartData(
        'FRONT_DRAWER_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(
          boxCenterLocal.x,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - thickness / 2
        )
      );

      // BOTTOM plank
      createInnerPartData(
        'BOTTOM_DRAWER_PLANK',
        { width: innerW, height: thickness, depth: innerD },
        new THREE.Vector3(
          boxCenterLocal.x,
          baseY - eachH / 2 + thickness / 2,
          boxCenterLocal.z + boxFrontZRel - innerD / 2
        )
      );
    }

    const railH = 20;
    const railT = 5;
    const railLen = Math.max(d - 60, 200);

    const createRailData = (name: string, xOffset: number) => {
      const localPos = new THREE.Vector3(xOffset, yLocal, boxCenterLocal.z);

      const worldPos = boxMesh.localToWorld(localPos.clone());
      const parentLocal = parent.worldToLocal(worldPos.clone());

      const rail: MeshObjectData = {
        id: crypto.randomUUID(),
        name,
        type: PART_TYPES.DRAWER,
        parent: drawerGroupId,
        geometryType: GEOMETRY.BOX_GEOMETRY,
        dimensions: { width: railT, height: railH, depth: railLen },
        position: {
          x: parentLocal.x - parentGroupPos.x,
          y: parentLocal.y - parentGroupPos.y,
          z: parentLocal.z - parentGroupPos.z,
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: {
          type: MATERIAL_TYPE.COLOR,
          value: '#000000',
        },
      };
      drawerGroupWithAllPlank.push(rail);
    };

    createRailData(
      `DrawerRail_L_${i}_for_${boxMesh.name}`,
      geometryBoundingBox.min.x + railT / 2 + 0.01
    );

    createRailData(
      `DrawerRail_R_${i}_for_${boxMesh.name}`,
      geometryBoundingBox.max.x - railT / 2 - 0.01
    );

    // Build the drawer group using DesignBuilder
    const builder = new DesignBuilder(drawerGroupWithAllPlank, scene);
    const drawerMesh = builder.createDesign();
    parent.add(drawerMesh);

    // Add handle to the drawerMesh
    if (cachedHandleModel) {
      const handleGroup = cachedHandleModel.clone(true);
      let handle = handleGroup;

      let meshFound = false;
      handleGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && !meshFound) {
          handle = child;
          handle.scale.multiply(handleGroup.scale);
          meshFound = true;
        }
      });

      handle.rotation.set(0, 0, 0);

      // Calculate minZ offset from geometry
      // This assumes the handle model is aligned such that Z-min is the back face.
      // handle as mesh and calculate minZ offset from geometry
      (handle as THREE.Mesh).geometry.computeBoundingBox();
      const minZ = ((handle as THREE.Mesh).geometry.boundingBox?.min.z ?? 0) * handle.scale.z;

      const faceZLocalInParent = parentFacePos.z;
      const frontZOffset = thickness / 2;

      handle.position.set(
        parentFacePos.x - parentGroupPos.x,
        parentFacePos.y - parentGroupPos.y,
        faceZLocalInParent + frontZOffset - minZ + EPSILON_OFFSET - parentGroupPos.z
      );

      handle.name = `Handle_Drawer_${i}_for_${boxMesh.name}`;

      const handleId = crypto.randomUUID();
      handle.userData.objectId = handleId;
      handle.userData.type = 'handle';

      drawerMesh.add(handle);

      const handleData: MeshObjectData = {
        id: handleId,
        name: handle.name,
        type: 'handle',
        parent: drawerGroupId,
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

    // Select the first drawer (or each as they are added, but usually just the last/main one)
    store.dispatch(setobjectSelected(parent.userData.objectId));
    store.dispatch(setSelectedChildObject(drawerGroupId));
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
    drawerMesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (child.name === DRAWER_PLANK_TYPES.DRAWER_FACE) {
        const geo = child.geometry as THREE.BoxGeometry;
        const height = geo.parameters.height;

        // Restore original INSET face size
        const originalWidth = geo.parameters.width - 30;

        const insetZ = geometry.boundingBox!.max.z - faceD / 2 - thickness;

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
        }
      }
    });

    return;
  }

  // ===== OVERLAY MODE → FULL RECALC =====

  const innerD = d - 120;
  const innerZ = d / 2 - faceD - innerD / 2;
  const frontPlankZ = innerZ + innerD / 2 - thickness / 2;

  drawerMesh.children.forEach((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const partName = child.name;
    const partId = child.userData.objectId;

    let newZ = child.position.z;
    let geo = child.geometry as THREE.BoxGeometry;
    let w = geo.parameters.width;
    let h = geo.parameters.height;
    let dep = geo.parameters.depth;

    if (partName === DRAWER_PLANK_TYPES.DRAWER_FACE) {
      w += 30;
      dep = faceD;
      newZ = frontPlankZ + thickness / 2 + faceD / 2;

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
    }
  });
};

export const ensureHandleLoaded = async () => {
  if (cachedHandleModel) return;
  cachedHandleModel = await GLBLoader('/glb/door_handle.glb', 'DoorHandleGLB', {
    width: 20,
    height: 30,
    depth: 100,
  });
};
