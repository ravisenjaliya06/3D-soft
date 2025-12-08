import { Dispatch } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Dimensions } from '../interface';
import { MATERIAL_TYPES } from '../sidebar/interface';
import { updateObject } from '../store/dataSlice';
import { Object3D, Position } from '../store/interface';
import { UpdatePayload } from './interface';

export class UpdateObjectInScene {
  private readonly scene: THREE.Scene;
  private readonly dispatch: Dispatch;

  constructor(scene: THREE.Scene, dispatch: Dispatch) {
    this.scene = scene;
    this.dispatch = dispatch;
  }

  /** Updates a 3D object in both the Three.js scene and the Redux store. */
  public update(objectId: string, updates: UpdatePayload, currentObject?: Object3D): void {
    const mesh = this.findMeshById(objectId);
    if (!mesh) {
      console.warn(`[ObjectUpdater] Mesh with ID "${objectId}" not found in scene.`);
      return;
    }

    this.updateMeshGeometry(mesh, updates);
    this.updateMeshPosition(mesh, updates);
    this.updateMeshRotation(mesh, updates);
    this.updateMeshMaterial(mesh, updates);

    if (currentObject) {
      this.updateRedux(objectId, updates, currentObject);
    }
  }

  /** Finds a mesh in the scene by its userData.objectId */
  private findMeshById(objectId: string): THREE.Mesh | null {
    let foundMesh: THREE.Mesh | null = null;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.objectId === objectId) {
        foundMesh = object;
      }
    });

    return foundMesh;
  }

  /** Updates geometry width, height, depth */
  private updateMeshGeometry(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.dimensions) return;
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const { width, height, depth } = updates.dimensions;
    const params = mesh.geometry.parameters;

    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(
      width ?? params.width,
      height ?? params.height,
      depth ?? params.depth
    );
  }

  /** Updates position (x, y, z) */
  private updateMeshPosition(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.position) return;

    const { x, y, z } = updates.position;
    if (x !== undefined) mesh.position.x = x;
    if (y !== undefined) mesh.position.y = y;
    if (z !== undefined) mesh.position.z = z;
  }

  /** Updates rotation (in degrees → converted to radians) */
  private updateMeshRotation(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.rotation) return;

    const { x, y, z } = updates.rotation;
    if (x !== undefined) mesh.rotation.x = THREE.MathUtils.degToRad(x);
    if (y !== undefined) mesh.rotation.y = THREE.MathUtils.degToRad(y);
    if (z !== undefined) mesh.rotation.z = THREE.MathUtils.degToRad(z);
  }

  /** Updates material (color or texture) */
  private updateMeshMaterial(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.material) return;

    const { type, value } = updates.material;

    if (type === MATERIAL_TYPES.COLOR) {
      const color = new THREE.Color(value);
      this.applyColorMaterial(mesh, color);
    }

    if (type === MATERIAL_TYPES.TEXTURE) {
      this.applyTextureMaterial(mesh, value);
    }
  }

  /** Applies a solid color material */
  private applyColorMaterial(mesh: THREE.Mesh, color: THREE.Color): void {
    const applyColor = (material: THREE.Material) =>
      this.cloneStandardMaterial(material, (mat) => {
        mat.color.copy(color);
        mat.map = null;
      });

    this.updateMeshMaterialList(mesh, applyColor);
  }

  private createTextureTransformer(texture: THREE.Texture) {
    return (material: THREE.Material) =>
      this.cloneStandardMaterial(material, (mat) => {
        mat.map = texture;
        mat.color.setHex(0xffffff);
      });
  }

  /** Loads and applies a texture */
  private applyTextureMaterial(mesh: THREE.Mesh, textureUrl: string): void {
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 1);
        const applyTexture = this.createTextureTransformer(texture);
        this.updateMeshMaterialList(mesh, applyTexture);
      },
      (err) => {
        console.error(`[ObjectUpdater] Failed to load texture: ${textureUrl}`, err);
      }
    );
  }

  /** Clones a material and applies a transformation callback. */
  private cloneStandardMaterial(
    material: THREE.Material,
    transform: (mat: THREE.MeshStandardMaterial) => void
  ): THREE.MeshStandardMaterial {
    const stdMat = material.clone() as THREE.MeshStandardMaterial;
    transform(stdMat);
    stdMat.needsUpdate = true;
    return stdMat;
  }

  /** Applies a material-transforming function to a mesh's material(s) */
  private updateMeshMaterialList(
    mesh: THREE.Mesh,
    transform: (material: THREE.Material) => THREE.Material
  ): void {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(transform);
    } else {
      mesh.material = transform(mesh.material);
    }
  }

  /** updated object data to Redux store */
  private updateRedux(objectId: string, updates: UpdatePayload, currentObject?: Object3D) {
    if (!currentObject) return;

    this.dispatch(
      updateObject({
        id: objectId,
        dimensions: updates.dimensions
          ? ({ ...currentObject.dimensions, ...updates.dimensions } as Dimensions)
          : currentObject.dimensions,

        position: updates.position
          ? { ...currentObject.position, ...updates.position }
          : currentObject.position,

        rotation: updates.rotation
          ? ({ ...currentObject.rotation, ...updates.rotation } as Position)
          : currentObject.rotation,

        material: updates.material ?? currentObject.material,
      })
    );
  }
}
