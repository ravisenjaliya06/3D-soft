import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';

import * as THREE from 'three';
import { WallPoint } from '../2dmodel/interface';
import { TEXTURE_CACHE_NAME } from '../constants';
import { ThreeDView } from '../design/interface';
import { UpdateDimensionsParams } from '../handler/interface';
import { prefetchTexture } from '../helper/glbLoader';
import { Dimensions } from '../interface';
import { store } from '../store';
import { addPoint, setWalls } from '../store/dataSlice';
import { EDGES, FLOOR_PLAN_TYPES, MeshObjectData, OBJECT_TYPES, PART_TYPES } from './interface';
import { SyncManager } from './syncState';
import { ObjectsRemoverFromScene } from './tools/deleteOrClearTool';
import { ObjectsSaver } from './tools/objectSaver';

export const getDesignCatalogs = async (versionId?: string, threeDView?: ThreeDView) => {
  console.time('Total_Catalog_Loading_Time');
  // Prevent calls with non-UUID versionIds (like 'paneldesign' from old URLs)
  if (versionId && versionId.length < 10) {
    return;
  }
  const designId = gettingDesignID();
  if (!designId) return;

  const response: { status: number; data: { catalogs: MeshObjectData[] } } =
    await commonService.get(API_ENDPOINT.GET_DESIGN_CATALOG_ITEMS(designId, versionId));

  if (response.status !== 200) {
    console.error('Error fetching catalogs');
    console.timeEnd('Total_Catalog_Loading_Time');
    return;
  }

  const catalogs = response.data.catalogs;

  if (!catalogs || catalogs.length === 0) {
    console.timeEnd('Total_Catalog_Loading_Time');

    return;
  }

  // 1. Early Prefetch: Trigger texture downloads immediately
  const uniqueTextureUrls = new Set<string>();
  catalogs.forEach((item) => {
    // Material Textures
    if (item.material) {
      const mats = Array.isArray(item.material) ? item.material : [item.material];
      mats.forEach((m) => {
        m?.textures?.forEach((t) => {
          if (t.textureDetail?.image) {
            // Match MeshBuilder URL construction for cache hit
            uniqueTextureUrls.add(`${process.env.NEXT_PUBLIC_PUBLIC_API}` + t.textureDetail.image);
          }
        });
      });
    }
  });

  // Fire and forget prefetch for textures ONLY
  uniqueTextureUrls.forEach((url) => prefetchTexture(url));

  // 2. Batch Processing: Yield to main thread to stop UI freezing
  const BATCH_SIZE = 50;
  let currentIndex = 0;

  const processBatch = async () => {
    const batch = catalogs.slice(currentIndex, currentIndex + BATCH_SIZE);

    const builder = new SyncManager(batch, threeDView, true);
    await builder.syncGroupedBatch(batch);

    currentIndex += BATCH_SIZE;

    if (currentIndex < catalogs.length) {
      // Schedule next batch
      requestAnimationFrame(() => {
        processBatch().catch((err) => console.error(err));
      });
    } else {
      console.timeEnd('Total_Catalog_Loading_Time');
    }
  };

  processBatch().catch((err) => console.error(err));
};
/**
 * Get the X and Y positions whenever a mouse event is called.
 */
export const findXY = (renderer: THREE.WebGLRenderer, event: MouseEvent) => {
  const boundingClientRect = renderer.domElement.getBoundingClientRect(); // Get the DOM element's bounding client rectangle for accurate mouse position calculations.

  const x = ((event.clientX - boundingClientRect.left) / boundingClientRect.width) * 2 - 1;
  const y = -((event.clientY - boundingClientRect.top) / boundingClientRect.height) * 2 + 1;

  return { x, y };
};

// Singleton TextureLoader instance
export const globalTextureLoader = new THREE.TextureLoader();

