import * as THREE from 'three';
import { GEOMETRY, MATERIAL_TYPE, PART_TYPES } from '../sceneCreator/interface';
import { MeshBuilder } from '../sceneCreator/meshBuilder';

export function showFullScreenLoader(message = 'Loading...') {
  /**
   * Shows a full screen loader with a message
   */
  if (document.getElementById('global-loader')) return;

  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.style.position = 'fixed';
  loader.style.top = '0';
  loader.style.left = '0';
  loader.style.width = '100vw';
  loader.style.height = '100vh';
  loader.style.background = 'rgba(0,0,0,0.7)';
  loader.style.display = 'flex';
  loader.style.flexDirection = 'column';
  loader.style.justifyContent = 'center';
  loader.style.alignItems = 'center';
  loader.style.zIndex = '9999';
  loader.innerHTML = `
    <div style="color:white;font-size:20px;margin-bottom:20px;">${message}</div>
    <div style="
      width:60px;
      height:60px;
      border:6px solid #fff;
      border-top-color:transparent;
      border-radius:50%;
      animation: spin 1s linear infinite;
    "></div>
    <style>
      @keyframes spin { 
        from { transform: rotate(0deg); } 
        to { transform: rotate(360deg); } 
      }
    </style>
  `;
  document.body.appendChild(loader);
}

export function hideFullScreenLoader() {
  /*
   Hides a full screen loader from the full page
  */
  const loader = document.getElementById('global-loader');
  if (loader) loader.remove();
}

