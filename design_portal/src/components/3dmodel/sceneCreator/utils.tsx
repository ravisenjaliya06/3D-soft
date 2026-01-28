import * as THREE from 'three';
import { WallPoint } from '../2dmodel/interface';
import { findRoomsFromWalls, getFloorPolygon } from '../2dmodel/walls/wallFloor';
import { UpdateDimensionsParams } from '../handler/interface';
import { Dimensions } from '../interface';
import { store } from '../store';
import { addPoint, setFloor, setWalls } from '../store/dataSlice';
import { EDGES, MeshObjectData, PART_TYPES } from './interface';
import { ObjectsRemoverFromScene } from './tools/deleteOrClearTool';
import { ObjectsSaver } from './tools/objectSaver';
import commonService from '@/services/CommonService';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import { gettingDesignID } from '../design';
import { SyncManager } from './syncState';

export const getDesignCatalogs = async () => {
  const response: { status: number; data: {catalogs: MeshObjectData[]} } = await commonService.get(API_ENDPOINT.GET_DESIGN_CATALOG_ITEMS(gettingDesignID()));
  if (response.status !== 200) {
    console.error('Error fetching catalogs');
    return;
  }
  console.log(response.data.catalogs, 'catalogs');
  console.log(JSON.stringify(response.data.catalogs), 'catalogs');
  response.data.catalogs.forEach((catalog: MeshObjectData) => {
    const builder = new SyncManager(catalog);
    builder.syncData();
  })
}
/**
 * Get the X and Y positions whenever a mouse event is called.
 */
export const findXY = (renderer: THREE.WebGLRenderer, event: MouseEvent) => {
  const boundingClientRect = renderer.domElement.getBoundingClientRect(); // Get the DOM element's bounding client rectangle for accurate mouse position calculations.

  const x = ((event.clientX - boundingClientRect.left) / boundingClientRect.width) * 2 - 1;
  const y = -((event.clientY - boundingClientRect.top) / boundingClientRect.height) * 2 + 1;

  return { x, y };
};

export const textureLoader = (
  url: string,
  repeatX: number = 1,
  repeatY: number = 1
): Promise<THREE.Texture> => {
  const loader = new THREE.TextureLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn('Failed to load texture:', error);
        reject(error);
      }
    );
  });
};

export const convertPosition2DTo3D = (data: {
  startPoint: WallPoint;
  endPoint: WallPoint;
}): THREE.Vector3 => {
  const sumX = data.startPoint.x + data.endPoint.x;
  const sumY = data.startPoint.y + data.endPoint.y;

  const x = sumX / 2 / 100;
  const y = 1.4;
  const z = sumY / 2 / 100;

  return new THREE.Vector3(x, y, z);
};

export const findRotation = (data: {
  startPoint: WallPoint;
  endPoint: WallPoint;
}): THREE.Vector3 => {
  const angle = Math.atan2(
    data.endPoint.y - data.startPoint.y,
    data.endPoint.x - data.startPoint.x
  );
  return new THREE.Vector3(0, -angle, 0);
};

export const getWall2DPoints = (wall: MeshObjectData) => {
  return convertPosition3DTo2D(
    new THREE.Vector3(wall.position.x, wall.position.y, wall.position.z),
    wall.dimensions,
    wall.rotation?.y ?? 0
  );
};

export const convertPosition3DTo2D = (
  position: THREE.Vector3,
  dimensions: Dimensions,
  rotationY = 0
) => {
  const centerX = position.x * 100;
  const centerY = position.z * 100;

  const half = dimensions.width / 2;

  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  return {
    startPoint: {
      x: centerX - cos * half,
      y: centerY + sin * half,
    },
    endPoint: {
      x: centerX + cos * half,
      y: centerY - sin * half,
    },
  };
};

