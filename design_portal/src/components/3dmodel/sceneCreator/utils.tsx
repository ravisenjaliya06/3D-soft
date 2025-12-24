import * as THREE from 'three';
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
