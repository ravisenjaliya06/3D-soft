import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { generateCompartmentsFromMesh } from '../handler/items';
import { GEOMETRY, MeshObjectData, MATERIAL_TYPE, userData } from './interface';

export class MeshBuilder {
  private meshData: MeshObjectData;

  constructor(data: MeshObjectData) {
    this.meshData = data;
  }

  private _createTexture(): THREE.Texture {
    const texture = new THREE.TextureLoader().load(this.meshData.material?.value || '');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.meshData.material?.repeatX || 1, this.meshData.material?.repeatY || 1);
    return texture;
  }

  private _createColorMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: this.meshData.material?.value,
      wireframe: true,
    });
  }

  private _createTextureMaterial(): THREE.MeshStandardMaterial {
    const texture = this._createTexture();
    return new THREE.MeshStandardMaterial({
      map: texture,
    });
  }

  private _getMaterial(): THREE.Material | null {
    const material = this.meshData.material;
    if (!material) return null;
    if (material.type === MATERIAL_TYPE.COLOR && material.value) {
      return this._createColorMaterial();
    }
    if (material.type === MATERIAL_TYPE.TEXTURE && material.value) {
      return this._createTextureMaterial();
    }
    return null;
  }

  private _createBoxGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(this.meshData.dimensions.width, this.meshData.dimensions.height, this.meshData.dimensions.depth);
  }

  private _getGeometry() {
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        return this._createBoxGeometry();
    }
  }

  private _setPosition(mesh: THREE.Mesh) {
    mesh.position.set(this.meshData.position.x, this.meshData.position.y, this.meshData.position.z);
  }

  private _setUserData(mesh: THREE.Mesh) {
    mesh.userData.objectId = this.meshData.id;
  }

  private _createInvisibleBox(mesh: THREE.Mesh) {
    const invisibleBoxes = generateCompartmentsFromMesh(mesh);
    invisibleBoxes.forEach((box) => {
      mesh.add(box);
    });
  }

  public createMesh(): THREE.Mesh {
    const geometry = this._getGeometry();
    const material = this._getMaterial();

    const mesh = new THREE.Mesh(
      geometry,
      material ?? new THREE.MeshBasicMaterial({ visible: false })
    );

    this._setPosition(mesh);
    this._setUserData(mesh);
    return mesh;
  }
}

export class DesignBuilder {
  private scene: THREE.Scene | null;
  private data: MeshObjectData[];

  constructor(data: MeshObjectData[], scene?: THREE.Scene) {
    this.data = data;
    this.scene = scene || null;
  }

  private _createRootContainer(): THREE.Mesh {
    return new THREE.Mesh();
  }

  private _findParent(meshesMap: Map<string, THREE.Mesh>, parentId?: string): THREE.Mesh | null {
    if (!parentId) return null;
    return meshesMap.get(parentId) || null;
  }

  private _setUserData(mesh: THREE.Mesh, userData: userData) {
    mesh.userData = userData;
  }

  /**
   * Builds all mesh objects, arranges them by parent relationship,
   * and returns one blank mesh containing them.
   */
  public createDesign(): THREE.Mesh {
    const initialMesh = this._createRootContainer();

    const meshList: THREE.Mesh[] = [];
    const meshMap = new Map<string, THREE.Mesh>();

    this.data.forEach((meshData) => {
      const builder = new MeshBuilder(meshData);
      const mesh = builder.createMesh();

      this._setUserData(mesh, { objectId: meshData.id });
      meshList.push(mesh);
      meshMap.set(meshData.id, mesh);
    });

    meshList.forEach((mesh, index) => {
      const meshData = this.data[index];
      const parent = this._findParent(meshMap, meshData.parent);

      if (parent) {
        parent.add(mesh);
      } else {
        initialMesh.add(mesh);
      }
    });

    this._createInitialCompartments(initialMesh);
    this._setUserData(initialMesh, { objectId: uuidv4() });

    return initialMesh;
  }

  private _createInitialCompartments(mesh: THREE.Mesh) {
    const compartments = generateCompartmentsFromMesh(mesh);
    compartments.forEach((box) => mesh.add(box));
  }
}