export const textureLoader = (
  url: string,
  repeatX: number = 1,
  repeatY: number = 1
): Promise<THREE.Texture> => {
  return new Promise(async (resolve, reject) => {
    let objectUrl = url;
    let isFromCache = false;

    // 1. Try to get Blob from Browser Cache (prefetched by getDesignCatalogs)
    if ('caches' in window) {
      try {
        const cache = await caches.open(TEXTURE_CACHE_NAME);
        const response = await cache.match(url);
        if (response) {
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          isFromCache = true;
        }
      } catch (e) {
        console.warn('Cache check failed for texture', e);
      }
    }

    globalTextureLoader.load(
      objectUrl,
      (texture) => {
        if (isFromCache) URL.revokeObjectURL(objectUrl);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = 8;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        resolve(texture);
      },
      undefined,
      (error) => {
        if (isFromCache) URL.revokeObjectURL(objectUrl);
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

/** Default wall thickness in 2D units (matches dimensions.depth for new walls). */
export const WALL_THICKNESS_2D_UNITS = 20;

/** Unit perpendicular to (ux, uy) pointing to the "left" of the forward direction (SVG / y-down space). */
export function perpLeft2D(ux: number, uy: number) {
  return { x: -uy, y: ux };
}

/**
 * Reference edge = user-drawn polyline (one face of the wall). Centerline is offset from it by (sign * t/2) along perpLeft(direction).
 */
export function getWallReferenceEdgePoints(wall: MeshObjectData): {
  startPoint: WallPoint;
  endPoint: WallPoint;
} {
  const { startPoint: cs, endPoint: ce } = getWall2DPoints(wall);
  if (wall.wallOffsetSign == null) {
    return { startPoint: { ...cs }, endPoint: { ...ce } };
  }
  const t = wall.dimensions?.depth ?? wall.thickness ?? WALL_THICKNESS_2D_UNITS;
  const sign = wall.wallOffsetSign;
  const dx = ce.x - cs.x;
  const dy = ce.y - cs.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { startPoint: { ...cs }, endPoint: { ...ce } };
  }
  const ux = dx / len;
  const uy = dy / len;
  const pl = perpLeft2D(ux, uy);
  const half = (sign * t) / 2;
  return {
    startPoint: { x: cs.x - pl.x * half, y: cs.y - pl.y * half },
    endPoint: { x: ce.x - pl.x * half, y: ce.y - pl.y * half },
  };
}

/** Build centerline endpoints from reference edge for 3D placement. */
export function referenceEdgeToCenterline(
  refStart: WallPoint,
  refEnd: WallPoint,
  wallOffsetSign: number | undefined,
  thickness: number
): { startPoint: WallPoint; endPoint: WallPoint } {
  if (wallOffsetSign == null) {
    return { startPoint: { ...refStart }, endPoint: { ...refEnd } };
  }
  const sign = wallOffsetSign;
  const dx = refEnd.x - refStart.x;
  const dy = refEnd.y - refStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { startPoint: { ...refStart }, endPoint: { ...refEnd } };
  }
  const ux = dx / len;
  const uy = dy / len;
  const pl = perpLeft2D(ux, uy);
  const half = (sign * thickness) / 2;
  return {
    startPoint: {
      x: refStart.x + pl.x * half,
      y: refStart.y + pl.y * half,
    },
    endPoint: {
      x: refEnd.x + pl.x * half,
      y: refEnd.y + pl.y * half,
    },
  };
}

/**
 * When starting a new segment at refStart, choose offset sign so the strip stays on the same side as an existing wall
 * when continuing forward from its end, or the opposite side when attaching from its start (reverse direction).
 */
export function computeWallOffsetSignForNewWall(
  refStart: WallPoint,
  refEnd: WallPoint,
  existingWalls: MeshObjectData[]
): number {
  const tol = 0.75;
  const near = (a: WallPoint, b: WallPoint) =>
    Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol;

  for (const w of existingWalls) {
    const { startPoint: rs, endPoint: re } = getWallReferenceEdgePoints(w);
    const sw = w.wallOffsetSign ?? 1;
    if (near(refStart, re)) {
      return sw;
    }
    if (near(refStart, rs)) {
      return -sw;
    }
  }
  return 1;
}

/** Footprint from reference edge endpoints (shared by preview and placed walls). */
export function getFootprintQuadFromReferenceEdge(
  rs: WallPoint,
  re: WallPoint,
  sign: number,
  t: number
): [WallPoint, WallPoint, WallPoint, WallPoint] {
  const dx = re.x - rs.x;
  const dy = re.y - rs.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return [rs, re, re, rs];
  }
  const ux = dx / len;
  const uy = dy / len;
  const pl = perpLeft2D(ux, uy);
  const oppRs = { x: rs.x + pl.x * sign * t, y: rs.y + pl.y * sign * t };
  const oppRe = { x: re.x + pl.x * sign * t, y: re.y + pl.y * sign * t };
  return [rs, re, oppRe, oppRs];
}

/** Four corners of the wall footprint in order: ref start → ref end → opposite end → opposite start (closed quad). */
export function getWallFootprintQuad(
  wall: MeshObjectData
): [WallPoint, WallPoint, WallPoint, WallPoint] {
  const t = wall.dimensions?.depth ?? wall.thickness ?? WALL_THICKNESS_2D_UNITS;
  const sign = wall.wallOffsetSign ?? 1;

  if (wall.wallOffsetSign == null) {
    const { startPoint: cs, endPoint: ce } = getWall2DPoints(wall);
    const dx = ce.x - cs.x;
    const dy = ce.y - cs.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      return [cs, ce, ce, cs];
    }
    const ux = dx / len;
    const uy = dy / len;
    const pl = perpLeft2D(ux, uy);
    const h = t / 2;
    const a = { x: cs.x - pl.x * h, y: cs.y - pl.y * h };
    const b = { x: ce.x - pl.x * h, y: ce.y - pl.y * h };
    const c = { x: ce.x + pl.x * h, y: ce.y + pl.y * h };
    const d = { x: cs.x + pl.x * h, y: cs.y + pl.y * h };
    return [a, b, c, d];
  }

  const { startPoint: rs, endPoint: re } = getWallReferenceEdgePoints(wall);
  return getFootprintQuadFromReferenceEdge(rs, re, sign, t);
}

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
  const objects = state.data.objects;
  const walls = objects.filter((obj) => obj.type === FLOOR_PLAN_TYPES.WALL);

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

function camelToSnake(key: string): string {
  if (key === 'edgeBanding') return 'edgeband';
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function convertKeysToSnake<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnake) as any;
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [camelToSnake(k), convertKeysToSnake(v)])
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

