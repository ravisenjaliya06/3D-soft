import * as THREE from 'three';
import { itemType } from '../design/interface';
import { mmToMeters } from '../handler/unitConversion';
import { PlankSegment, PositionKey } from '../interface';
import { Object3D } from '../store/interface';

export const updateObjectGeometry = (
  mesh: THREE.Mesh,
  object: Object3D,
  updatedData: Partial<Object3D>,
  allObjects: Object3D[]
) => {
  const childUpdates: { [key: string]: Partial<Object3D> } = {};
  const grandChildUpdates: { [key: string]: Partial<Object3D> } = {};
  if (!mesh || !object) return childUpdates;
  if (!mesh.userData.objectId) mesh.userData.objectId = object.id;

  const getRatio = (newVal: number, currVal: number) => newVal / currVal;
  const getNewValue = (key: keyof Object3D) => updatedData[key] ?? object[key];

  const newWidth = Number(getNewValue('width')),
    newHeight = Number(getNewValue('height')),
    newDepth = Number(getNewValue('depth'));
  const widthRatio = getRatio(newWidth, object.width);
  const heightRatio = getRatio(newHeight, object.height);
  const depthRatio = getRatio(newDepth, object.depth);

  mesh.geometry.dispose();
  mesh.geometry = new THREE.BoxGeometry(
    mmToMeters(newWidth),
    mmToMeters(newHeight),
    mmToMeters(newDepth)
  );
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();

  const updateSegments = (
    type: string,
    ratio: number,
    plankName: string,
    sizeKey: string,
    posKey: string
  ) => {
    let fixedTotal = 0;
    const segmentSizes: number[] = [];
    const fixedPlank: string[] = [];
    const plankSegments: PlankSegment[] = [];
    const dynamicPlankIds: string[] = [];
    const key = sizeKey as keyof Object3D;

    const mainPlank = allObjects.find((o) => o.name.includes(plankName));

    allObjects.forEach((plank) => {
      if (!plank) return;
      if (plank.catalog_type === type && plank[key] === mainPlank?.[key]) {
        fixedPlank.push(plank.id);
        fixedTotal += plank[type === itemType.VERTICAL ? 'width' : 'height'];
      } else {
        dynamicPlankIds.push(plank.id);
      }
    });
    const positionKey = posKey as PositionKey;

    const fixedPlankObjects = allObjects
      .filter((o) => fixedPlank.includes(o.id))
      .sort((a, b) => (a.position?.[positionKey] ?? 0) - (b.position?.[positionKey] ?? 0));

    for (let i = 0; i < fixedPlankObjects.length - 1; i++) {
      const [start, end] = [
        fixedPlankObjects[i].position?.[positionKey] ?? 0,
        fixedPlankObjects[i + 1].position?.[positionKey] ?? 0,
      ];
      const size = Math.abs(end - start);
      segmentSizes.push(size);
      const items = allObjects
        .filter(
          (o) =>
            o &&
            !fixedPlank.includes(o.id) &&
            (o.position?.[positionKey] ?? 0) > start &&
            (o.position?.[positionKey] ?? 0) < end
        )
        .map((o) => o.id);
      plankSegments.push({
        fromId: fixedPlankObjects[i].id,
        toId: fixedPlankObjects[i + 1].id,
        items,
        ratio: 0,
      });
    }

    const total = segmentSizes.reduce((a, b) => a + b, 0);
    if (total > 0) segmentSizes.forEach((d, i) => (plankSegments[i].ratio = d / total));

    plankSegments.forEach((seg) => {
      const newVal = getNewValue(key);
      const oldVal = object[key];
      if (typeof newVal === 'number' && typeof oldVal === 'number') {
        const extra = (newVal - oldVal) * (seg.ratio ?? 0);
        const perItemExtra = seg.items.length ? extra / seg.items.length : 0;

        seg.items.forEach((id) => {
          const item = allObjects.find((o) => o.id === id);
          if (item && item.catalog_type === type && !fixedPlank.includes(id)) {
            childUpdates[id] = {
              ...childUpdates[id],
              [key]: (item[key] as number) + perItemExtra,
            };
          }
        });
      }
    });

    return { plankSegments, fixedPlank, dynamicPlankIds, fixedTotal };
  };

  const {
    plankSegments: widthSegments,
    dynamicPlankIds: dynW,
    fixedTotal: fixedWidth,
  } = widthRatio > 1 && allObjects
    ? updateSegments(itemType.VERTICAL, widthRatio, 'RIGHT_PLANK', 'width', 'x')
    : heightRatio > 1 && allObjects
      ? updateSegments(itemType.VERTICAL, widthRatio, 'LEFT_PLANK', 'width', 'x')
      : {
          plankSegments: [],
          dynamicPlankIds: [],
          fixedTotal: 0,
        };

  const { plankSegments: heightSegments, dynamicPlankIds: dynH } =
    heightRatio > 1 && allObjects
      ? updateSegments(itemType.HORIZONTAL, heightRatio, 'TOP_PLANK', 'height', 'y')
      : {
          plankSegments: [],
          dynamicPlankIds: [],
        };

  const plankSegments = [...widthSegments, ...heightSegments];
  const dynamicPlankIds = [...dynW, ...dynH];
  const remainingRatio = widthRatio * fixedWidth;

  if (allObjects?.length && object.child?.length) {
    for (const childId of object.child) {
      const childObj = allObjects.find((o) => o.id === childId);
      if (!childObj) continue;

      const seg = plankSegments.find((s) => s.items.includes(childId));
      const minorRatio = seg?.ratio ? seg.ratio * remainingRatio : null;
      const childMesh = mesh.children.find(
        (c) =>
          c instanceof THREE.Mesh &&
          ((!c.userData.objectId && c.name === childObj.name) || c.userData.objectId === childId)
      );
      if (!childMesh) continue;

      const [cw, ch, cd] = [childObj.width, childObj.height, childObj.depth];
      let [nw, nh] = [cw * widthRatio, ch * heightRatio];
      const nd = cd * depthRatio;
      const pos = {
        x: childObj.position?.x ?? 0,
        y: childObj.position?.y ?? 0,
        z: childObj.position?.z ?? 0,
      };

      const isBorder = (coord: number, halfParent: number, size: number, dir: 'pos' | 'neg') =>
        Math.abs(
          coord + (dir === 'neg' ? 1 : -1) * halfParent + ((dir === 'neg' ? -1 : 1) * size) / 2
        ) < 1e-3;
      const isLeft = isBorder(pos.x, object.width / 2, cw, 'neg');
      const isRight = isBorder(pos.x, object.width / 2, cw, 'pos');
      const isBottom = isBorder(pos.y, object.height / 2, ch, 'neg');
      const isTop = isBorder(pos.y, object.height / 2, ch, 'pos');

      if (
        widthRatio > 1 &&
        childObj.catalog_type === itemType.VERTICAL &&
        !dynamicPlankIds.includes(childObj.id)
      )
        nw = cw;
      if (
        heightRatio > 1 &&
        childObj.catalog_type === itemType.HORIZONTAL &&
        !dynamicPlankIds.includes(childObj.id)
      )
        nh = ch;

      const newPos = {
        x: pos.x * widthRatio,
        y: pos.y * heightRatio,
        z: pos.z * depthRatio,
      };
      if (isLeft) newPos.x = -newWidth / 2 + nw / 2;
      else if (isRight) newPos.x = newWidth / 2 - nw / 2;
      else if (widthRatio > 1 && dynamicPlankIds.includes(childObj.id)) nw += minorRatio ?? 0;

      if (isBottom) newPos.y = -newHeight / 2 + nh / 2;
      else if (isTop) newPos.y = newHeight / 2 - nh / 2;
      else if (heightRatio > 1 && dynamicPlankIds.includes(childObj.id)) nh += minorRatio ?? 0;

      if (childObj.name.includes('BACK_PLANK')) {
        if (widthRatio > 1)
          nw +=
            widthRatio * (getSideWidth('RIGHT_PLANK') + getSideWidth('LEFT_PLANK')) -
            (getSideWidth('RIGHT_PLANK') + getSideWidth('LEFT_PLANK'));
        else if (heightRatio > 1)
          nh +=
            heightRatio * (getSideHeight('TOP_PLANK') + getSideHeight('BOTTOM_PLANK')) -
            (getSideHeight('TOP_PLANK') + getSideHeight('BOTTOM_PLANK'));
      }

      (childMesh as THREE.Mesh).geometry.dispose();
      (childMesh as THREE.Mesh).geometry = new THREE.BoxGeometry(
        mmToMeters(nw),
        mmToMeters(nh),
        mmToMeters(nd)
      );
      childMesh.position.set(mmToMeters(newPos.x), mmToMeters(newPos.y), mmToMeters(newPos.z));
      (childMesh as THREE.Mesh).geometry.attributes.position.needsUpdate = true;
      (childMesh as THREE.Mesh).geometry.computeVertexNormals();
      childMesh.updateMatrix();
      childMesh.updateMatrixWorld(true);

      const updateData = {
        width: nw,
        height: nh,
        depth: nd,
        position: newPos,
        child: childObj.child,
      };
      (childObj.child?.length ? grandChildUpdates : childUpdates)[childId] = updateData;

      if (childObj.child?.length) {
        for (const gcId of childObj.child) {
          const gcObj = allObjects.find((o) => o.id === gcId);
          if (!gcObj) continue;
          const gcMesh = childMesh.children.find(
            (c) =>
              c instanceof THREE.Mesh &&
              ((!c.userData.objectId && c.name === gcObj.name) || c.userData.objectId === gcId)
          );
          if (!gcMesh) continue;

          const gcW = gcObj.width * widthRatio,
            gcH = gcObj.height * heightRatio,
            gcD = gcObj.depth * depthRatio;
          const gcPos = {
            x: (gcObj.position?.x || 0) * widthRatio,
            y: (gcObj.position?.y || 0) * heightRatio,
            z: (gcObj.position?.z || 0) * depthRatio,
          };

          (gcMesh as THREE.Mesh).geometry.dispose();
          (gcMesh as THREE.Mesh).geometry = new THREE.BoxGeometry(
            mmToMeters(gcW),
            mmToMeters(gcH),
            mmToMeters(gcD)
          );
          gcMesh.position.set(mmToMeters(gcPos.x), mmToMeters(gcPos.y), mmToMeters(gcPos.z));
          (gcMesh as THREE.Mesh).geometry.attributes.position.needsUpdate = true;
          (gcMesh as THREE.Mesh).geometry.computeVertexNormals();
          gcMesh.updateMatrix();
          gcMesh.updateMatrixWorld(true);

          grandChildUpdates[gcId] = {
            width: gcW,
            height: gcH,
            depth: gcD,
            position: gcPos,
            child: gcObj.child,
          };
        }
      }
    }
  }

  function getSideWidth(name: string) {
    return allObjects.filter((o: Object3D) => o.name.includes(name))[0]?.width ?? 0;
  }

  function getSideHeight(name: string) {
    return allObjects.filter((o: Object3D) => o.name.includes(name))[0]?.height ?? 0;
  }

  return { childUpdates, grandChildUpdates };
};

