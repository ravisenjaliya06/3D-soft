import * as THREE from 'three';
import { GEOMETRY, InitialDataForCreateMesh, MATERIAL_TYPE } from './interface';
import { generateCompartmentsFromMesh } from '../handler/items';

export class DesignBuilder {
  private meshData: InitialDataForCreateMesh;

  constructor(data: InitialDataForCreateMesh) {
    this.meshData = data;
  }

  /* create mesh texture loader */
  public createTexture(): THREE.Texture {
    const texture = new THREE.TextureLoader().load(this.meshData.material.value);
    texture.repeat.set(this.meshData.material?.repeatX || 1, this.meshData.material?.repeatY || 1);
    return texture;
  }

  /*  create color material */
  public createColorMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: this.meshData.material.value,
      wireframe: true,
    });
  }

  /* create mesh material */
  public createTextureMaterial(): THREE.MeshStandardMaterial {
    const texture = this.createTexture();
    return new THREE.MeshStandardMaterial({
      map: texture,
    });
  }

  /* fetch mesh material type from data */
  public getMaterial() {
    switch (this.meshData.material.type) {
      case MATERIAL_TYPE.COLOR:
        return this.createColorMaterial();
      case MATERIAL_TYPE.TEXTURE:
        return this.createTextureMaterial();
    }
  }

  /*  create box geometry for mesh */
  public createBoxGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(this.meshData.width, this.meshData.height, this.meshData.depth);
  }

  /* fetch geometry type from data */
  public getGeometry() {
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        return this.createBoxGeometry();
    }
  }

  /* set position of mesh */
  public setPosition(mesh: THREE.Mesh) {
    mesh.position.set(this.meshData.position.x, this.meshData.position.y, this.meshData.position.z);
  }

  /* generate invisible box using mesh object */
  public createInvisibleBox(mesh: THREE.Mesh) {
    const invisibleBoxes = generateCompartmentsFromMesh(mesh);
    invisibleBoxes.forEach((box) => {
      mesh.add(box);
    })
  }

  /* create mesh object*/
  public createMesh(): THREE.Mesh {
    const geometry = this.getGeometry();
    const material = this.getMaterial();

    const mesh = new THREE.Mesh(geometry, material);

    // set position of mesh
    this.setPosition(mesh);
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
  public createMesh(): THREE.Mesh {
    const mesh = new THREE.Mesh();
    return mesh;
  }

  /* create mesh and add in main mesh */
  public createDesign(): THREE.Mesh {
    const mesh = this.createMesh();

    this.data.forEach((meshData) => {
      const designBuilder = new DesignBuilder(meshData);
      const meshObject = designBuilder.createMesh();
      mesh.add(meshObject);
    });

    return mesh;
  }
}
