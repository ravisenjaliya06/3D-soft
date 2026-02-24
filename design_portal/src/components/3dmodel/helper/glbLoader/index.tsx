import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Cache to store the loaded GLB models (promises returning the scene) - Runtime Cache
const glbParseCache = new Map<string, Promise<THREE.Object3D>>();

// Browser Cache Name
const CACHE_NAME = 'bravento-glb-cache-v1';

/**
 * Fetches and Caches the GLB Blob. Does NOT parse it.
 * This is safe to run in parallel in the background.
 */
const fetchAndCacheBlob = async (url: string): Promise<void> => {
  try {
    // 1. Check if already in Browser Cache
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        return; // Already cached
      }
    }

    // 2. Fetch from Network
    // Use low priority to avoid blocking critical API requests like register/login
    const response = await fetch(url, { priority: 'low' } as any);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const blob = await response.blob();

    // 3. Save to Browser Cache
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, new Response(blob));
    }
  } catch (e) {
    console.warn(`Failed to prefetch ${url}`, e);
  }
};

/**
 * Load GLB from Browser Cache (if available) or Network, then Parse.
 */
const loadAndParseGLB = async (url: string): Promise<THREE.Object3D> => {
  // 1. Check Runtime Parse Cache (Fastest)
  if (glbParseCache.has(url)) {
    return glbParseCache.get(url)!;
  }

  const promise = new Promise<THREE.Object3D>(async (resolve, reject) => {
    try {
      let objectUrl = url;
      let isFromCache = false;

      // 2. Try to get Blob from Browser Cache
      if ('caches' in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const response = await cache.match(url);
          if (response) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            isFromCache = true;
          }
        } catch (e) {
          console.warn('Cache check failed', e);
        }
      }

      // 3. Parse with GLTFLoader
      const loader = new GLTFLoader();
      loader.load(
        objectUrl,
        (glb) => {
          if (isFromCache) URL.revokeObjectURL(objectUrl);
          resolve(glb.scene);
        },
        undefined,
        (err) => {
          if (isFromCache) URL.revokeObjectURL(objectUrl);
          console.error(`Error loading GLB ${url}:`, err);
          reject(err);
        }
      );
    } catch (error) {
      reject(error);
    }
  });

  glbParseCache.set(url, promise);
  return promise;
};

/**
 * Prefetch a single URL (Fire and Forget)
 */
export const prefetchGLB = (url: string): void => {
  fetchAndCacheBlob(url);
};

/**
 * Prefetch multiple URLs sequentially to avoid network choking
 */
export const prefetchAll = (urls: string[]): void => {
  // We process these sequentially with delays to ensure the network isn't choked,
  // preventing critical API calls (like Register/Login) from timing out or delaying.
  setTimeout(async () => {
    for (const url of urls) {
      try {
        await fetchAndCacheBlob(url);
        // Small pause between fetches to allow other requests to execute
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error('Error during batch prefetch', e);
      }
    }
    console.log(`Finished prefetching ${urls.length} models`);
  }, 2000); // 3-second initial delay so first page load is prioritized
};

export const GLBLoader = (
  url: string,
  name: string,
  target: { width: number; height: number; depth: number }
): Promise<THREE.Object3D> => {
  /**
   * Loads a GLB model with caching.
   * Returns a clone of the cached model, scaled to the target dimensions.
   */

  // Ensure parsing starts
  const loadPromise = loadAndParseGLB(url);

  // Return a new promise that resolves to a *clone* of the cached model
  return loadPromise.then((cachedModel) => {
    // Clone the model so we can modify it (scale, position) without affecting the cache
    const model = SkeletonUtils.clone(cachedModel) as THREE.Object3D;

    // --- Apply Scaling and Centering Logic ---
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

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

    // Instead of wrapping in a Group, we just apply the centering subtract
    // and remember how much it was shifted so the toolbar logic can calculate bottom alignment!
    model.position.sub(center);
    model.userData.centerOffset = center.clone(); // store original offset to compute actual bottom accurately

    // Shadow properties
    model.traverse((n: THREE.Object3D) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    model.name = name;
    return model;
  });
};