export function generateCompartmentsFromMesh(boxMesh: THREE.Mesh) {
  if (!boxMesh) return [];
  if (boxMesh.name.toLowerCase().includes('drawer')) return [];

  // --- Remove previous invisible boxes ---
  const toRemove: THREE.Object3D[] = [];
  boxMesh.traverse((child) => {
    if (child.userData.isInvisibleBox) toRemove.push(child);
  });
  toRemove.forEach((c) => boxMesh.remove(c));

  // --- Compute local bounding box ---
  const containerGeom = boxMesh.geometry as THREE.BufferGeometry;
  containerGeom.computeBoundingBox();
  const bb = containerGeom.boundingBox;
  if (!bb) return [];

  const size = new THREE.Vector3();
  bb.getSize(size);

  const width = size.x;
  const height = size.y;
  const depth = size.z;
  const boxCenterLocal = bb.getCenter(new THREE.Vector3());

  // --- Collect planks ---
  const planks: {
    name: string;
    width: number;
    height: number;
    depth: number;
    position: THREE.Vector3;
    wMin: number;
    wMax: number;
    hMin: number;
    hMax: number;
  }[] = [];

  let backPlank: {
    zMin: number;
    zMax: number;
    thickness: number;
  } | null = null;

  boxMesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.userData.type !== PART_TYPES.PLANK) return;

    const geom = child.geometry as THREE.BoxGeometry;
    const { width: pWidth, height: pHeight, depth: pDepth } = geom.parameters;

    const dims = [
      { axis: 'x', value: pWidth },
      { axis: 'y', value: pHeight },
      { axis: 'z', value: pDepth },
    ].sort((a, b) => a.value - b.value);

    const thicknessAxis = dims[0].axis;

    const worldPos = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    const localPos = boxMesh.worldToLocal(worldPos.clone());

    const wMin = localPos.x - pWidth / 2;
    const wMax = localPos.x + pWidth / 2;
    const hMin = localPos.y - pHeight / 2;
    const hMax = localPos.y + pHeight / 2;
    const zMin = localPos.z - pDepth / 2;
    const zMax = localPos.z + pDepth / 2;

    // Back plank detection
    if (thicknessAxis === 'z') {
      backPlank = { zMin, zMax, thickness: pDepth };
      return;
    }

    // Skip front/back dividers
    if (thicknessAxis === 'z') return;

    planks.push({
      name: child.name,
      width: pWidth,
      height: pHeight,
      depth: pDepth,
      position: localPos,
      wMin,
      wMax,
      hMin,
      hMax,
    });
  });

  // --- Compute usable depth ---
  let usableDepth = depth;
  let depthOffset = 0;

  if (backPlank) {
    const blockedDepth = backPlank.zMax - bb.min.z;
    usableDepth = depth - blockedDepth;
    depthOffset = blockedDepth / 2;
  }

  // --- Material for invisible boxes ---
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  // --- No planks → single compartment ---
  if (planks.length === 0) {
    const geo = new THREE.BoxGeometry(width, height, usableDepth);
    const mesh = new THREE.Mesh(geo, invisibleMat);
    mesh.name = `INVISIBLE_FULL_COMPARTMENT_for_${boxMesh.name}`;
    mesh.userData.isInvisibleBox = true;
    mesh.position.set(boxCenterLocal.x, boxCenterLocal.y, boxCenterLocal.z + depthOffset);
    boxMesh.add(mesh);
    return [mesh];
  }

  const minW = bb.min.x;
  const maxW = bb.max.x;
  const minH = bb.min.y;
  const maxH = bb.max.y;

  const TARGET_GRID_CELLS = 300;
  const stepW = (maxW - minW) / TARGET_GRID_CELLS;
  const stepH = (maxH - minH) / TARGET_GRID_CELLS;
  const step = Math.max(stepW, stepH);

  const gridWidth = Math.ceil((maxW - minW) / step);
  const gridHeight = Math.ceil((maxH - minH) / step);

  const grid: string[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill('empty')
  );

  planks.forEach((p) => {
    const startX = Math.max(0, Math.floor((p.wMin - minW) / step));
    const endX = Math.min(gridWidth - 1, Math.ceil((p.wMax - minW) / step));
    const startY = Math.max(0, Math.floor((p.hMin - minH) / step));
    const endY = Math.min(gridHeight - 1, Math.ceil((p.hMax - minH) / step));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        grid[y][x] = 'plank';
      }
    }
  });

  const compartments: {
    width: number;
    height: number;
    depth: number;
    position: THREE.Vector3;
  }[] = [];

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (grid[y][x] !== 'empty') continue;

      let xEnd = x;
      let yEnd = y;

      while (xEnd + 1 < gridWidth && grid[y][xEnd + 1] === 'empty') xEnd++;

      let valid = true;
      while (yEnd + 1 < gridHeight && valid) {
        for (let xx = x; xx <= xEnd; xx++) {
          if (grid[yEnd + 1][xx] !== 'empty') {
            valid = false;
            break;
          }
        }
        if (valid) yEnd++;
      }

      const compWidth = (xEnd - x + 1) * step;
      const compHeight = (yEnd - y + 1) * step;
      const centerW = minW + (x + (xEnd - x) / 2) * step;
      const centerH = minH + (y + (yEnd - y) / 2) * step;

      compartments.push({
        width: compWidth,
        height: compHeight,
        depth: usableDepth,
        position: new THREE.Vector3(centerW, centerH, boxCenterLocal.z + depthOffset),
      });

      for (let fy = y; fy <= yEnd; fy++) {
        for (let fx = x; fx <= xEnd; fx++) {
          grid[fy][fx] = 'filled';
        }
      }
    }
  }

  const meshes: THREE.Mesh[] = [];
  compartments.forEach((c, idx) => {
    const meshBuilder = new MeshBuilder({
      id: crypto.randomUUID(),
      name: `invisibleBox_${idx}_for_${boxMesh.name}`,
      type: 'INVISIBLEBOX', // custom type or reuse known type
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: {
        width: c.width,
        height: c.height,
        depth: c.depth,
      },
      position: { x: c.position.x, y: c.position.y, z: c.position.z },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        type: MATERIAL_TYPE.COLOR,
        value: '#00ff00',
      },
    });
    const mesh = meshBuilder.createMesh();
    mesh.userData.isInvisibleBox = true;
    if (
      mesh.material instanceof THREE.MeshBasicMaterial ||
      mesh.material instanceof THREE.MeshStandardMaterial
    ) {
      mesh.material.transparent = true;
      mesh.material.opacity = 0;
      mesh.material.depthWrite = false;
    }
    boxMesh.add(mesh);
    meshes.push(mesh);
  });

  return meshes;
}

