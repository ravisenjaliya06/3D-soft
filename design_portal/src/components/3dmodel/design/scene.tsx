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
  DRAWER_PLANK_TYPES,
  DRAWER_TYPES,
  GEOMETRY,
  MeshObjectData,
  PART_TYPES,
} from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';
import { SyncManager } from '../sceneCreator/syncState';
import { store } from '../store';
import {
  addObjects,
  removeObject,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
} from '../store/dataSlice';
import { DesignBuilder } from '../sceneCreator/designBuilder';

let cachedHandleModel: THREE.Object3D | null = null;

// Constants
const EPSILON_OFFSET = 0.001; // Small offset to avoid Z-fighting

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
      dimensions: dims,
      position: parentLocalPos,
      parent: parent.userData.objectId,
    });
  }
  for (const plank of plankList) {
    await meshBuilder(plank);
  }

  generateCompartmentsFromMesh(parent);
  hideFullScreenLoader();
};

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  selectedCabinetItem: MeshObjectData | null = null
) => {
  console.log('selectedCabinetItem', selectedCabinetItem);
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

  const boxCenterLocal = geometryBoundingBox.getCenter(new THREE.Vector3());

  const doorDepth = 18;
  const doorId = selectedCabinetItem?.id || crypto.randomUUID();

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

  await meshBuilder({
    ...selectedCabinetItem,
    id: doorId,
    dimensions: doorDimensions,
    position: {
      x: parentLocalDoorPos.x,
      y: parentLocalDoorPos.y,
      z: parentLocalDoorPos.z,
    },
    isMain: false,
    openDirection: DIRECTION_TYPES.RIGHT,
  });

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
      drawerType: drawerType,
      material: selectedCabinetItem[0].material,
    };

    drawerGroupWithAllPlank.push(drawerGroup);

    const faceZRel = boxFrontZRel + faceD / 2;

    const localFacePos = new THREE.Vector3(boxCenterLocal.x, yLocal, boxCenterLocal.z + faceZRel);

    const worldFacePos = boxMesh.localToWorld(localFacePos.clone());
    const parentFacePos = parent.worldToLocal(worldFacePos.clone());

    const facePlank = selectedCabinetItem.find((item) => item.name === 'DRAWER_FACE_PLANK');
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
      material: facePlank?.material,
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
          material: selectedCabinetItem.find((item) => item.name === name)?.material,
        };
        drawerGroupWithAllPlank.push(part);
      };

      // LEFT plank position (12mm from left)
      createInnerPartData(
        'DRAWER_LEFT_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(
          boxCenterLocal.x - drawerOuterW / 2 + sideGap + thickness / 2,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD / 2
        )
      );

      // RIGHT plank position (12mm from right)
      createInnerPartData(
        'DRAWER_RIGHT_PLANK',
        { width: thickness, height: innerH, depth: innerD },
        new THREE.Vector3(
          boxCenterLocal.x + drawerOuterW / 2 - sideGap - thickness / 2,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD / 2
        )
      );

      // BACK plank
      createInnerPartData(
        'DRAWER_BACK_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(
          boxCenterLocal.x,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - innerD + thickness / 2
        )
      );

      // FRONT plank
      createInnerPartData(
        'DRAWER_FRONT_PLANK',
        { width: innerW, height: innerH, depth: thickness },
        new THREE.Vector3(
          boxCenterLocal.x,
          innerPartCenterY,
          boxCenterLocal.z + boxFrontZRel - thickness / 2
        )
      );

      // BOTTOM plank
      createInnerPartData(
        'DRAWER_BOTTOM_PLANK',
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
        material: [],
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

          // Find the actual mesh if it's a group
          let handleMesh: THREE.Mesh | null = null;
          if (child instanceof THREE.Mesh) {
            handleMesh = child;
          } else {
            child.traverse((obj) => {
              if (obj instanceof THREE.Mesh && !handleMesh) {
                handleMesh = obj;
              }
            });
          }

          if (handleMesh) {
            const zOffset = handleMesh.position.z - currentFaceZ;
            handleZOffsets.set(handleId, zOffset);
          }
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
        }
      }
    });

    // Update handle positions using stored offsets
    drawerMesh.children.forEach((child) => {
      if (child.userData.type === 'handle') {
        const handleId = child.userData.objectId;
        const zOffset = handleZOffsets.get(handleId);

        if (zOffset !== undefined) {
          // Find the actual mesh if it's a group
          let handleMesh: THREE.Mesh | null = null;
          if (child instanceof THREE.Mesh) {
            handleMesh = child;
          } else {
            child.traverse((obj) => {
              if (obj instanceof THREE.Mesh && !handleMesh) {
                handleMesh = obj;
              }
            });
          }

          if (handleMesh) {
            // New handle Z position: new face position + same offset
            const newHandleZ = insetFaceZ + zOffset;

            // Update handle position
            handleMesh.position.z = newHandleZ;

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

        // Find the actual mesh if it's a group
        let handleMesh: THREE.Mesh | null = null;
        if (child instanceof THREE.Mesh) {
          handleMesh = child;
        } else {
          child.traverse((obj) => {
            if (obj instanceof THREE.Mesh && !handleMesh) {
              handleMesh = obj;
            }
          });
        }

        if (handleMesh) {
          const zOffset = handleMesh.position.z - currentFaceZ;
          handleZOffsets.set(handleId, zOffset);
        }
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
    }
  });

  // Update handle positions using stored offsets
  drawerMesh.children.forEach((child) => {
    if (child.userData.type === 'handle') {
      const handleId = child.userData.objectId;
      const zOffset = handleZOffsets.get(handleId);

      if (zOffset !== undefined) {
        // Find the actual mesh if it's a group
        let handleMesh: THREE.Mesh | null = null;
        if (child instanceof THREE.Mesh) {
          handleMesh = child;
        } else {
          child.traverse((obj) => {
            if (obj instanceof THREE.Mesh && !handleMesh) {
              handleMesh = obj;
            }
          });
        }

        if (handleMesh) {
          // New handle Z position: new face position + same offset
          const newHandleZ = newFaceZ + zOffset;

          // Update handle position
          handleMesh.position.z = newHandleZ;

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
    }
  });
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
  let url;
  if (model) {
    url = `${process.env.NEXT_PUBLIC_PUBLIC_API}` + model;
  } else {
    url = '/glb/door_model.glb';
  }
  cachedHandleModel = await GLBLoader(url, 'DoorHandleGLB', {
    width: 20,
    height: 30,
    depth: 100,
  });
};
