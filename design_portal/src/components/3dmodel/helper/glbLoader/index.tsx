import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const GLBLoader = (
  url: string,
  name: string,
  target: { width: number; height: number; depth: number }
): Promise<THREE.Object3D> => {
  /** 
   * Loads a GLB model, uniformly scales it to the target dimensions, centers it, and returns the 3D object. 
  */

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (glb) => {
        const model = glb.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const uniformScale = Math.min(
          target.width / size.x,
          target.height / size.y,
          target.depth / size.z
        );
        model.scale.setScalar(uniformScale);
        model.updateMatrixWorld(true);

        const newBox = new THREE.Box3().setFromObject(model);
        const newSize = new THREE.Vector3();
        newBox.getSize(newSize);
        const adjX = target.width / newSize.x;
        const adjY = target.height / newSize.y;
        const adjZ = target.depth / newSize.z;
        const correction = (adjX + adjY + adjZ) / 3;
        model.scale.multiplyScalar(correction);
        model.updateMatrixWorld(true);

        const finalBox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        finalBox.getCenter(center);
        model.position.sub(center);

        model.traverse((n: THREE.Object3D) => {
          if (n instanceof THREE.Mesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });

        model.name = name;
        resolve(model);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
};