export function create2DWallFromMeshData(data: MeshObjectData) {
  const state = store.getState();
  const walls = state.data.walls;

  const width = data.dimensions.width;
  const angle = data.rotation?.y ?? 0;

  // 1. Calculate direction
  const half = width / 2;
  const dx = Math.cos(angle) * half;
  const dy = Math.sin(angle) * half;

  // 2. Convert 3D position → 2D center
  const centerX = data.position.x * 100;
  const centerY = data.position.z * 100;

  // 3. Calculate 2D start & end
  const startPoint = {
    id: crypto.randomUUID(),
    x: centerX - dx,
    y: centerY + dy,
  };

  const endPoint = {
    id: crypto.randomUUID(),
    x: centerX + dx,
    y: centerY - dy,
  };

  // 4. Build 2D wall data (same type)
  const wall2D: MeshObjectData = {
    ...data,
  };

  // 5. Prevent duplicate
  const isDuplicate = walls.some((w) => {
    const wallCoords = convertPosition3DTo2D(
      new THREE.Vector3(w.position.x, w.position.y, w.position.z),
      w.dimensions,
      w.rotation?.y ?? 0
    );
    const wStart = wallCoords.startPoint;
    const wEnd = wallCoords.endPoint;

    return (
      (Math.round(wStart.x) === Math.round(startPoint.x) &&
        Math.round(wStart.y) === Math.round(startPoint.y) &&
        Math.round(wEnd.x) === Math.round(endPoint.x) &&
        Math.round(wEnd.y) === Math.round(endPoint.y)) ||
      (Math.round(wStart.x) === Math.round(endPoint.x) &&
        Math.round(wStart.y) === Math.round(endPoint.y) &&
        Math.round(wEnd.x) === Math.round(startPoint.x) &&
        Math.round(wEnd.y) === Math.round(startPoint.y))
    );
  });

  if (isDuplicate) return;

  const updatedWalls = [...walls, wall2D];

  store.dispatch(setWalls(updatedWalls));
  store.dispatch(addPoint(startPoint));
  store.dispatch(addPoint(endPoint));

  // 7. Recalculate rooms
  const rooms = findRoomsFromWalls(updatedWalls);

  const floorPolygons = rooms.map((room) => ({
    id: crypto.randomUUID(),
    points: getFloorPolygon(room),
    walls: room.map((wall) => wall.id),
  }));

  store.dispatch(setFloor(floorPolygons));
}

export const deleteObject = async (clearScene?: boolean) => {
  /** Deletes the currently selected 3D object from both the scene and backend database. */

  const objectRemover = new ObjectsRemoverFromScene();
  if (clearScene) {
    objectRemover.clearScene();
  } else {
    objectRemover.findSingleObjectToRemove();
  }
};

export const saveObject = async () => {
  const objectSaver = new ObjectsSaver();
  objectSaver.saveObject();
};

export function formatEnumLabel(value: string): string {
  if (!value) return '';

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function snakeToCamel(str: string) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function convertKeysToCamel<T>(obj: Object): T {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel) as any;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [snakeToCamel(k), convertKeysToCamel(v)])
    ) as T;
  }
  return obj;
}

//deep update ids
export function deepUpdateIds<T>(value: T, idMap: Map<string, string>): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => deepUpdateIds(item, idMap)) as unknown as T;
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const v = obj[key];

    if (typeof v === 'string' && idMap.has(v)) {
      result[key] = idMap.get(v);
    } else if (v !== null && typeof v === 'object') {
      result[key] = deepUpdateIds(v, idMap);
    } else {
      result[key] = v;
    }
  }

  return result as T;
}

/**
 * Extract dominant/average color from an image URL
 * Returns a hex color value
 */
export async function extractColorFromImage(imageUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(0x000000);
          return;
        }

        const sampleSize = Math.min(100, Math.max(img.width, img.height));
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        const hexColor = (r << 16) | (g << 8) | b;
        resolve(hexColor);
      } catch (error) {
        console.warn('Failed to extract color from image:', error);
        resolve(0x000000);
      }
    };

    img.onerror = () => {
      resolve(0x000000);
    };

    img.src = imageUrl;
  });
}

function _createGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height, depth);
}

function _createVector3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

