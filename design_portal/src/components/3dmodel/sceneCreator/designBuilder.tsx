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
    const texture = new THREE.TextureLoader().load(this.meshData.material?.value || '');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.meshData.material?.repeatX || 1, this.meshData.material?.repeatY || 1);
    return texture;
  }

  /*  create color material */
  private _createColorMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: this.meshData.material?.value,
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
  private _getMaterial(): THREE.Material | null {
    const mat = this.meshData.material;
    if (!mat) return null;
    if (mat.type === MATERIAL_TYPE.COLOR) {
      return this._createColorMaterial();
    }
    if (mat.type === MATERIAL_TYPE.TEXTURE && mat.value) {
      return this._createTextureMaterial();
    }
    return null;
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

    const mesh = new THREE.Mesh(
      geometry,
      material ?? new THREE.MeshBasicMaterial({ visible: false })
    );

    this._setPosition(mesh);
    this._setUserData(mesh);
    return mesh;
  }
}

export class DesignsBuilder {
  private scene: THREE.Scene | null;
  private data: InitialDataForCreateMesh[];

  constructor(data: InitialDataForCreateMesh[], scene?: THREE.Scene) {
    this.data = data;
    this.scene = scene || null;
  }

  // create blank mesh
  private _createRootContainer(): THREE.Mesh {
    return new THREE.Mesh();
  }

  // correctly find parent mesh by id
  private _findParent(meshesMap: Map<string, THREE.Mesh>, parentId?: string): THREE.Mesh | null {
    if (!parentId) return null;
    return meshesMap.get(parentId) || null;
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
      const builder = new DesignBuilder(meshData);
      const mesh = builder.createMesh();

      mesh.userData.objectId = meshData.id;
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
    initialMesh.userData.objectId = uuidv4();

    return initialMesh;
  }

  private _createInitialCompartments(mesh: THREE.Mesh) {
    const compartments = generateCompartmentsFromMesh(mesh);
    compartments.forEach((box) => mesh.add(box));
  }
}

