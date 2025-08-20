import commonService from '@/services/CommonService';
import { getDesignId } from '../customDesign/handler/objectCreator';
import { Object3D, Position } from '../store/interface';
import { safeNameIncludes } from './nameUtils';

export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  prop: K,
  defaultValue: T[K],
): T[K] {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }
  return obj[prop] !== undefined ? obj[prop] : defaultValue;
}

export function safeSetProperties<T>(
  target: T,
  source: Partial<T>,
  props: (keyof T)[],
): T {
  if (!target || !source) {
    return target;
  }

  props.forEach((prop) => {
    if (source[prop] !== undefined) {
      (target[prop] as T[keyof T]) = source[prop] as T[keyof T];
    }
  });

  return target;
}

export function cloneObject3D(obj: Object3D): Object3D {
  if (!obj) {
    console.warn('Attempted to clone undefined or null Object3D');
    return {} as Object3D;
  }

  return {
    ...obj,
    position: obj.position ? { ...obj.position } : { x: 0, y: 0, z: 0 },
    material: obj.material
      ? { ...obj.material }
      : { type: 'TEXTURE', value: 'default' },
    child: obj.child ? [...obj.child] : [],
  };
}

export function isObjectOfType(
  obj: Object3D | null | undefined,
  typeIdentifier: string,
): boolean {
  if (!obj) return false;
  return safeNameIncludes(obj.name, typeIdentifier);
}

export function getSafeReadOnlyObject3D(
  obj: Partial<Object3D>,
): Readonly<Object3D> {
  const defaultObject: Object3D = {
    id: '',
    name: '',
    width: 0,
    height: 0,
    depth: 0,
    position: { x: 0, y: 0, z: 0 },
    material: { type: 'TEXTURE', value: 'default' },
    parent: null,
    child: [],
    layer: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    altitude: 0,
  };

  return Object.freeze({
    ...defaultObject,
    ...obj,
  });
}

interface ImageProperties {
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  aspectRatio?: number;
  fileName?: string;
  isImageMaterial?: boolean;
}

interface Shape {
  id: string;
  type: string;
  properties: Record<string, unknown> & Partial<ImageProperties>;
  position: Position;
  rotation: Position;
  scale: Position;
}

interface UpdatedData {
  width?: number;
  height?: number;
  depth?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: Position;
  position?: Position;
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  aspectRatio?: number;
  fileName?: string;
  isImageMaterial?: boolean;
}

interface CatalogData {
  position: Position;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: Position;
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  aspectRatio?: number;
  fileName?: string;
  imageMetadata?: {
    timestamp: string;
    persistDuringTransform: boolean;
    originalUrl: string;
  };
}

interface CatalogPayload {
  data: {
    catalog: {
      id: string;
      name: string;
      data: CatalogData;
      is_custom: boolean;
      is_default: boolean;
    };
  };
}

export const updateObjectInDatabase = async (
  objectData: Shape,
  updatedData: UpdatedData,
): Promise<void> => {
  try {
    const designId = getDesignId();
    if (!designId) {
      throw new Error('Design ID not found');
    }

    // Prepare the base data object, preserving existing properties
    const mainDataObject = {
      // Preserve existing properties from objectData
      ...(objectData.properties?.dimensions || {}),
      points:
        objectData.type === 'line'
          ? objectData.properties?.points || undefined
          : objectData.properties?.points || undefined,
      curvePoints: objectData.properties?.curvePoints || undefined,
      position: {
        x: objectData.position ? objectData.position.x : 0,
        y: objectData.position ? objectData.position.y : 0,
        z: objectData.position ? objectData.position.z : 0,
      },
      rotateX: objectData.rotation ? objectData.rotation.x : 0,
      rotateY: objectData.rotation ? objectData.rotation.y : 0,
      rotateZ: objectData.rotation ? objectData.rotation.z : 0,
      scale: {
        x: objectData.scale ? objectData.scale.x : 1,
        y: objectData.scale ? objectData.scale.y : 1,
        z: objectData.scale ? objectData.scale.z : 1,
      },
      // Include image-specific properties if applicable
      ...(objectData.type === 'image' && {
        imageUrl: objectData.properties.imageUrl || '',
        imageSize: objectData.properties.imageSize || {
          width: 100,
          height: 100,
        },
        aspectRatio: objectData.properties.aspectRatio || 1,
        fileName: objectData.properties.fileName || 'image.png',
        imageMetadata: {
          timestamp: new Date().toISOString(),
          persistDuringTransform: true,
          originalUrl: objectData.properties.imageUrl || '',
        },
      }),
      // Apply updated data (position, rotation, scale)
      ...(updatedData && typeof updatedData === 'object' ? updatedData : {}),
    };

    const payload: CatalogPayload = {
      data: {
        catalog: {
          id: objectData.id,
          name: objectData.type || 'object',
          data: mainDataObject,
          is_custom: true,
          is_default: true,
        },
      },
    };

    await commonService.putObjectData('design', designId, 'object', payload);
  } catch (error) {
    console.error('Error updating object:', error);
    throw error;
  }
};
