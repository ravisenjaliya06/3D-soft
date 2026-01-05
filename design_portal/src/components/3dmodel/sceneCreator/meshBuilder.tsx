import * as THREE from 'three';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { FLOOR_PLAN_TYPES, GEOMETRY, MATERIAL_TYPE, MeshObjectData } from './interface';
import { convertKeysToCamel } from './utils';

export class MeshBuilder {
  private meshData: MeshObjectData;

  constructor(data: MeshObjectData) {
    this.meshData = convertKeysToCamel(data);
  }

  private _createTexture(): THREE.Texture {
    const texture = new THREE.TextureLoader().load(this.meshData.material?.value || '');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.meshData.material?.repeatX || 1, this.meshData.material?.repeatY || 1);
    return texture;
  }

  private _createColorMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: this.meshData.material?.value,
      wireframe: false,
    });
  }

  private _createTextureMaterial(): THREE.MeshStandardMaterial {
    const texture = this._createTexture();
    return new THREE.MeshStandardMaterial({
      map: texture,
      wireframe: false,
    });
  }

  private _getMaterial(): THREE.Material | THREE.MeshStandardMaterial {
    const material = this.meshData.material;
    if (!material) {
      return new THREE.MeshStandardMaterial({ visible: false });
    }
    if (material.type === MATERIAL_TYPE.COLOR && material.value) {
      return this._createColorMaterial();
    }
    if (material.type === MATERIAL_TYPE.TEXTURE && material.value) {
      return this._createTextureMaterial();
    }
    return new THREE.MeshStandardMaterial({ visible: false });
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

  public updateMesh(mesh: THREE.Mesh, changes: Partial<MeshObjectData>) {
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
      if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
      mesh.material.dispose();
      mesh.material = this._getMaterial();
    }
    if (changes.dimensions) {
      mesh.geometry.dispose();
      mesh.geometry = this._getGeometry();
    }
  }
}
