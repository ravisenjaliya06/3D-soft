//@ts-nocheck
import commonService from '@/services/CommonService';
import gsap from 'gsap';
import { Dispatch } from 'redux';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import {
  applyEdgeBanding,
  convertDataToGeometry,
  createDesign,
} from '../catalog/object-creator';
import { TEXTURES_URLS } from '../constants';
import { createRealisticMaterial } from '../design/loadRealisticScene';
import { mmToMeters } from '../handler/unitConversion';
import {
  generateMinifixSystem,
  PlankData,
  visualizeMinifixConnections,
} from '../minifix';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { Object3D, Position } from '../store/interface';
import { objectName } from './constant';
import {
  AllItemsData,
  CatalogResponse,
  ITEM,
  PLANK,
  PlankDataItem,
} from './interface';
import { MoveHandler } from './moveHandler';
import { addCabinetItemToDesign } from './toolbar';
import { updateObjectInDatabase } from './updateHandler';

let moveHandler: MoveHandler | null = null;

function initializeMoveHandler(options: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}) {
  moveHandler = new MoveHandler({
    scene: options.scene,
    camera: options.camera,
    renderer: options.renderer,
    movableObjects: [],
  });
}

export function showFullScreenLoader(message = 'Loading...') {
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
  const loader = document.getElementById('global-loader');
  if (loader) loader.remove();
}

export function generateCompartmentsFromMesh(boxMesh: THREE.Mesh) {
  if (!boxMesh) return [];

  // --- Remove previous invisible boxes ---
  const toRemove: THREE.Object3D[] = [];
  boxMesh.traverse((child) => {
    if (child.userData.isInvisibleBox) toRemove.push(child);
  });
  toRemove.forEach((c) => boxMesh.remove(c));

  // --- Determine orientation and grid axes ---
  let widthAxis: 'x' | 'z' = 'x';
  let heightAxis: 'y' | 'z' = 'y';
  let depthAxis: 'x' | 'y' | 'z' = 'z';

  if (boxMesh.name.includes('leftwall') || boxMesh.name.includes('rightwall')) {
    widthAxis = 'z';
    heightAxis = 'y';
    depthAxis = 'x';
  } else {
    widthAxis = 'x';
    heightAxis = 'y';
    depthAxis = 'z';
  }

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

  boxMesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.userData.type !== 'Plank') return;

    const geom = child.geometry as THREE.BoxGeometry;
    const { width, height, depth } = geom.parameters;
    const worldPos = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    const localPos = boxMesh.worldToLocal(worldPos.clone());

    planks.push({
      name: child.name,
      width,
      height,
      depth,
      position: localPos,
      wMin: localPos[widthAxis] - width / 2,
      wMax: localPos[widthAxis] + width / 2,
      hMin: localPos[heightAxis] - height / 2,
      hMax: localPos[heightAxis] + height / 2,
    });
  });

  // --- Get total bounding box of container ---
  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const width = size[widthAxis];
  const height = size[heightAxis];
  const depth = size[depthAxis];

  const boxCenterLocal = boxMesh.worldToLocal(center.clone());

  // --- Material for invisible boxes ---
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0,
  });

  // --- CASE 1: No planks found → single invisible box ---
  if (planks.length === 0) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, invisibleMat);
    mesh.name = `INVISIBLE_FULL_COMPARTMENT_for_${boxMesh.name}`;
    mesh.userData.isInvisibleBox = true;
    mesh.position.copy(boxCenterLocal);
    boxMesh.add(mesh);
    return [mesh];
  }

  // --- CASE 2: Planks exist → build grid ---
  const step = 0.01;
  const minW = -width / 2;
  const maxW = width / 2;
  const minH = -height / 2;
  const maxH = height / 2;

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

      while (xEnd + 1 < gridWidth && grid[y][xEnd + 1] === 'empty') xEnd++;

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
        const pos = new THREE.Vector3();
        pos[widthAxis] = centerW;
        pos[heightAxis] = centerH;
        pos[depthAxis] = boxCenterLocal[depthAxis];

        compartments.push({
          width: compWidth,
          height: compHeight,
          depth,
          position: pos,
        });
      }

      for (let fy = y; fy <= yEnd; fy++) {
        for (let fx = x; fx <= xEnd; fx++) {
          grid[fy][fx] = 'filled';
        }
      }
    }
  }

  const meshes: THREE.Mesh[] = [];
  compartments.forEach((c, idx) => {
    const geo = new THREE.BoxGeometry(c.width, c.height, c.depth);
    const mesh = new THREE.Mesh(geo, invisibleMat);
    mesh.position.copy(c.position);
    mesh.name = `INVISIBLE_COMPARTMENT_${idx}_for_${boxMesh.name}`;
    mesh.userData.objectId = uuidv4();
    mesh.userData.isInvisibleBox = true;
    boxMesh.add(mesh);
    meshes.push(mesh);
  });

  return meshes;
}

export function generateCompartmentsFromPlanks(
  plankData: PlankDataItem[],
  objectName?: string,
) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let depth = 0;

  const internalPlanks = plankData;

  internalPlanks.forEach((p) => {
    const { width, height, depth: d, position } = p;
    const smallest = Math.min(width, height, d);

    const left = position.x - width / 2 + smallest;
    const right = position.x + width / 2 - smallest;
    const bottom = position.y - height / 2 + smallest;
    const top = position.y + height / 2 - smallest;

    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, bottom);
    maxY = Math.max(maxY, top);
    depth = Math.max(depth, d || 0);
  });
  depth = Math.max(...plankData.map((p) => p.depth || 0));

  const step = 1;
  const gridWidth = Math.ceil((maxX - minX) / step);
  const gridHeight = Math.ceil((maxY - minY) / step);
  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill('empty'));

  internalPlanks.forEach((p) => {
    const { width, height, position, name } = p;
    if (
      name.includes('VERTICAL') ||
      name.includes('HORIZONTAL') ||
      name.includes(ITEM.DRAWER)
    ) {
      const startX = Math.round((position.x - width / 2 - minX) / step);
      const endX = Math.round((position.x + width / 2 - minX) / step);
      const startY = Math.round((position.y - height / 2 - minY) / step);
      const endY = Math.round((position.y + height / 2 - minY) / step);

      for (
        let y = Math.max(0, startY);
        y <= Math.min(gridHeight - 1, endY);
        y++
      ) {
        for (
          let x = Math.max(0, startX);
          x <= Math.min(gridWidth - 1, endX);
          x++
        ) {
          grid[y][x] = 'plank';
        }
      }
    }
  });

  const compartments: {
    width: number;
    height: number;
    depth: number;
    position: Position;
  }[] = [];

  if (objectName?.includes('HORIZONTAL')) {
    for (let y = 0; y < gridHeight; y++) {
      let startX = 0;
      for (let x = 0; x <= gridWidth; x++) {
        if (x === gridWidth || grid[y][x] === 'plank') {
          if (x > startX) {
            const width = (x - startX) * step;
            const height = step;
            const centerX = minX + (startX + (x - startX) / 2) * step;
            const centerY = minY + y * step + step / 2;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startX = x + 1;
        }
      }
    }
  } else if (objectName?.includes('VERTICAL')) {
    for (let x = 0; x < gridWidth; x++) {
      let startY = 0;
      for (let y = 0; y <= gridHeight; y++) {
        if (y === gridHeight || grid[y][x] === 'plank') {
          if (y > startY) {
            const width = step;
            const height = (y - startY) * step;
            const centerX = minX + x * step + step / 2;
            const centerY = minY + (startY + (y - startY) / 2) * step;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startY = y + 1;
        }
      }
    }
  } else if (objectName?.includes(ITEM.DRAWER)) {
    for (let y = 0; y < gridHeight; y++) {
      let startX = 0;
      for (let x = 0; x <= gridWidth; x++) {
        if (x === gridWidth || grid[y][x] === 'plank') {
          if (x > startX) {
            const width = (x - startX) * step;
            const height = step;
            const centerX = minX + (startX + (x - startX) / 2) * step;
            const centerY = minY + y * step + step / 2;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startX = x + 1;
        }
      }
    }
  } else {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] === 'empty') {
          let bottomRightX = x;
          let bottomRightY = y;

          while (
            bottomRightX + 1 < gridWidth &&
            grid[y][bottomRightX + 1] === 'empty'
          ) {
            let valid = true;
            for (let yCheck = y; yCheck <= bottomRightY; yCheck++) {
              if (grid[yCheck][bottomRightX + 1] !== 'empty') {
                valid = false;
                break;
              }
            }
            if (!valid) break;
            bottomRightX++;
          }

          while (
            bottomRightY + 1 < gridHeight &&
            grid[bottomRightY + 1][x] === 'empty'
          ) {
            let valid = true;
            for (let xCheck = x; xCheck <= bottomRightX; xCheck++) {
              if (grid[bottomRightY + 1][xCheck] !== 'empty') {
                valid = false;
                break;
              }
            }
            if (!valid) break;
            bottomRightY++;
          }

          const width = (bottomRightX - x + 1) * step;
          const height = (bottomRightY - y + 1) * step;
          const centerX = minX + (x + (bottomRightX - x) / 2) * step;
          const centerY = minY + (y + (bottomRightY - y) / 2) * step;

          if (width > 0 && height > 0) {
            compartments.push({
              width,
              height,
              depth,
              position: { x: centerX, y: centerY, z: 0 },
            });
          }

          for (let fillY = y; fillY <= bottomRightY; fillY++) {
            for (let fillX = x; fillX <= bottomRightX; fillX++) {
              grid[fillY][fillX] = 'plank';
            }
          }
        }
      }
    }
  }

  return compartments.filter((comp) => comp.width > 0 && comp.height > 0);
}

