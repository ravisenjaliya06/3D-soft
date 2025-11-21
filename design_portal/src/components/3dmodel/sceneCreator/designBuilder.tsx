import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { generateCompartmentsFromMesh } from '../handler/items';
import { MeshObjectData, userData } from './interface';
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

  private _createRootContainer(): THREE.Mesh {
    return new THREE.Mesh();
  }

  private _findParent(parentId?: string): THREE.Mesh | null {
    if (!parentId) return null;
    return this.meshMap.get(parentId) || null;
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

    this.data.forEach((meshData) => {
      const builder = new MeshBuilder(meshData);
      const mesh = builder.createMesh();

      this._setUserData(mesh, { objectId: meshData.id });
      meshList.push(mesh);
      this.meshMap.set(meshData.id, mesh);
    });

    meshList.forEach((mesh, index) => {
      const meshData = this.data[index];
      const parent = this._findParent(meshData.parent);

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
