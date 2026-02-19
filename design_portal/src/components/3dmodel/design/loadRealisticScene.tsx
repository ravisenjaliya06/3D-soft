import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { TEXTURES_URLS } from '../constants';
import { globalTextureLoader } from '../sceneCreator/utils';

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
  rotation?: number | null;
}

export async function createRealisticMaterial(
  scene: THREE.Scene | undefined,
  options: RealisticMaterialOptions = {}
): Promise<THREE.MeshStandardMaterial> {
  const { textures = {}, repeatX = 1, repeatY = 1 } = options;

  const textureLoader = globalTextureLoader;
  const hdrPath = TEXTURES_URLS.HDR;

  // --- Load HDR Environment ---
  const hdrPromise = new Promise<void>((resolve) => {
    new RGBELoader().load(hdrPath, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      if (scene) {
        if (!scene.environment) scene.environment = hdrTexture;
        if (!scene.background) scene.background = hdrTexture;
      } else {
        console.warn('Scene is undefined');
      }
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
        tex.rotation = options.rotation ? options.rotation : 0;
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