async function createChildObjectFromCatalogItem(
  item: CatalogItemData,
  parentMesh: THREE.Object3D | null,
  scene: THREE.Scene,
): Promise<Object3D | null> {
  try {
    if (!parentMesh) {
      console.warn('Parent mesh is null for child item', item.id);
      return null;
    }

    const nameLower = (item?.name || '').toLowerCase();
    const itemType = item.data?.catalog_type || '';
    let createdMesh: THREE.Object3D | null = null;

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(
        `Creating child object: ${item.name}, type: ${itemType}, parent: ${parentMesh?.name}`,
      );
    }

    // Create invisible box for positioning
    const invisibleBox = new THREE.Mesh(
      new THREE.BoxGeometry(
        item.data?.width || 0.5,
        item.data?.height || 0.5,
        item.data?.depth || 0.5,
      ),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    invisibleBox.name = `invisibleBox_${item.id}`;
    invisibleBox.userData.objectId = `invisibleBox_${item.id}`;

    // Position relative to parent container
    const parentBbox = new THREE.Box3().setFromObject(parentMesh);
    const parentSize = new THREE.Vector3();
    parentBbox.getSize(parentSize);

    // Calculate position relative to parent's center
    const relativePosition = {
      x: (item.data?.position?.x || 0) - parentMesh.position.x,
      y: (item.data?.position?.y || 0) - parentMesh.position.y,
      z: (item.data?.position?.z || 0) - parentMesh.position.z,
    };

    invisibleBox.position.set(
      relativePosition.x,
      relativePosition.y,
      relativePosition.z,
    );
    parentMesh.add(invisibleBox);

    if (itemType === 'Door' || itemType === 'Sliding Door') {
      // Create door
      const doorTexture = new THREE.TextureLoader().load('/Texture0004.jpg');
      doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
      doorTexture.repeat.set(2, 1);

      const doorFace = new THREE.Mesh(
        new THREE.BoxGeometry(
          item.data?.width || 0.4,
          item.data?.height || 0.8,
          0.02,
        ),
        new THREE.MeshStandardMaterial({
          map: doorTexture,
          side: THREE.DoubleSide,
        }),
      );
      doorFace.name = `Door_${item.id}`;
      doorFace.userData.openDirection = 'right';
      doorFace.userData.objectId = item.id;

      const doorGroup = new THREE.Group();
      doorGroup.name = `DoorGroup_${item.id}`;
      doorGroup.userData.type = 'DOOR';
      doorGroup.userData.objectId = item.id;
      doorGroup.userData.apiData = item;

      doorGroup.add(doorFace);
      doorGroup.position.copy(invisibleBox.position);
      parentMesh.add(doorGroup);
      createdMesh = doorGroup;
    } else if (itemType === 'Drawer') {
      // Create drawer
      const drawerGroup = new THREE.Group();
      drawerGroup.name = `DrawerGroup_${item.id}`;
      drawerGroup.userData.type = 'DRAWER';
      drawerGroup.userData.objectId = item.id;
      drawerGroup.userData.apiData = item;
      drawerGroup.userData.isClosed = true;
      drawerGroup.userData.closedPos = invisibleBox.position.clone();

      // Create drawer face
      const drawerFace = new THREE.Mesh(
        new THREE.BoxGeometry(
          item.data?.width || 0.4,
          item.data?.height || 0.2,
          0.02,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd9c7b8,
          roughness: 0.7,
        }),
      );
      drawerFace.name = `DrawerFace_${item.id}`;
      drawerFace.userData.objectId = item.id;

      drawerGroup.add(drawerFace);
      drawerGroup.position.copy(invisibleBox.position);
      parentMesh.add(drawerGroup);
      createdMesh = drawerGroup;
    } else if (itemType === 'Plank' || nameLower.includes('plank')) {
      // Create plank
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(
          `Creating plank: ${item.name}, type: ${itemType}, dimensions: ${item.data?.width}x${item.data?.height}x${item.data?.depth}`,
        );
      }

      const plankMaterial = new THREE.MeshStandardMaterial({
        color: 0xd9c7b8,
        roughness: 0.7,
      });

      let plankMesh: THREE.Mesh;
      if (nameLower.includes('vertical')) {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.018, // thickness
            item.data?.height || 0.8,
            item.data?.depth || 0.4,
          ),
          plankMaterial,
        );
        plankMesh.name = `VerticalPlank_${item.id}`;
      } else if (nameLower.includes('horizontal')) {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            item.data?.width || 0.4,
            0.018, // thickness
            item.data?.depth || 0.4,
          ),
          plankMaterial,
        );
        plankMesh.name = `HorizontalPlank_${item.id}`;
      } else {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            item.data?.width || 0.4,
            item.data?.height || 0.8,
            0.018, // thickness
          ),
          plankMaterial,
        );
        plankMesh.name = `Plank_${item.id}`;
      }

      plankMesh.userData.objectId = item.id;
      plankMesh.userData.apiData = item;
      plankMesh.position.copy(invisibleBox.position);

      parentMesh.add(plankMesh);
      createdMesh = plankMesh;

      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(
          `Successfully created plank mesh: ${plankMesh.name} at position:`,
          plankMesh.position,
        );
      }
    }

    // Convert to Object3D format
    if (createdMesh) {
      const object3D: Object3D = {
        id: item.id,
        name: item.name || '',
        width: item.data?.width || 0,
        height: item.data?.height || 0,
        depth: item.data?.depth || 0,
        altitude: item.data?.altitude || 0,
        position: item.data?.position || { x: 0, y: 0, z: 0 },
        material: item.data?.material || { type: 'TEXTURE', value: 'default' },
        parent: item.data?.parent || null,
        child: item.data?.child || [],
        grooves: item.data?.grooves || [],
        catalog_type: item.data?.catalog_type || '',
        layer: item.data?.layer || 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      };

      return object3D;
    }

    return null;
  } catch (error) {
    console.error('Error creating child object from catalog item:', error);
    return null;
  }
}

