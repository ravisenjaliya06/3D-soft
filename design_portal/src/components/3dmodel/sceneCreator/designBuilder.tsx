import * as THREE from 'three';
import { generateCompartmentsFromMesh } from '../handler/items';
import { store } from '../store';
import { Material, MATERIAL_TYPES, PART_TYPES, MeshObjectData } from './interface';
import { MeshBuilder } from './meshBuilder';

export class DesignBuilder {
  private scene: THREE.Scene | null;
  private data: MeshObjectData[];
  private meshMap: Map<string, THREE.Mesh>;
  private builderMap: Map<string, MeshBuilder>;

  constructor(data: MeshObjectData[], scene?: THREE.Scene) {
    this.data = data;
    this.scene = scene || store.getState().scene?.scene;
    this.meshMap = new Map<string, THREE.Mesh>();
    this.builderMap = new Map<string, MeshBuilder>();
  }

  private _createInitialCompartments(mesh: THREE.Mesh) {
    generateCompartmentsFromMesh(mesh);
  }

  /**
   * Find banding material in the given material array
   */
  private _findBandingMaterial(materials?: MeshObjectData['material']): Material | null {
    if (!materials) return null;
    const materialArray = Array.isArray(materials) ? materials : [materials];
    return materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING) || null;
  }

  /**
   * Apply parent's banding material to all child planks
   */
  private async _applyParentBandingToPlanks(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.data.forEach((meshData) => {
      const isPlank = Object.values(PART_TYPES).includes(meshData.type);

      if (!isPlank || !meshData.parent) return;

      const parentData = this.data.find((d) => d.id === meshData.parent);
      if (!parentData) return;

      const parentBandingMaterial = this._findBandingMaterial(parentData.material);
      if (!parentBandingMaterial) return;

      const builder = this.builderMap.get(meshData.id);
      if (builder) {
        promises.push(builder.applyParentBandingMaterial(parentBandingMaterial));
      }
    });
    await Promise.all(promises);
  }

  /**
   * Builds all mesh objects, arranges them by parent relationship,
   * and returns one blank mesh containing them.
   */
  public async createDesign(): Promise<THREE.Mesh> {
    const meshList: THREE.Mesh[] = [];

    this.data.forEach((meshData) => {
      const builder = new MeshBuilder(meshData);
      const mesh = builder.createMesh();
      meshList.push(mesh);
      this.meshMap.set(meshData.id, mesh);
      this.builderMap.set(meshData.id, builder);
    });

    let rootMesh: THREE.Mesh | null = null;
    meshList.forEach((mesh, index) => {
      const meshData = this.data[index];

      if (meshData.parent) {
        const parentMesh = this.meshMap.get(meshData.parent);

        if (parentMesh) {
          parentMesh.add(mesh);
          const builder = this.builderMap.get(meshData.id);
          if (builder) {
            builder.setParentMesh(parentMesh);
          }
        }
      } else {
        rootMesh = mesh;
      }
    });

    // Apply parent's banding material to child planks (async - waits for color extraction)
    await this._applyParentBandingToPlanks();

    if (!rootMesh) {
      throw new Error('Root mesh not found. Your data must contain one item with no parent.');
    }

    this._createInitialCompartments(rootMesh);
    return rootMesh;
  }
}
