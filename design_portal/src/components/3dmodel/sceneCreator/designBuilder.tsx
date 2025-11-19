import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { generateCompartmentsFromMesh } from '../handler/items';
import { GEOMETRY, InitialDataForCreateMesh, MATERIAL_TYPE, userData } from './interface';

export class DesignBuilder {
  private meshData: InitialDataForCreateMesh;

  constructor(data: InitialDataForCreateMesh) {
    this.meshData = data;
  }

  /* create mesh texture loader */
  private _createTexture(): THREE.Texture {
    const texture = new THREE.TextureLoader().load(this.meshData.material.value);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.meshData.material?.repeatX || 1, this.meshData.material?.repeatY || 1);
    return texture;
  }

  /*  create color material */
  private _createColorMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: this.meshData.material.value,
      wireframe: true,
    });
  }

  /* create mesh material */
  private _createTextureMaterial(): THREE.MeshStandardMaterial {
    const texture = this._createTexture();
    return new THREE.MeshStandardMaterial({
      map: texture,
    });
  }

  /* fetch mesh material type from data */
  private _getMaterial() {
    switch (this.meshData.material.type) {
      case MATERIAL_TYPE.COLOR:
        return this._createColorMaterial();
      case MATERIAL_TYPE.TEXTURE:
        return this._createTextureMaterial();
    }
  }

  /*  create box geometry for mesh */
  private _createBoxGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(this.meshData.width, this.meshData.height, this.meshData.depth);
  }

  /* fetch geometry type from data */
  private _getGeometry() {
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        return this._createBoxGeometry();
    }
  }

  /* set position of mesh */
  private _setPosition(mesh: THREE.Mesh) {
    mesh.position.set(this.meshData.position.x, this.meshData.position.y, this.meshData.position.z);
  }

  private _setUserData(mesh: THREE.Mesh) {
    mesh.userData.objectId = this.meshData.id;
  }

  /* generate invisible box using mesh object */
  private _createInvisibleBox(mesh: THREE.Mesh) {
    const invisibleBoxes = generateCompartmentsFromMesh(mesh);
    invisibleBoxes.forEach((box) => {
      mesh.add(box);
    });
  }

  /* create mesh object*/
  public createMesh(): THREE.Mesh {
    const geometry = this._getGeometry();
    const material = this._getMaterial();

    const mesh = new THREE.Mesh(geometry, material);

    // set position of mesh
    this._setPosition(mesh);
    this._setUserData(mesh);

    mesh.name = this.meshData.name;
    return mesh;
  }
}

export class DesignsBuilder {
  private data: InitialDataForCreateMesh[];

  constructor(data: InitialDataForCreateMesh[]) {
    this.data = data;
  }

  /* create blank mesh */
  private _createMesh(): THREE.Mesh {
    const mesh = new THREE.Mesh();
    return mesh;
  }

  private _createInitialCompartments(mesh: THREE.Mesh) {
    const compartments = generateCompartmentsFromMesh(mesh);
    compartments.forEach((box) => {
      mesh.add(box);
    });
  }

  private _setUserData(mesh: THREE.Mesh, data: userData) {
    mesh.userData = data;
  }

  /* create mesh and add in main mesh */
  public createDesign(): THREE.Mesh {
    const mesh = this._createMesh();

    this.data.forEach((meshData) => {
      if (!meshData.parent) {
      }
      const designBuilder = new DesignBuilder(meshData);
      const meshObject = designBuilder.createMesh();
      mesh.add(meshObject);
    });

    this._setUserData(mesh, { objectId: uuidv4() });
    this._createInitialCompartments(mesh);

    return mesh;
  }
}
