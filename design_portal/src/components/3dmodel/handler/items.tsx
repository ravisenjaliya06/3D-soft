import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import gsap from 'gsap';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { TEXTURES_URLS } from '../constants';
import { createRealisticMaterial } from '../design/loadRealisticScene';
import { mmToMeters } from '../handler/unitConversion';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { Object3D, Position } from '../store/interface';
import {
  AddItemDatabasePayload,
  ITEM,
  PlankDataItem,
  RulePart,
} from './interface';

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
  if (boxMesh.name.toLowerCase().includes('drawer')) return [];

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

export function generateCompartmentsFromPlanks(plankData: PlankDataItem[], objectName?: string) {
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
    if (name.includes('VERTICAL') || name.includes('HORIZONTAL') || name.includes(ITEM.DRAWER)) {
      const startX = Math.round((position.x - width / 2 - minX) / step);
      const endX = Math.round((position.x + width / 2 - minX) / step);
      const startY = Math.round((position.y - height / 2 - minY) / step);
      const endY = Math.round((position.y + height / 2 - minY) / step);

      for (let y = Math.max(0, startY); y <= Math.min(gridHeight - 1, endY); y++) {
        for (let x = Math.max(0, startX); x <= Math.min(gridWidth - 1, endX); x++) {
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

          while (bottomRightX + 1 < gridWidth && grid[y][bottomRightX + 1] === 'empty') {
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

          while (bottomRightY + 1 < gridHeight && grid[bottomRightY + 1][x] === 'empty') {
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

export async function createMeshRecursively(
  data: Object3D,
  parent: THREE.Object3D | null = null,
  scene?: THREE.Scene
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
      mmToMeters(data.position.z) || 0
    );
  }

  if (Array.isArray(data.catalog_rules)) {
    for (const rule of data.catalog_rules) {
      if (Array.isArray(rule.rule_parts) && rule.name === 'Panel') {
        for (const part of rule.rule_parts) {
          const partWidth = mmToMeters(part.width || part.length) || 1;
          const partHeight = mmToMeters(part.height || 1);
          const partDepth = mmToMeters(part.depth || 1);

          const partGeometry = new THREE.BoxGeometry(partWidth, partHeight, partDepth);

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
              mmToMeters(part.position.z) || 0
            );
          }
          mesh.add(partMesh);
        }
      } else if (rule.name.includes('Handle')) {
      }
    }
  }

  store.dispatch(addObjects([data]));
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

async function loadDesignObjects(designId: string, scene: THREE.Scene) {
  try {
    const response: { status: number; data: Object3D[] } = await commonService.get(
      API_ENDPOINT.GET_DESIGN_OBJECTS(designId)
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

export { loadDesignObjects };
export default {
  loadDesignObjects,
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
    else if (obj.name.toLowerCase().includes('rightwall')) wallType = 'rightwall';
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
  const direction = new THREE.Vector3();
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
    additional_data?: unknown;
    parts?: {
      name: string;
      rule_parts: RulePart[];
    }[];
  }
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
      API_ENDPOINT.CREATE_MATERIAL_DESIGN_CATALOG(catalogId),
      payload
    );
    if (response.status === 200 || response.status === 201) {
      return response.data;
    }
  } catch (error) {
    console.error('Error adding cabinet item to design:', error);
    throw error;
  }
};

export const addItemtoDatabase = async (data: AddItemDatabasePayload) => {
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

export const addItemToDataBaseWithoutCatalog = async (data: AddItemDatabasePayload) => {
  try {
    const apiResponse = await commonService.post(
      API_ENDPOINT.CREATE_MATERIAL_WITHOUT_CATALOG,
      data
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
