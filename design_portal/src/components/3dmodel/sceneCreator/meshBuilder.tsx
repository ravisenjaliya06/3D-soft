import * as THREE from 'three';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { FLOOR_PLAN_TYPES, GEOMETRY, Material, MATERIAL_TYPES, MeshObjectData } from './interface';
import { convertKeysToCamel } from './utils';

export class MeshBuilder {
  private meshData: MeshObjectData;

  constructor(data: MeshObjectData) {
    this.meshData = convertKeysToCamel(data);
  }

  private _createTexture(materialData: Material): THREE.Texture | null {
    let texture: THREE.Texture | null = null;
    materialData?.textures?.forEach((textureData) => {
      texture = new THREE.TextureLoader().load(
        `${process.env.NEXT_PUBLIC_PUBLIC_API}` + textureData.textureDetail.image || ''
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.center.set(0, 0);
      texture.offset.set(0, 0);
    });
    return texture;
  }

  private _createTextureMaterial(materialData: Material): THREE.MeshStandardMaterial {
    const texture = this._createTexture(materialData);
    return new THREE.MeshStandardMaterial({
      map: texture,
      wireframe: false,
    });
  }

  private _getMaterial(): THREE.Material {
    let createdMaterial: THREE.Material | null = null;

    const material = this.meshData.material;
    if (!material) return new THREE.MeshStandardMaterial({ visible: false });

    const materialsArray = Array.isArray(material) ? material : [material];

    materialsArray.forEach((materialData) => {
      if (materialData.type === MATERIAL_TYPES.PANEL_STOCK) {
        createdMaterial = this._createTextureMaterial(materialData);
      }
    });

    return createdMaterial || new THREE.MeshStandardMaterial({ visible: false });
  }

  private _createBoxGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(
      this.meshData.dimensions?.width || 0,
      this.meshData.dimensions?.height || 0,
      this.meshData.dimensions?.depth || 0
    );
  }

