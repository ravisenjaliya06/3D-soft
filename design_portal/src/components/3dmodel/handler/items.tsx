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
  /**
   * Generates invisible boxes for empty compartments in a given box mesh object.
   * Works in local space only (no special wall handling).
   */
  if (!boxMesh) return [];
  if (boxMesh.name.toLowerCase().includes('drawer')) return [];

  // --- Remove previous invisible boxes ---
  const toRemove: THREE.Object3D[] = [];
  boxMesh.traverse((child) => {
    if (child.userData.isInvisibleBox) toRemove.push(child);
  });
  toRemove.forEach((c) => boxMesh.remove(c));

  // --- Get LOCAL bounding box of the container geometry ---
  const containerGeom = boxMesh.geometry as THREE.BufferGeometry;
  containerGeom.computeBoundingBox();

  const bb = containerGeom.boundingBox;
  if (!bb) return [];

  const size = new THREE.Vector3();
  bb.getSize(size);

  const width = size.x; // local X = width
  const height = size.y; // local Y = height
  const depth = size.z; // local Z = depth

  const boxCenterLocal = bb.getCenter(new THREE.Vector3());

  // --- Collect planks in LOCAL space ---
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

  boxMesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.userData.type !== PART_TYPES.PLANK) return;

    const geom = child.geometry as THREE.BoxGeometry;
    const { width: pWidth, height: pHeight, depth: pDepth } = geom.parameters;

    // --- Determine plank orientation dynamically ---
    const dims = [
      { axis: 'x', value: pWidth },
      { axis: 'y', value: pHeight },
      { axis: 'z', value: pDepth },
    ];

    dims.sort((a, b) => a.value - b.value);
    const thicknessAxis = dims[0].axis;

    if (thicknessAxis === 'z') return;

    // --- World → local position ---
    const worldPos = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    const localPos = boxMesh.worldToLocal(worldPos.clone());

    const wMin = localPos.x - pWidth / 2;
    const wMax = localPos.x + pWidth / 2;
    const hMin = localPos.y - pHeight / 2;
    const hMax = localPos.y + pHeight / 2;

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

  // --- Material for invisible boxes ---
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0,
  });

  // --- CASE 1: No planks → single invisible box ---
  if (planks.length === 0) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, invisibleMat);
    mesh.name = `INVISIBLE_FULL_COMPARTMENT_for_${boxMesh.name}`;
    mesh.userData.isInvisibleBox = true;
    mesh.position.copy(boxCenterLocal); // center in local space
    boxMesh.add(mesh);
    return [mesh];
  }

  const minW = bb.min.x;
  const maxW = bb.max.x;
  const minH = bb.min.y;
  const maxH = bb.max.y;

  // --- CASE 2: Planks exist → build grid in local X/Y ---
  const TARGET_GRID_CELLS = 300; // safe for performance
  const stepW = (maxW - minW) / TARGET_GRID_CELLS;
  const stepH = (maxH - minH) / TARGET_GRID_CELLS;
  const step = Math.max(stepW, stepH);

  const gridWidth = Math.ceil((maxW - minW) / step);
  const gridHeight = Math.ceil((maxH - minH) / step);

  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill('empty'));

  // --- Mark plank areas on grid ---
  planks.forEach((p) => {
    const { wMin, wMax, hMin, hMax } = p;

    const startX = Math.max(0, Math.floor((wMin - minW) / step));
    const endX = Math.min(gridWidth - 1, Math.ceil((wMax - minW) / step));
    const startY = Math.max(0, Math.floor((hMin - minH) / step));
    const endY = Math.min(gridHeight - 1, Math.ceil((hMax - minH) / step));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        grid[y][x] = 'plank';
      }
    }
  });

  // --- Detect empty compartments ---
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

      // grow horizontally
      while (xEnd + 1 < gridWidth && grid[y][xEnd + 1] === 'empty') xEnd++;

      // grow vertically
      let valid = true;
      while (yEnd + 1 < gridHeight && valid) {
        for (let xCheck = x; xCheck <= xEnd; xCheck++) {
          if (grid[yEnd + 1][xCheck] !== 'empty') {
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

      if (compWidth > 0 && compHeight > 0) {
        const pos = new THREE.Vector3(
          centerW,
          centerH,
          boxCenterLocal.z // center in depth
        );

        compartments.push({
          width: compWidth,
          height: compHeight,
          depth,
          position: pos,
        });
      }

      // mark as filled
      for (let fy = y; fy <= yEnd; fy++) {
        for (let fx = x; fx <= xEnd; fx++) {
          grid[fy][fx] = 'filled';
        }
      }
    }
  }

  // --- Create invisible meshes for compartments ---
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
        value: '#00ff00', // Debug color, will be effectively invisible due to opacity
      },
    });
    const mesh = meshBuilder.createMesh();
    // Ensure it has the critical userData needed for interaction
    mesh.userData.isInvisibleBox = true;
    // Set material transparency manually as MeshBuilder might default to opaque if not configured
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
