import * as THREE from 'three';
import { generateCompartmentsFromMesh } from '../handler/items';
import { MeshObjectData } from './interface';
import { MeshBuilder } from './meshBuilder';

export class DesignBuilder {
  private scene: THREE.Scene | null;
  private data: MeshObjectData[];
  private meshMap: Map<string, THREE.Mesh>;

  constructor(data: MeshObjectData[], scene?: THREE.Scene) {
    this.data = data;
    this.scene = scene || null;
    this.meshMap = new Map<string, THREE.Mesh>();
  }

  private _createInitialCompartments(mesh: THREE.Mesh) {
    generateCompartmentsFromMesh(mesh);
  }

  /**
   * Builds all mesh objects, arranges them by parent relationship,
   * and returns one blank mesh containing them.
   */
  public createDesign(): THREE.Mesh {
    const meshList: THREE.Mesh[] = [];

    this.data.forEach((meshData) => {
      const builder = new MeshBuilder(meshData);
      const mesh = builder.createMesh();
      meshList.push(mesh);
      this.meshMap.set(meshData.id, mesh);
    });

    let rootMesh: THREE.Mesh | null = null;

    meshList.forEach((mesh, index) => {
      const meshData = this.data[index];

      if (meshData.parent) {
        const parentMesh = this.meshMap.get(meshData.parent);

        if (parentMesh) {
          parentMesh.add(mesh);
        }
      } else {
        rootMesh = mesh;
      }
    });

    if (!rootMesh) {
      throw new Error('Root mesh not found. Your data must contain one item with no parent.');
    }

    this._createInitialCompartments(rootMesh);
    return rootMesh;
  }
}