// Cache for extracted colors: URL -> Hex Color
const colorCache = new Map<string, number>();

/**
 * Extract dominant/average color from an image URL
 * Returns a hex color value
 */
export async function extractColorFromImage(imageUrl: string): Promise<number> {
  // Check cache first
  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

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

        // Cache the result
        colorCache.set(imageUrl, hexColor);

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

export function findMesh(
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

// Re-export specific components from other files for backward compatibility
export { CustomToast } from '../utils/CustomToast';

// normalize UVs for a Extrude geometry because not directly apply texture just like box geometry type
export const normalizeUVs = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const boundingBox = geometry.boundingBox;
  if (!boundingBox) return;

  const uvAttribute = geometry.attributes.uv;
  const positionAttribute = geometry.attributes.position;
  const normalAttribute = geometry.attributes.normal;

  const boundingBoxSize = new THREE.Vector3();
  boundingBox.getSize(boundingBoxSize);

  for (let i = 0; i < uvAttribute.count; i++) {
    const posX = positionAttribute.getX(i);
    const posY = positionAttribute.getY(i);
    const posZ = positionAttribute.getZ(i);

    const normalX = normalAttribute.getX(i);
    const normalY = normalAttribute.getY(i);
    const normalZ = normalAttribute.getZ(i);

    const absNormalX = Math.abs(normalX);
    const absNormalY = Math.abs(normalY);
    const absNormalZ = Math.abs(normalZ);

    let u = 0;
    let v = 0;

    // Project UV based on dominant normal axis
    if (absNormalZ >= absNormalX && absNormalZ >= absNormalY) {
      u = boundingBoxSize.x > 0 ? (posX - boundingBox.min.x) / boundingBoxSize.x : 0;
      v = boundingBoxSize.y > 0 ? (posY - boundingBox.min.y) / boundingBoxSize.y : 0;
    } else if (absNormalY >= absNormalX && absNormalY >= absNormalZ) {
      u = boundingBoxSize.x > 0 ? (posX - boundingBox.min.x) / boundingBoxSize.x : 0;
      v = boundingBoxSize.z > 0 ? (posZ - boundingBox.min.z) / boundingBoxSize.z : 0;
    } else {
      u = boundingBoxSize.z > 0 ? (posZ - boundingBox.min.z) / boundingBoxSize.z : 0;
      v = boundingBoxSize.y > 0 ? (posY - boundingBox.min.y) / boundingBoxSize.y : 0;
    }

    uvAttribute.setXY(i, u, v);
  }

  uvAttribute.needsUpdate = true;
};

// map axis for sync state (this is actually IMP function for child objects)
// Generic mapping function for robust 1D scaling
// Preserves distance to edges if <= 150mm ("pinned"), otherwise scales proportionally.
export function mapAxis(
  baseCenter: number,
  baseSize: number,
  oldContainerSize: number,
  newContainerSize: number,
  isFixedSize: boolean
) {
  const MIN_DIM = 0.01;

  const oldHalf = oldContainerSize / 2;
  const newHalf = newContainerSize / 2;

  const minEdge = baseCenter - baseSize / 2;
  const maxEdge = baseCenter + baseSize / 2;

  const dLeft = minEdge - -oldHalf;
  const dRight = oldHalf - maxEdge;

  let nextSize = baseSize;
  let nextCenter = baseCenter;

  if (isFixedSize) {
    if (dLeft <= 150 && dLeft <= dRight) {
      nextCenter = -newHalf + dLeft + baseSize / 2;
    } else if (dRight <= 150) {
      nextCenter = newHalf - dRight - baseSize / 2;
    } else if (Math.abs(dLeft - dRight) < 1) {
      nextCenter = 0;
    } else {
      nextCenter = baseCenter * (newContainerSize / (oldContainerSize || MIN_DIM));
    }
  } else {
    let newMin, newMax;

    if (dLeft <= 150) {
      newMin = -newHalf + dLeft;
    } else {
      newMin = minEdge * (newContainerSize / (oldContainerSize || MIN_DIM));
    }

    if (dRight <= 150) {
      newMax = newHalf - dRight;
    } else {
      newMax = maxEdge * (newContainerSize / (oldContainerSize || MIN_DIM));
    }

    nextSize = Math.max(newMax - newMin, MIN_DIM);
    nextCenter = (newMin + newMax) / 2;
  }

  return { nextSize, nextCenter };
}

// update edges of the mesh
export function updateEdges(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  const type = mesh.userData.type;
  if (
    type === OBJECT_TYPES.SINK ||
    type === OBJECT_TYPES.MODEL ||
    type === FLOOR_PLAN_TYPES.FLOOR ||
    mesh.userData.isInvisibleBox
  ) {
    return;
  }

  const existingEdges = mesh.children.find((child) => child.userData.isWireframeEdge);
  if (existingEdges) {
    mesh.remove(existingEdges);
    if ((existingEdges as THREE.LineSegments).geometry) {
      (existingEdges as THREE.LineSegments).geometry.dispose();
    }
    if ((existingEdges as THREE.LineSegments).material) {
      ((existingEdges as THREE.LineSegments).material as THREE.Material).dispose();
    }
  }

  const edges = new THREE.EdgesGeometry(geometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  const edgeLines = new THREE.LineSegments(edges, edgesMaterial);
  edgeLines.userData.isWireframeEdge = true;

  // Respect the wireframe visibility setting from Redux
  const isWireframeVisible = store.getState().data.isWireframeVisible;
  edgeLines.visible = isWireframeVisible;

  mesh.add(edgeLines);
}