function getChildConfig(child: Object3D) {
  return {
    width: child.width,
    height: child.height,
    depth: child.depth,
    position: {
      x: child.position?.x || 0,
      y: child.position?.y || 0,
      z: child.position?.z || 0,
    },
  };
}

export function buildMeshTree(object: Object3D, allObjects: Object3D[]): THREE.Mesh {
  const config = getChildConfig(object);

  // Create mesh for this object
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      mmToMeters(config.width),
      mmToMeters(config.height),
      mmToMeters(config.depth)
    ),
    new THREE.MeshStandardMaterial()
  );
  mesh.position.set(
    mmToMeters(config.position.x),
    mmToMeters(config.position.y),
    mmToMeters(config.position.z)
  );
  mesh.userData.objectId = object.id;

  // Recursively add children
  if (object.child && object.child.length > 0) {
    for (const childId of object.child) {
      const childObj = allObjects.find((obj) => obj.id === childId);
      if (!childObj) continue;
      const childMesh = buildMeshTree(childObj, allObjects);
      mesh.add(childMesh);
    }
  }

  return mesh;
}

export function updateSceneObject(
  scene: THREE.Scene,
  updatedObjects: Object3D[],
  objectId: string
) {
  const oldMesh = scene.getObjectByProperty('userData.objectId', objectId);
  if (oldMesh) {
    scene.remove(oldMesh);
    oldMesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && typeof (obj.material as THREE.Material).dispose === 'function') {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }
  const updatedObject = updatedObjects.find((obj) => obj.id === objectId);
  if (!updatedObject) return;
  // Build and add new mesh
  const newMesh = buildMeshTree(updatedObject, updatedObjects);
  scene.add(newMesh);
}