async function createChildObjectFromData(
  item: CatalogResponse,
  parentMesh: THREE.Mesh,
  scene: THREE.Scene,
): Promise<Object3D | null> {
  try {
    const nameLower = (item?.name || '').toLowerCase();
    const itemType = item.type || '';
    let createdMesh: THREE.Object3D | null = null;

    // Create invisible box for positioning
    const invisibleBox = new THREE.Mesh(
      new THREE.BoxGeometry(
        item.data?.width || 0.5,
        item.data?.height || 0.5,
        item.data?.depth || 0.5,
      ),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    invisibleBox.name = `invisibleBox_${item.id}`;
    invisibleBox.userData.objectId = `invisibleBox_${item.id}`;

    // Position relative to parent container
    const parentBbox = new THREE.Box3().setFromObject(parentMesh);
    const parentSize = new THREE.Vector3();
    parentBbox.getSize(parentSize);

    // Calculate position relative to parent's center
    const relativePosition = {
      x: (item.data?.position?.x || 0) - parentMesh.position.x,
      y: (item.data?.position?.y || 0) - parentMesh.position.y,
      z: (item.data?.position?.z || 0) - parentMesh.position.z,
    };

    invisibleBox.position.set(
      relativePosition.x,
      relativePosition.y,
      relativePosition.z,
    );
    parentMesh.add(invisibleBox);

    if (itemType === 'Door' || itemType === 'Sliding Door') {
      // Create door
      const doorTexture = new THREE.TextureLoader().load('/Texture0004.jpg');
      doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
      doorTexture.repeat.set(2, 1);

      const doorFace = new THREE.Mesh(
        new THREE.BoxGeometry(
          item.data?.width || 0.4,
          item.data?.height || 0.8,
          0.02,
        ),
        new THREE.MeshStandardMaterial({
          map: doorTexture,
          side: THREE.DoubleSide,
        }),
      );
      doorFace.name = `Door_${item.id}`;
      doorFace.userData.openDirection = 'right';
      doorFace.userData.objectId = item.id;

      const doorGroup = new THREE.Group();
      doorGroup.name = `DoorGroup_${item.id}`;
      doorGroup.userData.type = 'DOOR';
      doorGroup.userData.objectId = item.id;
      doorGroup.userData.apiData = item;

      doorGroup.add(doorFace);
      doorGroup.position.copy(invisibleBox.position);
      parentMesh.add(doorGroup);
      createdMesh = doorGroup;
    } else if (itemType === 'Drawer') {
      // Create drawer
      const drawerGroup = new THREE.Group();
      drawerGroup.name = `DrawerGroup_${item.id}`;
      drawerGroup.userData.type = 'DRAWER';
      drawerGroup.userData.objectId = item.id;
      drawerGroup.userData.apiData = item;
      drawerGroup.userData.isClosed = true;
      drawerGroup.userData.closedPos = invisibleBox.position.clone();

      // Create drawer face
      const drawerFace = new THREE.Mesh(
        new THREE.BoxGeometry(
          item.data?.width || 0.4,
          item.data?.height || 0.2,
          0.02,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd9c7b8,
          roughness: 0.7,
        }),
      );
      drawerFace.name = `DrawerFace_${item.id}`;
      drawerFace.userData.objectId = item.id;

      drawerGroup.add(drawerFace);
      drawerGroup.position.copy(invisibleBox.position);
      parentMesh.add(drawerGroup);
      createdMesh = drawerGroup;
    } else if (itemType === 'Plank') {
      // Create plank
      const plankMaterial = new THREE.MeshStandardMaterial({
        color: 0xd9c7b8,
        roughness: 0.7,
      });

      let plankMesh: THREE.Mesh;
      if (nameLower.includes('vertical')) {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.018, // thickness
            item.data?.height || 0.8,
            item.data?.depth || 0.4,
          ),
          plankMaterial,
        );
        plankMesh.name = `VerticalPlank_${item.id}`;
      } else if (nameLower.includes('horizontal')) {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            item.data?.width || 0.4,
            0.018, // thickness
            item.data?.depth || 0.4,
          ),
          plankMaterial,
        );
        plankMesh.name = `HorizontalPlank_${item.id}`;
      } else {
        plankMesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            item.data?.width || 0.4,
            item.data?.height || 0.8,
            0.018, // thickness
          ),
          plankMaterial,
        );
        plankMesh.name = `Plank_${item.id}`;
      }

      plankMesh.userData.objectId = item.id;
      plankMesh.userData.apiData = item;
      plankMesh.position.copy(invisibleBox.position);

      parentMesh.add(plankMesh);
      createdMesh = plankMesh;
    }

    // Convert to Object3D format
    if (createdMesh) {
      const object3D: Object3D = {
        id: item.id,
        name: item.name || '',
        width: item.data?.width || 0,
        height: item.data?.height || 0,
        depth: item.data?.depth || 0,
        altitude: 0,
        position: item.data?.position || { x: 0, y: 0, z: 0 },
        material: item.data?.material || { type: 'TEXTURE', value: 'default' },
        parent: item.parent || null,
        child: [],
        grooves: item.grooves || [],
        catalog_type: item.data?.catalog_type || '',
        layer: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      };

      return object3D;
    }

    return null;
  } catch (error) {
    console.error('Error creating child object from data:', error);
    return null;
  }
}

export async function createMeshRecursively(
  data,
  parent: THREE.Object3D | null = null,
  scene?: THREE.Scene,
): Promise<THREE.Mesh | null> {
  showFullScreenLoader('Loading design objects...');
  if (!data) return null;

  // --- STEP 1: Create main object ---
  const width = mmToMeters(data.width || data.length) || 1;
  const height = mmToMeters(data.height || 1);
  const depth = mmToMeters(data.depth || 1);

  const geometry = new THREE.BoxGeometry(width, height, depth);

  let material: THREE.Material;
  if (data.type === 'Invisible Compartment' || data.type === 'Cabinet' || data.type === 'Drawer') {
    material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
  } else if (data.additional_data?.texture) {
    const textureLoader = new THREE.TextureLoader();
    const woodTex = textureLoader.load(data.additional_data.texture);
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(2, 1);

    material = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.6,
      metalness: 0,
    });
  } else if (data.additional_data?.color) {
    const colorValue = parseInt(data.additional_data.color, 16);
    material = new THREE.MeshStandardMaterial({
      color: colorValue,
      roughness: 0.8,
    });
  } else {
    material = await createRealisticMaterial(scene, {
      textures: TEXTURES_URLS.PLATFORM,
      repeatX: 10,
      repeatY: 1,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name || data.type || 'Unknown';
  mesh.userData = { ...data };

  if (data.position) {
    mesh.position.set(
      mmToMeters(data.position.x) || 0,
      mmToMeters(data.position.y) || 0,
      mmToMeters(data.position.z) || 0,
    );
  }

  if (Array.isArray(data.catalog_rule)) {
    for (const rule of data.catalog_rule) {
      if (Array.isArray(rule.rule_parts) && rule.name === 'Panel') {
        for (const part of rule.rule_parts) {
          const partWidth = mmToMeters(part.width || part.length) || 1;
          const partHeight = mmToMeters(part.height || 1);
          const partDepth = mmToMeters(part.depth || 1);

          const partGeometry = new THREE.BoxGeometry(
            partWidth,
            partHeight,
            partDepth,
          );

          let material: THREE.Material;
          if (data.additional_data?.texture) {
            const textureLoader = new THREE.TextureLoader();
            const woodTex = textureLoader.load(data.additional_data.texture);
            woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
            woodTex.repeat.set(2, 1);

            material = new THREE.MeshStandardMaterial({
              map: woodTex,
              roughness: 0.6,
              metalness: 0,
            });
          } else if (data.additional_data?.color) {
            const colorValue = parseInt(data.additional_data.color, 16);
            material = new THREE.MeshStandardMaterial({
              color: colorValue,
              roughness: 0.8,
            });
          } else {
            material = await createRealisticMaterial(scene, {
              textures: TEXTURES_URLS.PLATFORM,
              repeatX: 10,
              repeatY: 1,
            });
          }

          const partMesh = new THREE.Mesh(partGeometry, material);
          partMesh.name = part.name || 'RulePart';
          partMesh.userData = { ...part, type: 'RulePart' };

          if (part.position) {
            partMesh.position.set(
              mmToMeters(part.position.x) || 0,
              mmToMeters(part.position.y) || 0,
              mmToMeters(part.position.z) || 0,
            );
          }
          mesh.add(partMesh);
        }
      } else if (rule.name.includes('Handle')) {
      }
    }
  }

  // --- STEP 3: Recursively create children ---
  if (Array.isArray(data.children) && data.children.length > 0) {
    for (const child of data.children) {
      const childMesh = await createMeshRecursively(child, mesh, scene);
      if (childMesh) mesh.add(childMesh);
    }
  }

  // --- STEP 4: Add to scene or parent ---
  mesh.userData.objectId = data.id;
  if (parent) {
    parent.add(mesh);
  } else if (scene) {
    mesh.userData.isMain = true;
    scene.add(mesh);
    generateCompartmentsFromMesh(mesh);
  }

  hideFullScreenLoader();
  return mesh;
}

async function loadDesignObjects(
  designId: string,
  scene: THREE.Scene,
): Promise<Object3D[]> {
  try {
    const response: { status: number; data: CatalogResponse[] } =
      await commonService.getWithQueryParam(
        'material',
        'catalog',
        'design_id',
        designId,
      );
    if (response.status === 200 && response.data) {
      const data = response.data;
      const createdObjects: Object3D[] = [];
      for (const item of data) {
        createMeshRecursively(item, null, scene);
      }
      return createdObjects;
    }
  } catch (error) {
    console.error('Error loading design objects:', error);
    return [];
  }
}

async function regenerateInvisibleBoxes(
  scene: THREE.Scene,
  objects: Object3D[],
) {
  try {
    // Find all cabinet objects
    const cabinetObjects = objects.filter(
      (obj) => obj.catalog_type === 'Cabinet' && !obj.parent,
    );

    for (const cabinet of cabinetObjects) {
      const cabinetMesh = scene.children.find(
        (child) => child.userData.objectId === cabinet.id,
      ) as THREE.Mesh;

      if (!cabinetMesh) continue;

      // Get all planks for this cabinet
      const plankObjects = objects.filter(
        (obj) =>
          obj.parent === cabinet.id &&
          (obj.name.includes('Plank') ||
            obj.name.includes('VERTICAL') ||
            obj.name.includes('HORIZONTAL')),
      );

      if (plankObjects.length > 0) {
        // Remove existing invisible boxes
        const existingBoxes: THREE.Mesh[] = [];
        cabinetMesh.traverse((child) => {
          if (
            child.name.includes('invisibleBox') &&
            child instanceof THREE.Mesh
          ) {
            existingBoxes.push(child);
          }
        });
        existingBoxes.forEach((box) => {
          cabinetMesh.remove(box);
          box.geometry.dispose();
          if (box.material instanceof THREE.Material) {
            box.material.dispose();
          }
        });

        // Generate new compartments
        const plankDataList: PlankDataItem[] = plankObjects.map((obj) => ({
          id: obj.id,
          name: obj.name,
          width: obj.width,
          height: obj.height,
          depth: obj.depth,
          position: obj.position,
        }));

        const compartments = generateCompartmentsFromPlanks(plankDataList);

        // Create new invisible boxes
        compartments.forEach((compartment, index) => {
          const geometry = new THREE.BoxGeometry(
            compartment.width,
            compartment.height,
            compartment.depth,
          );
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
          });
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            compartment.position.x,
            compartment.position.y,
            compartment.position.z,
          );
          box.name = 'invisibleBox';
          box.userData = {
            objectId: `invisibleBox_${index}_${cabinet.id}`,
          };
          cabinetMesh.add(box);
        });
      }
    }
  } catch (error) {
    console.error('Error regenerating invisible boxes:', error);
  }
}

