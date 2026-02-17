import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Cache to store the loaded GLB models (promises returning the scene)
const glbCache = new Map<string, Promise<THREE.Object3D>>();

export const preloadGLB = (url: string): void => {
  if (!glbCache.has(url)) {
    const loader = new GLTFLoader();
    const loadPromise = new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        url,
        (glb) => {
          // Resolve with the original scene (unscaled, or base scale)
          resolve(glb.scene);
        },
        undefined,
        (error) => {
          console.error(`Error loading GLB ${url}:`, error);
          // Remove from cache on error so we can try again later
          glbCache.delete(url);
          reject(error);
        }
      );
    });
    glbCache.set(url, loadPromise);
  }
};

export const GLBLoader = (
  url: string,
  name: string,
  target: { width: number; height: number; depth: number }
): Promise<THREE.Object3D> => {
  /**
   * Loads a GLB model with caching.
   * If the model is already loading or loaded, it reuses the promise/result.
   * Returns a clone of the cached model, scaled to the target dimensions.
   */

  // Ensure loading is started
  preloadGLB(url);

  // Return a new promise that resolves to a *clone* of the cached model
  return glbCache.get(url)!.then((cachedModel) => {
    // Clone the model so we can modify it (scale, position) without affecting the cache
    const model = SkeletonUtils.clone(cachedModel) as THREE.Object3D;

    // --- Apply Scaling and Centering Logic (Same as before) ---
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Initial uniform scale based on bounding box
    // Avoid division by zero if size is 0 (unlikely for valid models)
    if (size.x > 0 && size.y > 0 && size.z > 0) {
      const uniformScale = Math.min(
        target.width / size.x,
        target.height / size.y,
        target.depth / size.z
      );
      model.scale.setScalar(uniformScale);
      model.updateMatrixWorld(true);
    }

    // Fine-tuning scale
    const newBox = new THREE.Box3().setFromObject(model);
    const newSize = new THREE.Vector3();
    newBox.getSize(newSize);

    if (newSize.x > 0 && newSize.y > 0 && newSize.z > 0) {
      const adjX = target.width / newSize.x;
      const adjY = target.height / newSize.y;
      const adjZ = target.depth / newSize.z;
      const correction = (adjX + adjY + adjZ) / 3;
      model.scale.multiplyScalar(correction);
      model.updateMatrixWorld(true);
    }

    // Centering
    const finalBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    finalBox.getCenter(center);
    model.position.sub(center);

    // Shadow properties
    model.traverse((n: THREE.Object3D) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        // Ensure materials are cloned if necessary for independent modification
        // For now, sharing materials is usually fine unless we change color per instance
      }
    });

    model.name = name;
    return model;
  });
};
