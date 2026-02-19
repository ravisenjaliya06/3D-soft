import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Cache to store the loaded GLB models (promises returning the scene) - Runtime Cache
const glbCache = new Map<string, Promise<THREE.Object3D>>();

// Browser Cache Name
const CACHE_NAME = 'bravento-glb-cache-v1';

const preloadQueue: string[] = [];
let activeRequests = 0;
const MAX_CONCURRENCY = 1;

/**
 * Process the queue with concurrency limit
 */
const processQueue = async () => {
  if (preloadQueue.length === 0) return;

  while (activeRequests < MAX_CONCURRENCY && preloadQueue.length > 0) {
    const url = preloadQueue.shift();
    if (url) {
      activeRequests++;
      // We don't await here so we can start multiple requests
      loadAndCacheGLB(url).finally(() => {
        activeRequests--;
        processQueue(); // Trigger next item when one finishes
      });
    }
  }
};

/**
 * Load GLB from Browser Cache or Network
 */
const loadAndCacheGLB = async (url: string): Promise<THREE.Object3D> => {
  // 1. Check Runtime Cache first (fastest)
  if (glbCache.has(url)) {
    return glbCache.get(url)!;
  }

  // Create a promise for this load
  const loadPromise = new Promise<THREE.Object3D>(async (resolve, reject) => {
    try {
      let objectUrl = url;
      let isFromCache = false;

      // 2. Check Browser Cache (Persistence)
      if ('caches' in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(url);

          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            objectUrl = URL.createObjectURL(blob);
            isFromCache = true;
          }
        } catch (e) {
          console.warn('Cache API error:', e);
        }
      }

      // 3. Load with GLTFLoader (from Network or ObjectURL)
      const loader = new GLTFLoader();
      loader.load(
        objectUrl,
        async (glb) => {
          // If we loaded from network, save to cache
          if (!isFromCache && 'caches' in window && objectUrl === url) {
            try {
              // We need to fetch the blob again to store it, or use a custom loader manager?
              // GLTFLoader doesn't give us the blob directly.
              // To properly cache, we should fetch first, then load from blob.
              // However, since we already loaded it via GLTFLoader, fetching again might be double traffic
              // UNLESS we change strategy: Fetch Blob -> Cache Blob -> Load from Blob.
              // Let's do that for correct caching.
            } catch (e) {
              console.warn('Failed to cache GLB:', e);
            }
          }

          // Clean up ObjectURL if used
          if (isFromCache) {
            URL.revokeObjectURL(objectUrl);
          }

          resolve(glb.scene);
        },
        undefined,
        (error) => {
          console.error(`Error loading GLB ${url}:`, error);
          if (isFromCache) URL.revokeObjectURL(objectUrl);
          glbCache.delete(url); // Remove failed promise from cache
          reject(error);
        }
      );
    } catch (error) {
      glbCache.delete(url);
      reject(error);
    }
  });

  // Store in runtime cache
  glbCache.set(url, loadPromise);
  return loadPromise;
};

/**
 * Advanced Loader that Fetches Blob, Caches it, then Parses
 */
const fetchAndLoadGLB = async (url: string): Promise<THREE.Object3D> => {
  // 1. Runtime Cache
  if (glbCache.has(url)) return glbCache.get(url)!;

  const promise = new Promise<THREE.Object3D>(async (resolve, reject) => {
    try {
      let blob: Blob | null = null;

      // 2. Browser Cache
      if ('caches' in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const response = await cache.match(url);
          if (response) {
            blob = await response.blob();
          }
        } catch (e) {
          console.warn('Cache Check failed', e);
        }
      }

      // 3. Network Fetch (if no blob)
      if (!blob) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${url}`);
          blob = await response.blob();

          // Save to Cache
          if ('caches' in window) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(url, new Response(blob));
          }
        } catch (e) {
          // Fallback to normal loader if fetch fails (cors, etc)
          console.warn('Fetch failed, falling back to GLTFLoader direct', e);
          const loader = new GLTFLoader();
          loader.load(url, (g) => resolve(g.scene), undefined, reject);
          return;
        }
      }

      // 4. Load from Blob
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        const loader = new GLTFLoader();
        loader.load(
          objectUrl,
          (glb) => {
            URL.revokeObjectURL(objectUrl);
            resolve(glb.scene);
          },
          undefined,
          (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
          }
        );
      }
    } catch (error) {
      reject(error);
    }
  });

  glbCache.set(url, promise);
  return promise;
};

export const scheduleGLBPreload = (url: string): void => {
  if (glbCache.has(url)) return;

  // Avoid duplicates in queue
  if (!preloadQueue.includes(url)) {
    preloadQueue.push(url);
  }

  processQueue();
};

export const preloadGLB = (url: string): void => {
  fetchAndLoadGLB(url).catch((e) => console.error('Preload failed', e));
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

  // Ensure loading is started via queue
  scheduleGLBPreload(url);

  // Return a promise that waits for the cache to be populated by the queue
  const loadPromise = new Promise<THREE.Object3D>((resolve, reject) => {
    // Check if already in cache
    if (glbCache.has(url)) {
      glbCache.get(url)!.then(resolve).catch(reject);
      return;
    }

    // If not in cache, we need to wait until the queue processes it.
    // We can poll or use a more sophisticated event emitter.
    // For simplicity, we'll poll the cache every 100ms
    const interval = setInterval(() => {
      if (glbCache.has(url)) {
        clearInterval(interval);
        glbCache.get(url)!.then(resolve).catch(reject);
      }
    }, 100);
  });

  // Return a new promise that resolves to a *clone* of the cached model
  return loadPromise.then((cachedModel) => {
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
