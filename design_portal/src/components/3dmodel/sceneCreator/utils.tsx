import * as THREE from 'three';
import { WallPoint } from '../2dmodel/interface';
import { findRoomsFromWalls, getFloorPolygon } from '../2dmodel/walls/wallFloor';
import { Dimensions } from '../interface';
import { store } from '../store';
import { addPoint, setFloor, setWalls } from '../store/dataSlice';
import { MeshObjectData } from './interface';
import { ObjectsRemoverFromScene } from './tools/deleteOrClearTool';

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
  }
  objectRemover.findSingleObjectToRemove();
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
