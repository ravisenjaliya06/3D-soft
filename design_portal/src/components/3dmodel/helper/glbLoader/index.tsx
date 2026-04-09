import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// --- Shared Loaders Configuration ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath(
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r151/examples/jsm/libs/basis/'
);

const glbParseCache = new Map<string, Promise<THREE.Object3D>>();

const GLB_CACHE_NAME = 'bravento-glb-cache-v2';
const TEXTURE_CACHE_NAME = 'bravento-texture-cache-v1';

const prefetchedUrls = new Set<string>();

export const prefetchModel = (url: string): void => {
  if (!url || prefetchedUrls.has(url)) return;

  prefetchedUrls.add(url);
  fetch(url, { priority: 'low' } as any).catch((err) => {
    prefetchedUrls.delete(url);
    console.warn(`Failed to prefetch model: ${url}`, err);
  });
};

/**
 * Fetches and Caches the Texture Blob.
 */
export const prefetchTexture = async (url: string): Promise<void> => {
  try {
    if ('caches' in window) {
      const cache = await caches.open(TEXTURE_CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) return;
    }

    const response = await fetch(url, { priority: 'low' } as any);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const blob = await response.blob();

    if ('caches' in window) {
      const cache = await caches.open(TEXTURE_CACHE_NAME);
      await cache.put(url, new Response(blob));
    }
  } catch (e) {
    console.warn(`Failed to prefetch texture ${url}`, e);
  }
};

const loadAndParseGLB = async (url: string): Promise<THREE.Object3D> => {
  // Memory Cache (Instant Repeated Clicks)
  if (glbParseCache.has(url)) {
    return glbParseCache.get(url)!;
  }

  const promise = new Promise<THREE.Object3D>(async (resolve, reject) => {
    try {
      let activeUrl = url;
      let isLocalUrl = false;

      if ('caches' in window) {
        try {
          const cache = await caches.open(GLB_CACHE_NAME);
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            activeUrl = URL.createObjectURL(blob);
            isLocalUrl = true;
          }
        } catch (e) {
          console.warn('Persistent cache check failed', e);
        }
      }

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.setKTX2Loader(ktx2Loader);

      // Fetch from Network (Single-Pass)
      if (!isLocalUrl) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${url}`);

          // Save to persistent cache while simultaneously processing the blob
          if ('caches' in window) {
            const cache = await caches.open(GLB_CACHE_NAME);
            await cache.put(url, response.clone());
          }

          const blob = await response.blob();
          activeUrl = URL.createObjectURL(blob);
          isLocalUrl = true; // Mark as blob URL for cleanup
        } catch (fetchErr) {
          console.error('Network fetch failed', fetchErr);
          reject(fetchErr);
          return;
        }
      }

      loader.load(
        activeUrl,
        (glb) => {
          if (isLocalUrl) URL.revokeObjectURL(activeUrl);
          resolve(glb.scene);
        },
        undefined,
        (err) => {
          if (isLocalUrl) URL.revokeObjectURL(activeUrl);
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

export const GLBLoader = (
  url: string,
  name: string,
  target: { width: number; height: number; depth: number }
): Promise<THREE.Object3D> => {
  /**
   * Loads a GLB model directly from the network.
   * Returns a clone of the model, scaled to the target dimensions.
   */

  // Ensure loading starts directly
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