interface CatalogData {
  id: string;
  name: string;
  width?: number;
  height?: number;
  depth?: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  material?: {
    type: string;
    value: string;
  };
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  plankSize?: number;
  catalog_type?: string;

  [key: string]: unknown;
}

interface CatalogListItem {
  catalog: {
    id: string;
    name: string;
    data: CatalogData;
  };
  items?: Array<{
    id: string;
    name: string;
    data: CatalogData;
  }>;
  child_catalogs?: Array<{
    catalog: {
      id: string;
      name: string;
      data: CatalogData;
    };
    items?: Array<{
      id: string;
      name: string;
      data: CatalogData;
    }>;
  }>;
}

interface CreateResult {
  objectsList: Object3D[];
  mainObjects: Object3D[];
  catalogMap: Record<string, Object3D[]>;
}

async function create(
  name: string,
  catalogList: { catalog: CatalogListItem[][] },
  element: THREE.Mesh,
): Promise<CreateResult | null> {
  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogListItem) => catObj.catalog.name === name,
  );

  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('catalog_id', catalogEntry?.catalog.id || '');
    const response = await commonService.post(
      'design',
      `${designId}/object`,
      formData,
    );

    if (response.status === 200 || response.status === 201) {
      if (response.data) {
        const responseData: CatalogResponse[] = response.data;
        const allObjects: Object3D[] = [];
        const mainObjects: Object3D[] = [];
        const catalogMap: { [key: string]: Object3D[] } = {};

        responseData.forEach((entry) => {
          const mainObject: Object3D = {
            id: entry.id,
            name: entry.name || '',
            width: entry.data?.width || 0,
            height: entry.data?.height || 0,
            depth: entry.data?.depth || 0,
            altitude: 0,
            position: entry.data?.position || { x: 0, y: 0, z: 0 },
            material: entry.data?.material || {
              type: 'TEXTURE',
              value: 'default',
            },
            parent: entry.parent || null,
            grooves: entry.grooves || [],
            catalog_type: entry.data?.catalog_type ?? '',
            child: [],
            layer: 0,
            rotationZ: 0,
            rotationX: 0,
            rotationY: 0,
          };
          const childObjects = entry.design_catalog_items?.map((item) => ({
            id: item.id,
            name: item.data.name,
            width: item.data.width,
            height: item.data.height,
            depth: item.data.depth,
            altitude: item.data.altitude,
            position: item.data.position,
            material: item.data.material,
            parent: entry.id,
            child: item.data.child || [],
            grooves: item.data.grooves || [],
            catalog_type: item.data.catalog_type,
            layer: item.data.layer,
            rotationZ: 0,
            rotationX: 0,
            rotationY: 0,
          }));

          mainObject.child = childObjects?.map((child) => child.id) || [];

          catalogMap[entry.name || ''] = [mainObject, ...(childObjects || [])];
          if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
            console.log('catalogMap', catalogMap);
          }
          allObjects.push(mainObject, ...(childObjects || []));

          if (!entry.parent) {
            mainObjects.push(mainObject);
          }
        });

        responseData.forEach((entry) => {
          if (entry.parent) {
            const parentObj = allObjects.find((o) => o.id === entry.parent);
            if (parentObj && !parentObj.child.includes(entry.id)) {
              parentObj.child.push(entry.id);
            }
          }
        });

        const allItems: AllItemsData[] = [];

        for (const entry of responseData) {
          const itemIds =
            entry.design_catalog_items?.map((item) => item.id) || [];

          for (const obj of allObjects) {
            let matchedMesh: THREE.Object3D | undefined;

            element.traverse((child) => {
              if (child.name === obj.name) {
                matchedMesh = child;
              }
            });

            if (matchedMesh) {
              matchedMesh.userData.objectId = obj.id;
            } else {
              console.warn(`No mesh matched for ${obj.name}`);
            }
          }

          for (const itemId of itemIds) {
            const matchingPlank = element.children.find(
              (child: object) =>
                child instanceof THREE.Mesh &&
                child.userData.objectId === itemId,
            ) as THREE.Mesh | undefined;

            if (matchingPlank && matchingPlank.userData?.grooves?.length > 0) {
              const itemEntry = entry.design_catalog_items?.find(
                (item) => item.id === itemId,
              );

              if (itemEntry) {
                allItems.push({
                  id: itemEntry.id,
                  name: itemEntry.data.name,
                  data: {
                    ...itemEntry.data,
                    grooves: matchingPlank.userData.grooves,
                  },
                });
              }
            }
          }
        }

        if (allItems.length > 0) {
          const data = {
            data: {
              catalog: {
                id: mainObjects[0].id,
                name: mainObjects[0].name,
              },
              items: allItems,
            },
          };

          const patchResponse = await commonService.put(
            'design',
            `${designId}/object`,
            data as unknown as FormData,
          );

          if (patchResponse.status === 200) {
            for (const entry of patchResponse.data) {
              for (const item of entry.design_catalog_items || []) {
                const target = allObjects.find((obj) => obj.id === item.id);
                if (target && item.data?.grooves) {
                  target.grooves = item.data.grooves;
                }
              }
            }
          } else {
            console.error(`Failed to update grooves`, patchResponse);
          }
        }

        return {
          objectsList: allObjects,
          mainObjects,
          catalogMap,
        };
      }
    } else {
      console.error('Failed to create object:', response);
    }
  } catch (error) {
    console.error('Error creating object:', error);
  }
  return null;
}

interface NormalizeInputData {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  altitude?: number;
  position?: { x: number; y: number; z: number };
  material?: { type: string; value: string };
  parent?: string | null;
  child?: string[];
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
}

function normalizeObjectData(
  input: NormalizeInputData,
  defaults: Partial<Object3D> = {},
): Object3D {
  const normalized: Object3D = {
    id: input.id || defaults.id || crypto.randomUUID(),
    name: input.name || defaults.name || 'Unnamed_Object',
    width: input.width || defaults.width || 0,
    height: input.height || defaults.height || 0,
    depth: input.depth || defaults.depth || 0,
    altitude: input.altitude || defaults.altitude || 0,
    position: input.position || defaults.position || { x: 0, y: 0, z: 0 },
    material: input.material ||
      defaults.material || { type: 'TEXTURE', value: 'default' },
    parent: input.parent || defaults.parent || null,
    child: input.child || defaults.child || [],
    layer: input.layer || defaults.layer || 0,
    rotationX: input.rotationX ?? input.rotateX ?? defaults.rotationX ?? 0,
    rotationY: input.rotationY ?? input.rotateY ?? defaults.rotationY ?? 0,
    rotationZ: input.rotationZ ?? input.rotateZ ?? defaults.rotationZ ?? 0,
  };
  return normalized;
}

