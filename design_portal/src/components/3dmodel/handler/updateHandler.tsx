import { Dispatch } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Dimensions } from '../interface';
import { MeshObjectData } from '../sceneCreator/interface';
import { MATERIAL_TYPES } from '../sidebar/interface';
import { updateObject } from '../store/dataSlice';
import { Position } from '../store/interface';
import { updateOrRefreshOutline } from '../utils/outlineHelpers';
import { UpdateDimensionsParams, UpdatePayload } from './interface';

export class UpdateObjectInScene {
  private readonly scene: THREE.Scene;
  private readonly dispatch: Dispatch;

  constructor(scene: THREE.Scene, dispatch: Dispatch) {
    this.scene = scene;
    this.dispatch = dispatch;
  }

  /** Updates a 3D object in both the Three.js scene and the Redux store. */
  public update(objectId: string, updates: UpdatePayload, currentObject?: MeshObjectData): void {
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

    if (mesh.userData.isMain && mesh.children.length > 8) {
      alert(
        'Cannot update dimensions of a modified cupboard. if once you add plank then it cannot be updated.'
      );
      return;
    }

    const { width, height, depth } = updates.dimensions;
    const params = mesh.geometry.parameters;
    const updateParams: UpdateDimensionsParams = {
      newWidth: width ?? params.width,
      newHeight: height ?? params.height,
      newDepth: depth ?? params.depth,
      oldWidth: params.width,
      oldHeight: params.height,
      oldDepth: params.depth,
    };

    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(
      updateParams.newWidth,
      updateParams.newHeight,
      updateParams.newDepth
    );

    if (mesh.userData.isMain) {
      this.updateChildrenDynamic(mesh, updateParams);
    }

    updateOrRefreshOutline(this.scene, mesh);
  }

  //update main object with children(planks)
  private updateChildrenDynamic(mesh: THREE.Mesh, params: UpdateDimensionsParams): void {
    const { newWidth, newHeight, newDepth, oldWidth, oldHeight, oldDepth } = params;
    //Temporary fix for zero dimension
    const MIN_DIM = 0.01;
    /**
     * Calculate how much the parent mesh has scaled.
     * Example:
     *  oldWidth = 100, newWidth = 200 → scaleX = 2
     *  That means children should also double in width.
     */
    const scaleX = newWidth / (oldWidth + MIN_DIM);
    const scaleY = newHeight / (oldHeight + MIN_DIM);
    const scaleZ = newDepth / (oldDepth + MIN_DIM);

    mesh.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.BoxGeometry)) return;
      const childParams = child.geometry.parameters;

      /**
       * New child dimensions after scaling.
       * If the parent grows or shrinks, each child grows/shrinks proportionally.
       */
      const nextWidth = Math.max(childParams.width * scaleX, MIN_DIM);
      const nextHeight = Math.max(childParams.height * scaleY, MIN_DIM);
      const nextDepth = Math.max(childParams.depth * scaleZ, MIN_DIM);

      /**
       * Update child position as well.
       * If the parent gets bigger, children move farther away proportionally.
       * If the parent gets smaller, children move closer proportionally.
       */
      const nextX = child.position.x * scaleX;
      const nextY = child.position.y * scaleY;
      const nextZ = child.position.z * scaleZ;

      child.geometry.dispose();
      child.geometry = new THREE.BoxGeometry(nextWidth, nextHeight, nextDepth);

      child.position.set(nextX, nextY, nextZ);

      updateOrRefreshOutline(this.scene, child);

      /**
       * If this child also exists in your Redux store,
       * update its dimensions + position there as well.
       */
      if (child.userData.objectId) {
        this.dispatch(
          updateObject({
            id: child.userData.objectId,
            dimensions: {
              width: nextWidth,
              height: nextHeight,
              depth: nextDepth,
            },
            position: {
              x: nextX,
              y: nextY,
              z: nextZ,
            },
          })
        );
      }
    });
  }

  /** Updates position (x, y, z) */
  private updateMeshPosition(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.position) return;

    const { x, y, z } = updates.position;
    if (x !== undefined) mesh.position.x = x;
    if (y !== undefined) mesh.position.y = y;
    if (z !== undefined) mesh.position.z = z;

    updateOrRefreshOutline(this.scene, mesh);
  }

  /** Updates rotation (in degrees → converted to radians) */
  private updateMeshRotation(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.rotation) return;

    const { x, y, z } = updates.rotation;
    if (x !== undefined) mesh.rotation.x = THREE.MathUtils.degToRad(x);
    if (y !== undefined) mesh.rotation.y = THREE.MathUtils.degToRad(y);
    if (z !== undefined) mesh.rotation.z = THREE.MathUtils.degToRad(z);

    updateOrRefreshOutline(this.scene, mesh);
  }

  /** Updates material (color or texture) */
  private updateMeshMaterial(mesh: THREE.Mesh, updates: UpdatePayload): void {
    if (!updates.material) return;

    const { type, value } = updates.material;

    const updateTarget = (targetMesh: THREE.Mesh) => {
      if (type === MATERIAL_TYPES.COLOR) {
        const color = new THREE.Color(value);
        this.applyColorMaterial(targetMesh, color);
      } else if (type === MATERIAL_TYPES.TEXTURE) {
        this.applyTextureMaterial(targetMesh, value);
      }
    };

    updateTarget(mesh);

    if (mesh.userData.isMain) {
      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          updateTarget(child);
          if (child.userData.objectId && updates.material) {
            this.dispatch(
              updateObject({
                id: child.userData.objectId,
                material: updates.material,
              })
            );
          }
        }
      });
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
  private updateRedux(objectId: string, updates: UpdatePayload, currentObject?: MeshObjectData) {
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