  // NOTE: Right now, we only support square shapes. In the future, we’ll add more shape options when we need to create custom shapes.
  private _createShape(): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.lineTo(0, 1);
    shape.closePath();
    return shape;
  }

  private _createExtrudeGeometry(): THREE.ExtrudeGeometry {
    const shape = this._createShape();

    // NOTE: Right now, it only has two external properties (depth and bevelEnabled). Later on, we’ll add more properties when we need to support custom shapes.
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: this.meshData.dimensions?.depth || 0,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private _getGeometry() {
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        return this._createBoxGeometry();
      case GEOMETRY.EXTRUDE_GEOMETRY:
        return this._createExtrudeGeometry();
      default:
        return this._createBoxGeometry();
    }
  }

  private _setPosition(mesh: THREE.Mesh) {
    if (!this.meshData.position) return;
    mesh.position.set(this.meshData.position.x, this.meshData.position.y, this.meshData.position.z);
  }

  private _setRotation(mesh: THREE.Mesh) {
    if (!this.meshData.rotation) return;
    mesh.rotation.set(this.meshData.rotation.x, this.meshData.rotation.y, this.meshData.rotation.z);
  }

  private _setScale(mesh: THREE.Mesh) {
    if (!this.meshData.scale) return;
    mesh.scale.set(
      this.meshData.scale.x || 0.01,
      this.meshData.scale.y || 0.01,
      this.meshData.scale.z || 0.01
    );
  }

  private _setUserData(mesh: THREE.Mesh) {
    mesh.userData.type = this.meshData.type;
    mesh.userData.objectId = this.meshData.id;
    mesh.userData.isMain = this.meshData.isMain;
    mesh.userData.openDirection = this.meshData.openDirection;
    mesh.userData.drawerType = this.meshData.drawerType;
  }

  private _setName(mesh: THREE.Mesh) {
    mesh.name = this.meshData.name;
  }

  private _setDataInObjectsState() {
    store.dispatch(addObjects([this.meshData]));
  }

  public createMesh(): THREE.Mesh {
    const geometry = this._getGeometry();
    const material = this._getMaterial();

    const mesh = new THREE.Mesh(
      geometry,
      material ?? new THREE.MeshBasicMaterial({ visible: false })
    );

    this._setName(mesh);
    this._setPosition(mesh);
    this._setRotation(mesh);
    this._setScale(mesh);
    this._setUserData(mesh);
    if (!(this.meshData.type === FLOOR_PLAN_TYPES.WALL)) {
      this._setDataInObjectsState();
    }
    return mesh;
  }

  public updateMesh(
    mesh: THREE.Mesh,
    changes: Partial<MeshObjectData>,
    oldMaterial?: MeshObjectData['material']
  ) {
    this._setUserData(mesh);
    if (changes.position) {
      this._setPosition(mesh);
    }
    if (changes.rotation) {
      this._setRotation(mesh);
    }
    if (changes.scale) {
      this._setScale(mesh);
    }
    if (changes.material) {
      const newMaterial = changes.material;
      const oldMaterialArray = Array.isArray(oldMaterial)
        ? oldMaterial
        : oldMaterial
          ? [oldMaterial]
          : [];
      const newMaterialArray = Array.isArray(newMaterial)
        ? newMaterial
        : newMaterial
          ? [newMaterial]
          : [];

      if (oldMaterialArray.length > 0 && newMaterialArray.length > 0) {
        const oldMat = oldMaterialArray[0];
        const newMat = newMaterialArray[0];

        if (
          oldMat.type === MATERIAL_TYPES.PANEL_STOCK &&
          newMat.type === MATERIAL_TYPES.PANEL_STOCK &&
          oldMat.textures?.[0]?.textureDetail?.image === newMat.textures?.[0]?.textureDetail?.image
        ) {
          // If only rotation might have changed, update texture rotation
          // Note: Material interface doesn't have rotation, so we'll recreate the material
          if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
          mesh.material.dispose();
          mesh.material = this._getMaterial();
        } else {
          // Material changed, recreate it
          if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
          mesh.material.dispose();
          mesh.material = this._getMaterial();
        }
      } else {
        // Material added or removed
        if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
        mesh.material.dispose();
        mesh.material = this._getMaterial();
      }
    }
    if (changes.dimensions) {
      mesh.geometry.dispose();
      mesh.geometry = this._getGeometry();
    }
  }

  private _updateTextureRotation(mesh: THREE.Mesh, rotationDegrees?: number): void {
    const updateTextureRotation = (material: THREE.Material) => {
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        // For seamless tiling, rotate around (0, 0) not (0.5, 0.5)
        material.map.center.set(0, 0);

        // Ensure proper wrapping
        material.map.wrapS = THREE.RepeatWrapping;
        material.map.wrapT = THREE.RepeatWrapping;

        if (rotationDegrees !== undefined) {
          const rotationRad = THREE.MathUtils.degToRad(rotationDegrees);
          material.map.rotation = rotationRad;

          // Adjust offset to compensate for rotation and maintain seamless tiling
          // This prevents the zigzag pattern by aligning the rotated texture properly
          const cos = Math.cos(rotationRad);
          const sin = Math.sin(rotationRad);
          const offsetX = (1 - cos) * 0.5 - sin * 0.5;
          const offsetY = (1 - cos) * 0.5 + sin * 0.5;
          material.map.offset.set(offsetX, offsetY);
        } else {
          material.map.rotation = 0;
          material.map.offset.set(0, 0);
        }
        material.map.needsUpdate = true;
        material.needsUpdate = true;
      }
    };

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(updateTextureRotation);
    } else {
      updateTextureRotation(mesh.material);
    }

    // Also update children if this is a main mesh
    if (mesh.userData.isMain) {
      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach(updateTextureRotation);
          } else {
            updateTextureRotation(child.material);
          }
        }
      });
    }
  }
}