interface CreateItemResponse {
  id: string;
  status: number;
  data: {
    id: string;
    name: string;
    data: CatalogData;
  };
}
async function createItem(
  name: string,
  catalogList: { catalog: CatalogListItem[][] },
  parentId: string,
  threeDObject: THREE.Mesh,
  finalPosition: THREE.Vector3,
  dispatch: Dispatch,
  dataObjects?: Object3D[],
  scene?: THREE.Scene,
): Promise<CreateItemResponse | null> {
  const objectData: Object3D[] = [];
  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogListItem) => catObj.catalog.name === name,
  );
  const width = (threeDObject.geometry as THREE.BoxGeometry).parameters.width;
  const height = (threeDObject.geometry as THREE.BoxGeometry).parameters.height;
  const depth = (threeDObject.geometry as THREE.BoxGeometry).parameters.depth;
  const position = threeDObject.parent?.position || { x: 0, y: 0, z: 0 };
  const mainObject: THREE.Mesh = threeDObject.parent?.parent as THREE.Mesh;
  threeDObject.position.copy(position || { x: 0, y: 0, z: 0 });
  if (threeDObject.name === objectName.HORIZONTAL_PLANK) {
    threeDObject.position.y += finalPosition.y;
  } else if (threeDObject.name === objectName.VERTICAL_PLANK) {
    threeDObject.position.x += finalPosition.x;
    threeDObject.position.y -= 0.5;
  }

  mainObject.add(threeDObject);

  const { x, y, z } = threeDObject.position;
  if (!catalogEntry) {
    console.error('Catalog entry not found for:', name);
    return null;
  }

  const fullCatalogData = catalogEntry.catalog.data;
  const clonedData = {
    ...fullCatalogData,
    width,
    height,
    depth,
    position: { x: x, y: y, z: z },
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  };

  const normalizedData = normalizeObjectData(clonedData, {
    name,
    parent: parentId,
  });

  objectData.push(normalizedData);

  if (
    threeDObject.name.includes(ITEM.PLANK) ||
    threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const allObjects: Object3D[] = store.getState().data.objects || [];
    const cupboards = allObjects.filter(
      (obj) =>
        !obj.name.includes(ITEM.PLANK) &&
        !obj.name.includes(ITEM.DOOR) &&
        !obj.name.includes(ITEM.DRAWER) &&
        (obj.parent === null || obj.parent === undefined),
    );

    // Find the cupboard this plank belongs to
    const targetCupboard = cupboards.find(
      (cupboard) => cupboard.id === parentId,
    );

    if (targetCupboard) {
      const cupboardObject = scene?.children.find(
        (obj) => obj.userData.objectId === targetCupboard.id,
      ) as THREE.Mesh;

      if (cupboardObject) {
        // Get all existing planks + the new plank
        const existingPlanks = allObjects
          .filter(
            (obj) =>
              obj.parent === targetCupboard.id &&
              (obj.name.includes(ITEM.PLANK) ||
                obj.name.includes(ITEM.DRAWER)) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            id: obj.id,
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
            parent: obj.parent,
            material: obj.material,
          }));

        const allPlanks: PlankData[] = [...existingPlanks];

        if (!normalizedData.name.includes('DRAWER')) {
          const newPlankData = {
            id: normalizedData.id,
            name: normalizedData.name,
            width: normalizedData.width,
            height: normalizedData.height,
            depth: normalizedData.depth,
            position: normalizedData.position,
            parent: normalizedData.parent,
            material: normalizedData.material,
          };
          allPlanks.push(newPlankData);
        }

        try {
          // 🔧 GENERATE MINIFIX SYSTEM WITH NEW PLANK
          const minifixSystem = generateMinifixSystem(
            targetCupboard.id,
            allPlanks,
          );

          if (minifixSystem.connections.length > 0) {
            // 🔧 CLEAR EXISTING MINIFIX VISUALIZATIONS
            const existingMinifixObjects: THREE.Object3D[] = [];
            cupboardObject.traverse((child) => {
              if (
                child.name.startsWith('Minifix_Screw_') ||
                child.name.startsWith('Minifix_Cam_') ||
                child.name.startsWith('Minifix_Dowel_') ||
                child.name.startsWith('Minifix_BoltDrill_')
              ) {
                existingMinifixObjects.push(child);
              }
            });

            existingMinifixObjects.forEach((obj) => {
              cupboardObject.remove(obj);
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) {
                  obj.material.dispose();
                }
              }
            });

            // 🔧 ADD NEW MINIFIX VISUALIZATIONS
            visualizeMinifixConnections(
              minifixSystem.connections,
              cupboardObject,
            );

            // 🔧 UPDATE CUPBOARD WITH NEW MINIFIX DATA
            const updatedCupboard = {
              ...targetCupboard,
              minifixConnections: minifixSystem.connections,
            };

            // 🔧 UPDATE DATABASE WITH NEW MINIFIX DATA
            const designId = getDesignId();
            if (designId) {
              const allItems = minifixSystem.planksWithHoles
                .filter((plank) => !plank.name.includes(ITEM.DRAWER))
                .map((plank) => ({
                  id: plank.id,
                  name: plank.name,
                  data: {
                    ...plank,
                    minifixHoles:
                      plank.minifixHoles?.map((hole) => ({
                        type: hole.type,
                        connectorId: hole.connectorId,
                        position: hole.position,
                        direction: hole.direction,
                        diameter: hole.diameter,
                        depth: hole.depth,
                        length: hole.length,
                        localPosition2D: hole.localPosition2D,
                      })) || [],
                  },
                }));

              const data = {
                data: {
                  catalog: {
                    id: updatedCupboard.id,
                    name: updatedCupboard.name,
                    data: updatedCupboard,
                  },
                  items: allItems,
                },
              };

              try {
                const patchResponse = await commonService.put(
                  'design',
                  `${designId}/object`,
                  data,
                );

                if (
                  patchResponse.status === 200 ||
                  patchResponse.status === 201
                ) {
                  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                    console.log(
                      'Minifix data updated in database after adding new plank',
                    );
                  }
                } else {
                  console.error(
                    'Failed to update Minifix data in database:',
                    patchResponse,
                  );
                }
              } catch (error) {
                console.error(
                  'Error updating Minifix data in database:',
                  error,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            'Error generating Minifix system for new plank:',
            error,
          );
        }
      }
    }

    cupboards.forEach((cupboard) => {
      const cupboardObject = scene?.children.find(
        (obj) => obj.userData.objectId === cupboard.id,
      ) as THREE.Mesh;
      if (cupboardObject) {
        const plankDataList: PlankDataItem[] = allObjects
          .filter(
            (obj) =>
              obj.parent === cupboard.id &&
              obj.name.includes(ITEM.PLANK) &&
              !obj.name.includes(ITEM.DRAWER) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            id: obj.id,
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
          }))
          .concat(
            !normalizeObjectData.name.includes('DRAWER')
              ? [
                  {
                    id: normalizedData.id,
                    name: normalizedData.name,
                    width: normalizedData.width,
                    height: normalizedData.height,
                    depth: normalizedData.depth,
                    position: normalizedData.position,
                  },
                ]
              : [],
          );

        const objectsToRemove: THREE.Mesh[] = [];
        cupboardObject.traverse((child) => {
          if (child.name === 'invisibleBox' && child instanceof THREE.Mesh) {
            objectsToRemove.push(child);
          }
        });
        objectsToRemove.forEach((obj) => {
          cupboardObject.remove(obj);
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        });

        const compartments = generateCompartmentsFromPlanks(plankDataList);
        compartments.forEach((compartment, index) => {
          const geometry = new THREE.BoxGeometry(
            compartment.width,
            compartment.height,
            compartment.depth,
          );
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
          });
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            compartment.position.x,
            compartment.position.y,
            compartment.position.z,
          );
          box.name = 'invisibleBox';
          box.userData = {
            objectId: `invisibleBox_${index}_${cupboard.id}`,
          };
          cupboardObject.add(box);
        });
      }
    });
  }

  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  if (!fullCatalogData) {
    console.error('No catalog data found for:', name);
    return null;
  }

  const payload = {
    name,
    data: normalizedData,
  };

  try {
    const response = await commonService.post(
      'design',
      `${designId}/catalog/${parentId}/item`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      let itemId: string | undefined;
      if (response.data?.id) {
        itemId = response.data.id;
      } else if (Array.isArray(response.data) && response.data[0]?.id) {
        itemId = response.data[0].id;
      }

      if (itemId) {
        threeDObject.userData.objectId = itemId;
      } else {
        console.warn(
          `No valid ID found in API response for ${name}, userData.objectId not assigned`,
        );
      }
      if (itemId) {
        objectData[0].id = itemId;
      } else {
        console.warn(
          `No valid ID found in API response for ${name}, using temporary ID`,
        );
      }
      dispatch(addObjects(objectData));

      return response.data;
    } else {
      console.error('Failed to create object:', response);
      return null;
    }
  } catch (error) {
    console.error('Error creating object:', error);
    return null;
  }
}

