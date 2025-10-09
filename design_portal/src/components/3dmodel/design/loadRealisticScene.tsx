import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export interface RealisticMaterialOptions {
  textures?: {
    color?: string;
    normal?: string;
    roughness?: string;
    metalness?: string;
    ao?: string;
    displacement?: string;
  };
  repeatX?: number;
  repeatY?: number;
}

/**
 * Creates a physically realistic PBR material and applies an HDR environment map
 * for lighting/reflections. Can be reused anywhere in your Three.js or React-Three-Fiber app.
 *
 * @param scene - The THREE.Scene instance where the environment will be applied.
 * @param options - Optional configuration for textures, repeats, and HDR path.
 * @returns A Promise that resolves to a MeshStandardMaterial ready to use.
 */
export async function createRealisticMaterial(
  scene: THREE.Scene,
  options: RealisticMaterialOptions = {},
): Promise<THREE.MeshStandardMaterial> {
  const { textures = {}, repeatX = 1, repeatY = 1 } = options;

  const textureLoader = new THREE.TextureLoader();
  const hdrPath = '/hdr/rosendal_plains_2_2k.hdr';

  // --- Load HDR Environment ---
  const hdrPromise = new Promise<void>((resolve) => {
    new RGBELoader().load(hdrPath, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdrTexture;
      scene.background = hdrTexture;
      resolve();
    });
  });

  // --- Load texture maps ---
  const texturePromises: Record<string, Promise<THREE.Texture>> = {};
  for (const [key, path] of Object.entries(textures)) {
    texturePromises[key] = new Promise((resolve) => {
      textureLoader.load(path, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        resolve(tex);
      });
    });
  }

  const loadedTextures: Record<string, THREE.Texture | null> = {};
  for (const [key, promise] of Object.entries(texturePromises)) {
    loadedTextures[key] = await promise;
  }

  await hdrPromise;

  // --- Create PBR material ---
  const material = new THREE.MeshStandardMaterial({
    map: loadedTextures.color || null,
    normalMap: loadedTextures.normal || null,
    roughnessMap: loadedTextures.roughness || null,
    metalnessMap: loadedTextures.metalness || null,
    aoMap: loadedTextures.ao || null,
    displacementMap: loadedTextures.displacement || null,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  return material;
}
