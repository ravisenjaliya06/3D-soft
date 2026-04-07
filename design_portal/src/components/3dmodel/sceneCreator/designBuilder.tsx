import * as THREE from 'three';
import { hydrateNailers, hydrateSkirting } from '../design/scene';
import { generateCompartmentsFromMesh, updateMinifixesForCupboard } from '../handler/items';
import { store } from '../store';
import {
  DRAWER_PLANK_TYPES,
  Material,
  MATERIAL_TYPES,
  MeshObjectData,
  PART_TYPES,
} from './interface';
import { MeshBuilder } from './meshBuilder';

export class DesignBuilder {
  private scene: THREE.Scene | null;
  private data: MeshObjectData[];
  private meshMap: Map<string, THREE.Mesh>;
  private builderMap: Map<string, MeshBuilder>;
  private dataMap: Map<string, MeshObjectData>;

  constructor(data: MeshObjectData[], scene?: THREE.Scene) {
    this.data = this._sortDataHierarchically(data);
    this.scene = scene || store.getState().scene?.scene;
    this.meshMap = new Map<string, THREE.Mesh>();
    this.builderMap = new Map<string, MeshBuilder>();
    this.dataMap = new Map(this.data.map((item) => [item.id, item]));
  }

  private _sortDataHierarchically(data: MeshObjectData[]): MeshObjectData[] {
    const sorted: MeshObjectData[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const localDataMap = new Map(data.map((item) => [item.id, item]));

    const visit = (item: MeshObjectData) => {
      if (visited.has(item.id)) return;
      if (visiting.has(item.id)) return;

      visiting.add(item.id);

      if (item.parent && localDataMap.has(item.parent)) {
        visit(localDataMap.get(item.parent)!);
      }

      visiting.delete(item.id);
      visited.add(item.id);
      sorted.push(item);
    };

    data.forEach(visit);
    return sorted;
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
   * Includes drawer planks but excludes drawer groups, doors, handles, and other non-plank types
   */
  private async _applyParentBandingToPlanks(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.data.forEach((meshData) => {
      const name = meshData.name || '';

      // Check if this is a drawer plank by name (drawer planks should have banding)
      const isDrawerPlank = Object.values(DRAWER_PLANK_TYPES).some(
        (drawerPlankType) => name === drawerPlankType || name.includes(drawerPlankType)
      );

      if (isDrawerPlank) {
        // This is a drawer plank - apply banding
        const builder = this.builderMap.get(meshData.id);
        if (!builder) return;

        if (meshData.edgeBanding) {
          promises.push(builder.applyBandingFromState());
        } else if (meshData.parent) {
          const parentData = this.dataMap.get(meshData.parent);
          if (!parentData) return;

          const parentBandingMaterial = this._findBandingMaterial(parentData.material);
          if (parentBandingMaterial) {
            promises.push(builder.applyParentBandingMaterial(parentBandingMaterial));
          }
        }
        return;
      }

      // Explicitly exclude drawer groups, doors, and handles
      if (
        meshData.type === PART_TYPES.DRAWER ||
        meshData.type === PART_TYPES.DOOR ||
        meshData.type === PART_TYPES.HANDLE ||
        meshData.type === PART_TYPES.L_SHAPE_OBJECT
      ) {
        return;
      }

      // Include all plank types (including any future plank types)
      const isPlank =
        meshData.type === PART_TYPES.PLANK ||
        meshData.type === PART_TYPES.VERTICAL_PLANK ||
        meshData.type === PART_TYPES.HORIZONTAL_PLANK ||
        meshData.type === PART_TYPES.BACK_PLANK ||
        Object.values(PART_TYPES).includes(meshData.type);

      if (!isPlank) return;

      const builder = this.builderMap.get(meshData.id);
      if (!builder) return;

      // If plank has its own banding state, use it
      if (meshData.edgeBanding) {
        promises.push(builder.applyBandingFromState());
      } else if (meshData.parent) {
        // Otherwise, check parent for banding material
        const parentData = this.dataMap.get(meshData.parent);
        if (!parentData) return;

        const parentBandingMaterial = this._findBandingMaterial(parentData.material);
        if (parentBandingMaterial) {
          promises.push(builder.applyParentBandingMaterial(parentBandingMaterial));
        }
      }
    });
    await Promise.all(promises);
  }

  /**
   * Builds all mesh objects, arranges them by parent relationship,
   * and returns one blank mesh containing them.
   */
  public async createDesign(): Promise<THREE.Object3D> {
    const meshList: THREE.Mesh[] = [];

    this.data.forEach((meshData) => {
      const builder = new MeshBuilder(meshData, this.scene || undefined);
      const mesh = builder.createMesh();
      meshList.push(mesh);
      this.meshMap.set(meshData.id, mesh);
      this.builderMap.set(meshData.id, builder);
    });

    const rootMeshes: THREE.Object3D[] = [];
    meshList.forEach((mesh, index) => {
      const meshData = this.data[index];

      if (meshData.parent && this.meshMap.has(meshData.parent)) {
        const parentMesh = this.meshMap.get(meshData.parent);

        if (parentMesh) {
          parentMesh.add(mesh);
          const builder = this.builderMap.get(meshData.id);
          if (builder) {
            builder.setParentMesh(parentMesh);
          }
        }
      } else {
        rootMeshes.push(mesh);
      }
    });

    this.data.forEach((meshData) => {
      if (
        meshData.type === PART_TYPES.BACK_PLANK ||
        (meshData.name && meshData.name.includes('BACK_PLANK'))
      ) {
        const builder = this.builderMap.get(meshData.id);
        const mesh = this.meshMap.get(meshData.id);
        if (builder && mesh) {
          builder.updateGrooving(mesh);
        }
      }
    });

    // Wait for all geometry and banding to finish building
    await Promise.all(
      Array.from(this.builderMap.values())
        .map((b) => b.geometryPromise)
        .filter(Boolean)
    );

    // Apply parent's banding material to child planks (async - waits for color extraction)
    await this._applyParentBandingToPlanks();

    const nailerPromises: Promise<void>[] = [];
    this.data.forEach((meshData) => {
      const mesh = this.meshMap.get(meshData.id);
      if (mesh && meshData.nailerEnabled) {
        nailerPromises.push(hydrateNailers(mesh, meshData.nailerModel));
      }
      if (mesh && meshData.skirtingEnabled) {
        hydrateSkirting(mesh);
      }
    });

    if (nailerPromises.length > 0) {
      await Promise.all(nailerPromises);
    }

    let finalRoot: THREE.Object3D;
    if (rootMeshes.length === 1) {
      finalRoot = rootMeshes[0];
    } else {
      finalRoot = new THREE.Group();
      finalRoot.name = 'batch_group';
      rootMeshes.forEach((m) => finalRoot.add(m));
    }

    if (finalRoot instanceof THREE.Mesh && finalRoot.userData.isMain) {
      this._createInitialCompartments(finalRoot);
      updateMinifixesForCupboard(finalRoot);
    }
    finalRoot.updateMatrixWorld(true);
    return finalRoot;
  }
}