interface MoveObjectResult {
  createResult?: CreateResult | CreateItemResponse | null;
  threeDObject?: THREE.Mesh;
}

export interface CatalogWithChildren {
  catalog: {
    name: string;
    id: string;
    data: CatalogData;
  };
  items?: Array<{
    id: string;
    name: string;
    data: CatalogData;
  }>;
  child_catalogs?: Array<{
    catalog: {
      name: string;
      id: string;
      data: CatalogData;
    };
    items?: Array<{
      id: string;
      name: string;
      data: CatalogData;
    }>;
  }>;
}

async function moveObject(
  name: string,
  catalogList: { catalog: CatalogWithChildren[][] },
  scene: THREE.Scene,
  dispatch: Dispatch,
  dataObjects?: Object3D[],
): Promise<MoveObjectResult | void> {
  if (!scene) {
    return;
  }

  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogWithChildren) => catObj.catalog.name === name,
  );
  if (!catalogEntry) {
    console.error('Catalog entry not found for:', name);
    return;
  }

  let dataList: CatalogData[];
  if (catalogEntry.items && catalogEntry.items.length > 0) {
    dataList = catalogEntry.items.map((item: CatalogChildItem) => item.data);
  } else if (catalogEntry.catalog.data) {
    dataList = [catalogEntry.catalog.data];
  } else {
    console.error('No items or catalog data found for', name);
    return;
  }
  const childCatalogs = catalogEntry.child_catalogs || [];
  const childObjects: THREE.Mesh[] = [];
  for (const childCatalog of childCatalogs) {
    if (childCatalog.items && childCatalog.items.length > 0) {
      const childDataList = childCatalog.items.map(
        (item: CatalogChildItem) => item.data,
      );
      const convertedChildData = convertDataToGeometry(childDataList);
      const childObject = createDesign(convertedChildData, 'MAX');
      const position = childCatalog.catalog.data.position;
      childObject.position.set(position.x, position.y, position.z);
      childObject.scale.set(1, 1, 1);
      childObject.name = childCatalog.catalog.name;
      childObject.userData.type = childCatalog.catalog.data.catalog_type;
      childObjects.push(childObject);
    }
  }

  const convertedData = convertDataToGeometry(dataList);
  const threeDObject = createDesign(convertedData, 'MAX');
  threeDObject.scale.set(0.01, 0.01, 0.01);
  threeDObject.name = catalogEntry.catalog.name;
  threeDObject.userData.type = catalogEntry.catalog.data.catalog_type;

  if (
    !threeDObject.name.includes(PLANK.HORIZONTAL_PLANK) &&
    !threeDObject.name.includes(PLANK.VERTICAL_PLANK) &&
    !threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const compartments = generateCompartmentsFromPlanks(
      dataList.map((item) => ({
        name: String(item.name || ''),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        depth: Number(item.depth || 0),
        position: {
          x: Number(
            (item.position as { x: number; y: number; z: number })?.x || 0,
          ),
          y: Number(
            (item.position as { x: number; y: number; z: number })?.y || 0,
          ),
          z: Number(
            (item.position as { x: number; y: number; z: number })?.z || 0,
          ),
        },
      })),
    );
    compartments.forEach((compartment, index) => {
      const geometry = new THREE.BoxGeometry(
        compartment.width,
        compartment.height,
        compartment.depth,
      );
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
      });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(
        compartment.position.x,
        compartment.position.y,
        compartment.position.z,
      );
      box.name = 'invisibleBox';
      box.userData = { objectId: `invisibleBox_${index}_${name}` };
      threeDObject.add(box);
    });
  }

  childObjects.forEach((child) => {
    threeDObject.add(child);
  });

  if (!threeDObject.name.includes(ITEM.PLANK)) {
    scene.add(threeDObject);
  }

  let createResult;

  if (
    threeDObject.name.includes(ITEM.PLANK) ||
    threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const allObjects: Object3D[] = dataObjects || [];
    const cupboards = allObjects.filter(
      (obj) =>
        !obj.name.includes(ITEM.PLANK) &&
        !obj.name.includes(ITEM.DOOR) &&
        !obj.name.includes(ITEM.DRAWER) &&
        (obj.parent === null || obj.parent === undefined),
    );

    cupboards.forEach((cupboard) => {
      const cupboardObject = scene.children.find(
        (obj) => obj.userData.objectId === cupboard.id,
      ) as THREE.Mesh;
      if (cupboardObject) {
        const plankDataList: PlankDataItem[] = allObjects
          .filter(
            (obj) =>
              obj.parent === cupboard.id &&
              (obj.name.includes(ITEM.PLANK) ||
                obj.name.includes(ITEM.DRAWER)) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
          }));

        const objectsToRemove: THREE.Mesh[] = [];
        cupboardObject.traverse((child) => {
          if (child.name === 'invisibleBox') {
            objectsToRemove.push(child);
          }
        });
        objectsToRemove.forEach((obj) => {
          cupboardObject.remove(obj);
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        });

        const compartments = generateCompartmentsFromPlanks(
          plankDataList,
          threeDObject.name,
        );
        compartments.forEach((compartment, index) => {
          const geometry = new THREE.BoxGeometry(
            compartment.width,
            compartment.height,
            compartment.depth,
          );
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
          });
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            compartment.position.x,
            compartment.position.y,
            compartment.position.z,
          );
          box.name = 'invisibleBox';
          box.userData = {
            objectId: `invisibleBox_${index}_${cupboard.id}`,
          };
          cupboardObject.add(box);
        });
      }
    });
  }

  if (moveHandler) {
    const finalPosition = await moveHandler.enableDragging(threeDObject);
    if (finalPosition) {
      threeDObject.position.set(
        finalPosition.x,
        finalPosition.y,
        finalPosition.z,
      );

      if (
        threeDObject.name.includes('PLANK') ||
        threeDObject.name.includes('DOOR') ||
        threeDObject.name.includes(ITEM.DRAWER)
      ) {
        threeDObject.children
          .filter((child) => child.name.startsWith('edge_banding'))
          .forEach((child) => {
            threeDObject.remove(child);
            // Optionally dispose geometry and material
            if ((child as THREE.Mesh).geometry)
              (child as THREE.Mesh).geometry.dispose();
            if ((child as THREE.Mesh).material instanceof THREE.Material) {
              (child as THREE.Mesh).material.dispose();
            }
          });

        const edge_banding = applyEdgeBanding(threeDObject);
        threeDObject.add(edge_banding);
        const parentId = threeDObject.parent?.parent?.userData.objectId;
        createResult = await createItem(
          name,
          catalogList,
          parentId,
          threeDObject,
          finalPosition,
          dispatch,
          dataObjects,
          scene,
        );
      } else {
        // Handle non-plank objects (e.g., cupboard with children
        createResult = await create(name, catalogList, threeDObject);
        createResult.objectsList[0].position = finalPosition;
        // Assign userData.objectId to all objects in the scene based on objectsList
        if (createResult?.objectsList?.length) {
          // Iterate through objectsList to assign IDs to child objects
          createResult.objectsList.forEach((obj: Object3D) => {
            let targetObject: THREE.Object3D | undefined;
            threeDObject.traverse((child) => {
              if (child.name === obj.name) {
                targetObject = child;
              }
            });

            if (targetObject) {
              targetObject.userData.objectId = obj.id;
            } else {
              console.warn(
                `No 3D object found for ${obj.name} with ID ${obj.id}`,
              );
            }
          });
          try {
            const cupboardId = createResult.objectsList[0].id;
            const cupboardPlanks: PlankDataItem[] =
              createResult.objectsList.filter(
                (obj) =>
                  obj.parent === cupboardId &&
                  obj.name.includes(ITEM.PLANK) &&
                  !obj.name.includes(ITEM.DRAWER),
              );
            const cupboardMinifixSystem = generateMinifixSystem(
              cupboardId,
              cupboardPlanks.map((plank) => ({
                id: plank.id,
                name: plank.name,
                width: plank.width,
                height: plank.height,
                depth: plank.depth,
                position: plank.position,
                parent: plank.parent,
              })),
            );
            const drawers = createResult.objectsList.filter(
              (obj) =>
                obj.parent === cupboardId && obj.name.includes(ITEM.DRAWER),
            );
            const drawerUpdates = [];
            for (const drawer of drawers) {
              const drawerPlanks = createResult.objectsList.filter(
                (obj) => obj.parent === drawer.id,
              );
              if (drawerPlanks.length > 0) {
                const drawerMinifixSystem = generateMinifixSystem(
                  drawer.id,
                  drawerPlanks.map((plank) => ({
                    id: plank.id,
                    name: plank.name,
                    width: plank.width,
                    height: plank.height,
                    depth: plank.depth,
                    position: plank.position,
                    parent: plank.parent,
                  })),
                );

                drawerUpdates.push({
                  drawer,
                  minifixSystem: drawerMinifixSystem,
                  planks: drawerPlanks,
                });
              }
            }
            const updatedObjects = [];
            const updatedCupboard = {
              ...createResult.objectsList[0],
              minifixConnections: cupboardMinifixSystem.connections || [],
            };
            updatedObjects.push(updatedCupboard);
            const updatedDirectPlanks = cupboardPlanks.map((plank) => {
              const plankWithHoles = cupboardMinifixSystem.planksWithHoles.find(
                (p) => p.id === plank.id,
              );
              return {
                ...plank,
                minifixHoles: plankWithHoles?.minifixHoles || [],
              };
            });

            updatedObjects.push(...updatedDirectPlanks);
            // Update drawers and their planks
            for (const { drawer, minifixSystem, planks } of drawerUpdates) {
              const updatedDrawer = {
                ...drawer,
                minifixConnections: minifixSystem.connections || [],
              };
              updatedObjects.push(updatedDrawer);

              const updatedDrawerPlanks = planks.map((plank) => {
                const plankWithHoles = minifixSystem.planksWithHoles.find(
                  (p) => p.id === plank.id,
                );
                return {
                  ...plank,
                  minifixHoles: plankWithHoles?.minifixHoles || [],
                };
              });
              updatedObjects.push(...updatedDrawerPlanks);
            }
            updatedObjects.push(
              ...createResult.objectsList.filter(
                (obj) =>
                  !obj.name.includes(ITEM.PLANK) &&
                  obj.id !== cupboardId &&
                  !drawers.some((drawer) => drawer.id === obj.id) &&
                  !obj.name.includes(PLANK.DRAWER_HANDLE),
              ),
            );
            dispatch(addObjects(updatedObjects));
            if (cupboardMinifixSystem.connections.length > 0) {
              visualizeMinifixConnections(
                cupboardMinifixSystem.connections,
                threeDObject,
              );
              threeDObject.userData.minifixConnections =
                cupboardMinifixSystem.connections;
            }
            for (const { drawer, minifixSystem } of drawerUpdates) {
              const drawerObject = threeDObject.children.find(
                (c) => c.userData.objectId === drawer.id,
              );
              if (drawerObject && minifixSystem.connections.length > 0) {
                visualizeMinifixConnections(
                  minifixSystem.connections,
                  drawerObject,
                );
                drawerObject.userData.minifixConnections =
                  minifixSystem.connections;
              }
            }

            const designId = getDesignId();
            if (designId) {
              // Update cupboard + planks
              const cupboardPayload = {
                data: {
                  catalog: {
                    id: updatedCupboard.id,
                    name: updatedCupboard.name,
                    data: updatedCupboard,
                  },
                  items: updatedDirectPlanks.map((plank) => ({
                    id: plank.id,
                    name: plank.name,
                    data: {
                      name: plank.name,
                      width: plank.width,
                      height: plank.height,
                      depth: plank.depth,
                      position: plank.position,
                      parent: plank.parent,
                      minifixHoles: plank.minifixHoles || [],
                      material: plank.material || {
                        type: 'TEXTURE',
                        value: 'default',
                      },
                    },
                  })),
                },
              };
              const cupboardResponse = await commonService.put(
                'design',
                `${designId}/object`,
                cupboardPayload,
              );

              if (
                cupboardResponse.status === 200 ||
                cupboardResponse.status === 201
              ) {
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  console.log('✅ Cupboard & planks updated');
                }
              } else {
                console.error(
                  '❌ Failed to update cupboard:',
                  cupboardResponse,
                );
              }

              // Update each drawer + its planks separately
              for (const { drawer, minifixSystem, planks } of drawerUpdates) {
                const updatedDrawerPlanks = planks.map((plank) => {
                  const updated = minifixSystem.planksWithHoles.find(
                    (p) => p.id === plank.id,
                  );
                  return {
                    id: plank.id,
                    name: plank.name,
                    data: {
                      name: plank.name,
                      width: plank.width,
                      height: plank.height,
                      depth: plank.depth,
                      position: plank.position,
                      parent: plank.parent,
                      minifixHoles: updated?.minifixHoles || [],
                      material: plank.material || {
                        type: 'TEXTURE',
                        value: 'default',
                      },
                    },
                  };
                });

                const drawerPayload = {
                  data: {
                    catalog: {
                      id: updatedCupboard.id,
                      name: updatedCupboard.name,
                      data: updatedCupboard,
                    },
                    child_catalogs: [
                      {
                        catalog: {
                          id: drawer.id,
                          name: drawer.name,
                          data: {
                            name: drawer.name,
                            width: drawer.width,
                            height: drawer.height,
                            depth: drawer.depth,
                            position: drawer.position,
                            parent: drawer.parent,
                            minifixConnections: minifixSystem.connections || [],
                          },
                        },
                        items: updatedDrawerPlanks,
                      },
                    ],
                  },
                };
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  console.log('drawerPayload', drawerPayload);
                }
                const drawerResponse = await commonService.put(
                  'design',
                  `${designId}/object`,
                  drawerPayload,
                );

                if (
                  drawerResponse.status === 200 ||
                  drawerResponse.status === 201
                ) {
                  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                    console.log(`✅ Drawer ${drawer.name} updated`);
                  }
                } else {
                  console.error(
                    `❌ Failed to update drawer ${drawer.name}:`,
                    drawerResponse,
                  );
                }
              }
            }
          } catch (error) {
            console.error('❌ Error generating Minifix system:', error);
            dispatch(addObjects(createResult.objectsList));
            const designId = getDesignId();
            if (designId && createResult?.objectsList?.[0]?.id) {
              const updatedData: Object3D = {
                ...createResult.objectsList[0],
                position: {
                  x: finalPosition.x,
                  y: finalPosition.y,
                  z: finalPosition.z,
                },
              };

              await updateObjectInDatabase(
                createResult.mainObjects[0].id,
                updatedData,
                updatedData,
              );
            }
          }
        }
      }
    } else {
      console.error('Final position is null for', threeDObject.name);
    }
  }

  return { createResult, threeDObject };
}