export function getNew(
  edge: string,
  params: UpdateDimensionsParams,
  bandingThickness: number
): { newGeometry: THREE.BoxGeometry; newPosition: THREE.Vector3 } | null {
  let newGeometry: THREE.BoxGeometry;
  let newPosition: THREE.Vector3;
  if (edge === EDGES.TOP || edge === EDGES.BOTTOM) {
    newGeometry = _createGeometry(params.newWidth, bandingThickness, params.newDepth);
    newPosition = _createVector3(
      0,
      edge === EDGES.TOP
        ? params.newHeight / 2 - bandingThickness / 2
        : -params.newHeight / 2 + bandingThickness / 2,
      0
    );
  } else if (edge === EDGES.LEFT || edge === EDGES.RIGHT) {
    newGeometry = _createGeometry(bandingThickness, params.newHeight, params.newDepth);
    newPosition = _createVector3(
      edge === EDGES.LEFT
        ? -params.newWidth / 2 + bandingThickness / 2
        : params.newWidth / 2 - bandingThickness / 2,
      0,
      0
    );
  } else if (edge === EDGES.FRONT || edge === EDGES.BACK) {
    newGeometry = _createGeometry(params.newWidth, params.newHeight, bandingThickness);
    newPosition = _createVector3(
      0,
      0,
      edge === EDGES.FRONT
        ? params.newDepth / 2 - bandingThickness / 2
        : -params.newDepth / 2 + bandingThickness / 2
    );
  } else {
    return null;
  }

  return { newGeometry, newPosition };
}

export function findMeshById(
  scene: THREE.Scene,
  objectId: string,
  isHandle?: boolean
): THREE.Mesh | null {
  let foundMesh: THREE.Mesh | null = null;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.objectId === objectId) {
      foundMesh = object;
      if (isHandle) {
        foundMesh.children.forEach((child) => {
          if (child.userData.type === PART_TYPES.HANDLE) {
            foundMesh = child as THREE.Mesh;
          }
        });
      }
    }
  });

  return foundMesh;
}
export const collectSceneObjectIds = (root: THREE.Object3D) => {
  const ids = new Set<string>();

  root.traverse((child) => {
    const id = child.userData?.objectId;
    if (typeof id === 'string' && !child.userData?.isInvisibleBox) {
      ids.add(id);
    }
  });

  return ids;
};

export const createIdMap = (ids: Set<string>) => {
  const map = new Map<string, string>();
  ids.forEach((id) => map.set(id, crypto.randomUUID()));
  return map;
};

export const detachInvisibleBoxes = (root: THREE.Object3D) => {
  const boxes: THREE.Object3D[] = [];

  root.traverse((child) => {
    if (child.userData?.isInvisibleBox) boxes.push(child);
  });

  boxes.forEach((b) => b.parent?.remove(b));
  return boxes;
};

export const restoreInvisibleBoxes = (
  root: THREE.Object3D,
  boxes: THREE.Object3D[],
  rootId: string
) => {
  boxes.forEach((box) => {
    const parentId = box.userData.parentId || rootId;
    const parent = root.getObjectByProperty('userData.objectId', parentId) ?? root;

    parent.add(box);
  });
};

export const updateCloneIds = (
  clone: THREE.Object3D,
  rootId: string,
  idMap: Map<string, string>
) => {
  clone.userData.objectId = idMap.get(rootId);

  clone.traverse((child) => {
    if (!child.userData) return;

    const id = child.userData.objectId;
    if (id && idMap.has(id)) {
      child.userData.objectId = idMap.get(id);
    }

    child.userData = deepUpdateIds(child.userData, idMap);
  });
};

export const createCopiedStoreObjects = (
  objects: any[],
  rootId: string,
  idMap: Map<string, string>,
  position: THREE.Vector3
) =>
  objects.map((obj) => {
    const copy = structuredClone(obj);
    copy.id = idMap.get(obj.id);

    if (obj.id === rootId) {
      copy.position = { x: position.x, y: position.y, z: position.z };
    }

    if (copy.parent && idMap.has(copy.parent)) {
      copy.parent = idMap.get(copy.parent);
    }

    return copy;
  });

// NOTE: For showing any warning, error and other message to the user please use this component
export const CustomToast = ({
  appearance,
  message,
}: {
  appearance: string;
  message: string;
}) => {
  const isError = appearance === 'error';

  return (
    <div className="relative flex items-center gap-[0.75rem] px-[1rem] py-[0.6rem]">
      {/* Icon */}
      <div
        className={`flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-full ${
          isError ? 'bg-[#D32F2F]' : 'bg-[#FFA000]'
        }`}
      >
        <span className="text-[0.85rem] font-bold text-white select-none">!</span>
      </div>

      {/* Message */}
      <p className="flex-1 truncate font-[poppins] text-[0.9rem] leading-[1.2rem] text-white">
        {message}
      </p>
    </div>
  );
};