function getDesignId(): string | null {
  const url = window.location.href;
  const designId = url.split('/').pop();
  return designId || null;
}

interface CopyObjectsResult {
  objectsList: Object3D[];
  mainObjects: Object3D[];
  catalogMap: Record<string, Object3D[]>;
}

async function copyObjects(id: string): Promise<CopyObjectsResult | null> {
  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('catalog_id', id);

    const response = await commonService.post(
      'design',
      `${designId}/object`,
      formData,
    );

    if (response.status === 200 || response.status === 201) {
      const responseData = response.data;
      const dataArray = Array.isArray(responseData)
        ? responseData
        : responseData
          ? [responseData]
          : [];

      const allObjects: Object3D[] = [];
      const mainObjects: Object3D[] = [];
      const catalogMap: { [key: string]: Object3D[] } = {};
      const idMap = new Map<string, string>();

      dataArray.forEach((entry: CatalogResponse) => {
        const newId =
          entry.id && !idMap.has(entry.id) ? entry.id : crypto.randomUUID();
        idMap.set(newId, newId);

        const mainObject: Object3D = {
          id: newId,
          name: entry.name || '',
          width: entry.data?.width || 0,
          height: entry.data?.height || 0,
          depth: entry.data?.depth || 0,
          altitude: 0,
          position: {
            x: (entry.data?.position?.x || 0) + 0.1,
            y: entry.data?.position?.y || 0,
            z: entry.data?.position?.z || 0,
          },
          material: { type: 'TEXTURE', value: 'default' },
          parent: entry.parent ? idMap.get(entry.parent) || entry.parent : null,
          child: [],
          layer: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        };

        const childObjects = entry.design_catalog_items?.map((item) => {
          const childId =
            item.id && !idMap.has(item.id) ? item.id : crypto.randomUUID();
          idMap.set(childId, childId);
          return {
            id: childId,
            name: item.data.name,
            width: item.data.width,
            height: item.data.height,
            depth: item.data.depth,
            altitude: item.data.altitude,
            position: { ...item.data.position },
            material: item.data.material,
            parent: newId,
            child: item.data.child
              ? item.data.child.map(() => crypto.randomUUID())
              : [],
            layer: item.data.layer,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
          };
        });

        mainObject.child = childObjects?.map((child) => child.id) || [];
        catalogMap[mainObject.name] = [mainObject, ...(childObjects || [])];
        allObjects.push(mainObject, ...(childObjects || []));

        if (!entry.parent) {
          mainObjects.push(mainObject);
        }
      });

      dataArray.forEach((entry: CatalogResponse) => {
        if (entry.parent) {
          const parentObj = allObjects.find(
            (o) => o.id === idMap.get(entry.parent ?? ''),
          );
          const currentObj = allObjects.find(
            (o) => o.id === idMap.get(entry.id),
          );
          if (
            parentObj &&
            currentObj &&
            !parentObj.child.includes(currentObj.id)
          ) {
            parentObj.child.push(currentObj.id);
          }
        }
      });

      return {
        objectsList: allObjects,
        mainObjects,
        catalogMap,
      };
    } else {
      console.error('Failed to copy object:', response);
      return null;
    }
  } catch (error) {
    console.error('Error copying object:', error);
    return null;
  }
}

export {
  copyObjects,
  create,
  createChildObjectFromCatalogItem,
  createChildObjectFromData,
  initializeMoveHandler,
  loadDesignObjects,
  moveObject,
  regenerateInvisibleBoxes,
};
export default {
  initializeMoveHandler,
  loadDesignObjects,
  create,
  createChildObjectFromCatalogItem,
  createChildObjectFromData,
  moveObject,
  copyObjects,
  regenerateInvisibleBoxes,
};

export function toggleDoor(child: THREE.Mesh) {
  if (!child) return;

  const isClosed = child.userData.isClosed ?? true;

  // Traverse parents to detect wall placement
  let obj: THREE.Object3D | null = child;
  let wallType: 'center' | 'leftwall' | 'rightwall' | null = null;

  while (obj && !wallType) {
    if (obj.name.toLowerCase().includes('center')) wallType = 'center';
    else if (obj.name.toLowerCase().includes('leftwall')) wallType = 'leftwall';
    else if (obj.name.toLowerCase().includes('rightwall'))
      wallType = 'rightwall';
    obj = obj.parent;
  }

  child.geometry.computeBoundingBox();
  const bbox = child.geometry.boundingBox;
  if (!bbox) {
    console.error('Bounding Box is Null');
    return;
  }

  let pivotOffsetX = 0;
  let pivotOffsetY = 0;

  // Default openDirection comes from userData (left, right, top, bottom)
  let type: 'left' | 'right' | 'top' | 'bottom' = child.userData.openDirection;

  // Adjust open direction based on wall type
  if (wallType === 'leftwall') {
    // Left wall doors usually swing along +X axis
    if (type === 'left') type = 'right';
    else if (type === 'right') type = 'left';
  } else if (wallType === 'rightwall') {
    // Right wall doors usually swing along -X axis
    if (type === 'left') type = 'right';
    else if (type === 'right') type = 'left';
  } else if (wallType === 'center') {
    // Center wall → default directions (front open/close)
    type = type;
  }

  switch (type) {
    case 'left':
      pivotOffsetX = bbox.min.x;
      pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
      break;
    case 'right':
      pivotOffsetX = bbox.max.x;
      pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
      break;
    case 'top':
      pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
      pivotOffsetY = bbox.max.y;
      break;
    case 'bottom':
      pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
      pivotOffsetY = bbox.min.y;
      break;
  }

  // Move geometry pivot to hinge side
  child.geometry.translate(-pivotOffsetX, -pivotOffsetY, 0);
  child.position.x += pivotOffsetX;
  child.position.y += pivotOffsetY;

  const targetRotation = { x: 0, y: 0, z: 0 };

  switch (type) {
    case 'left':
      targetRotation.y = isClosed ? -Math.PI / 2.5 : 0;
      break;
    case 'right':
      targetRotation.y = isClosed ? Math.PI / 2.5 : 0;
      break;
    case 'top':
      targetRotation.x = isClosed ? -Math.PI / 3 : 0;
      break;
    case 'bottom':
      targetRotation.x = isClosed ? Math.PI / 3 : 0;
      break;
  }

  gsap.to(child.rotation, {
    x: targetRotation.x,
    y: targetRotation.y,
    z: targetRotation.z,
    duration: 1,
    ease: 'power2.inOut',
  });

  child.userData.isClosed = !isClosed;
}

export function toggleDrawer(child: THREE.Mesh, openDistance = 0.2) {
  if (!child) return;

  const isClosed = child.userData.isClosed ?? true;
  const closedPos = child.userData.closedPos ?? child.position.clone();

  // Traverse parents to detect wall placement
  let obj: THREE.Object3D | null = child;
  let wallType: 'center' | 'leftwall' | 'rightwall' | null = null;

  while (obj && !wallType) {
    // const n = obj.name.toLowerCase();
    if (obj.name.includes('center')) wallType = 'center';
    else if (obj.name.includes('leftwall')) wallType = 'leftwall';
    else if (obj.name.includes('rightwall')) wallType = 'rightwall';
    obj = obj.parent;
  }

  // Decide direction based on wall type
  let direction = new THREE.Vector3();
  switch (wallType) {
    case 'center':
      direction.set(0, 0, 1);
      break;
    case 'leftwall':
      direction.set(1, 0, 0); // push outward along X+
      break;
    case 'rightwall':
      direction.set(-1, 0, 0); // push outward along X-
      break;
    default:
      direction.set(0, 0, 1); // fallback → front
  }

  // Apply parent orientation
  const parent = child.parent as THREE.Object3D;
  if (parent) direction.applyQuaternion(parent.quaternion).normalize();

  // Compute open pos
  const openPos = closedPos.clone().add(direction.multiplyScalar(openDistance));
  const targetPos = isClosed ? openPos : closedPos;

  gsap.to(child.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1,
    ease: 'power2.inOut',
  });

  child.userData.isClosed = !isClosed;
  child.userData.closedPos = closedPos;
}

export const addCabinetItemToDesign = async (
  catalogId: string,
  itemData: {
    type: string;
    name: string;
    description: string;
    design_id: string;
    parent?: string;
    width?: number;
    height?: number;
    depth?: number;
    position?: { x: number; y: number; z: number };
    additional_data?: any;
    parts?: Array<{
      name: string;
      width: number;
      height: number;
      depth: number;
    }>;
  },
) => {
  const payload = {
    type: itemData.type,
    name: itemData.name,
    description: itemData.description,
    design: itemData.design_id,
    // Optional spatial metadata for backend consumption
    width: itemData.width,
    height: itemData.height,
    depth: itemData.depth,
    position: itemData.position,
    additional_data: itemData.additional_data,
    catalog_rule: itemData.parts,
    parent: itemData.parent,
  };
  try {
    const response = await commonService.post(
      `material/catalog`,
      `${catalogId}/design`,
      payload,
    );
    if (response.status === 200 || response.status === 201) {
      return response.data;
    }
  } catch (error) {
    console.error('Error adding cabinet item to design:', error);
    throw error;
  }
};

export const addItemtoDatabase = async (data: any) => {
  try {
    const apiResponse = await addCabinetItemToDesign(data.catalogId, data);
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(apiResponse, 'apiResponse');
    }
    return apiResponse;
  } catch (error) {
    console.error(`Failed to add ${data.type.toLowerCase()} to design:`, error);
  }
  return null;
};

export const addItemToDataBaseWihoutCatalog = async (data: any) => {
  try {
    const apiResponse = await commonService.post(
      'material',
      'catalog/design',
      data,
    );
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(apiResponse, 'apiResponse');
    }
    return apiResponse;
  } catch (error) {
    console.error(`Failed to add ${data.type.toLowerCase()} to design:`, error);
  }
  return null;
};
