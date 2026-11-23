import * as THREE from 'three';
import { store } from '../../store';
import { updateObject } from '../../store/dataSlice';
import {
  DRAWER_PLANK_TYPES,
  EdgeBandingState,
  EDGES,
  Material,
  MATERIAL_TYPES,
  PART_TYPES,
} from '../interface';

/**
 * Simplified BandingTool class for managing edge banding state on planks.
 * This class no longer modifies THREE.js meshes or their dimensions.
 * It strictly tracks and updates `mesh.userData.edgeBanding`.
 */
export class BandingTool {
  private threshold: number = 0.5;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_scene?: THREE.Scene) {}

  public isPlank(mesh: THREE.Mesh): boolean {
    const type = mesh.userData.type;
    if (type === PART_TYPES.HANDLE || type === PART_TYPES.L_SHAPE_OBJECT) {
      return false;
    }
    return (
      type === PART_TYPES.PLANK ||
      type === PART_TYPES.VERTICAL_PLANK ||
      type === PART_TYPES.HORIZONTAL_PLANK ||
      type === PART_TYPES.BACK_PLANK ||
      type === PART_TYPES.DOOR ||
      type === PART_TYPES.DOUBLE_DOOR ||
      type === PART_TYPES.DRAWER ||
      Object.values(PART_TYPES).includes(type) ||
      Object.values(DRAWER_PLANK_TYPES).includes(type)
    );
  }

  public getValidBandingEdges(mesh: THREE.Mesh): Set<string> {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return new Set(Object.values(EDGES));
    }
    const { width, height, depth } = mesh.geometry.parameters;
    const dimensions = [
      { value: width, axis: 'x', disabledEdges: [EDGES.LEFT, EDGES.RIGHT] },
      { value: height, axis: 'y', disabledEdges: [EDGES.TOP, EDGES.BOTTOM] },
      { value: depth, axis: 'z', disabledEdges: [EDGES.FRONT, EDGES.BACK] },
    ].sort((a, b) => a.value - b.value);

    const disabledEdges = dimensions[0].disabledEdges;
    const validEdges = new Set(Object.values(EDGES));
    disabledEdges.forEach((edge) => validEdges.delete(edge));
    return validEdges;
  }

  private checkAxisOverlap(
    siblingMin: number,
    siblingMax: number,
    currentMin: number,
    currentMax: number
  ): boolean {
    return siblingMin < currentMax - this.threshold && siblingMax > currentMin + this.threshold;
  }

  private checkEdgeTouching(
    siblingMin: THREE.Vector3,
    siblingMax: THREE.Vector3,
    currentMin: THREE.Vector3,
    currentMax: THREE.Vector3,
    touchAxis: 'x' | 'y' | 'z',
    useSiblingMin: boolean,
    useCurrentMax: boolean,
    comparison: 'lessEqual' | 'greaterEqual'
  ): boolean {
    const siblingVal = useSiblingMin ? siblingMin[touchAxis] : siblingMax[touchAxis];
    const currentVal = useCurrentMax ? currentMax[touchAxis] : currentMin[touchAxis];

    const distance = Math.abs(siblingVal - currentVal);
    if (distance >= this.threshold) return false;
    return comparison === 'lessEqual' ? siblingVal <= currentVal : siblingVal >= currentVal;
  }

  public isEdgeCovered(mesh: THREE.Mesh, edge: string, parentMesh?: THREE.Mesh | null): boolean {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return false;

    const targetParent = parentMesh || this.findParentMesh(mesh);
    if (!targetParent) return false;

    mesh.updateMatrixWorld(true);
    const currentBox = new THREE.Box3().setFromObject(mesh);
    const currentMin = currentBox.min;
    const currentMax = currentBox.max;

    const siblings: THREE.Mesh[] = [];
    targetParent.traverse((child) => {
      if (child !== mesh && child instanceof THREE.Mesh && this.isPlank(child)) {
        siblings.push(child);
      }
    });

    const edgeConfig: Record<string, any> = {
      [EDGES.TOP]: {
        overlapAxes: ['x', 'z'],
        touchAxis: 'y',
        useSiblingMin: true,
        useCurrentMax: true,
        comparison: 'lessEqual',
      },
      [EDGES.BOTTOM]: {
        overlapAxes: ['x', 'z'],
        touchAxis: 'y',
        useSiblingMin: false,
        useCurrentMax: false,
        comparison: 'greaterEqual',
      },
      [EDGES.LEFT]: {
        overlapAxes: ['y', 'z'],
        touchAxis: 'x',
        useSiblingMin: false,
        useCurrentMax: false,
        comparison: 'lessEqual',
      },
      [EDGES.RIGHT]: {
        overlapAxes: ['y', 'z'],
        touchAxis: 'x',
        useSiblingMin: true,
        useCurrentMax: true,
        comparison: 'greaterEqual',
      },
      [EDGES.FRONT]: {
        overlapAxes: ['x', 'y'],
        touchAxis: 'z',
        useSiblingMin: true,
        useCurrentMax: true,
        comparison: 'lessEqual',
      },
      [EDGES.BACK]: {
        overlapAxes: ['x', 'y'],
        touchAxis: 'z',
        useSiblingMin: false,
        useCurrentMax: false,
        comparison: 'greaterEqual',
      },
    };

    const config = edgeConfig[edge];
    if (!config) return false;

    for (const sibling of siblings) {
      if (!(sibling.geometry instanceof THREE.BoxGeometry)) continue;
      sibling.updateMatrixWorld(true);
      const siblingBox = new THREE.Box3().setFromObject(sibling);
      if (!currentBox.intersectsBox(siblingBox)) continue;

      const siblingMin = siblingBox.min;
      const siblingMax = siblingBox.max;

      const overlaps = config.overlapAxes.map((axis: 'x' | 'y' | 'z') =>
        this.checkAxisOverlap(
          siblingMin[axis],
          siblingMax[axis],
          currentMin[axis],
          currentMax[axis]
        )
      );
      const edgeOverlap = overlaps.every((overlap: boolean) => overlap);

      const edgeTouching = this.checkEdgeTouching(
        siblingMin,
        siblingMax,
        currentMin,
        currentMax,
        config.touchAxis,
        config.useSiblingMin,
        config.useCurrentMax,
        config.comparison
      );

      if (edgeOverlap && edgeTouching) return true;
    }
    return false;
  }

  private findParentMesh(mesh: THREE.Mesh): THREE.Mesh | null {
    let current: THREE.Object3D | null = mesh.parent;
    while (current && current instanceof THREE.Mesh) {
      if (
        current.userData.isMain &&
        !this.isPlank(current) &&
        current.userData.type !== PART_TYPES.DRAWER &&
        current.userData.type !== PART_TYPES.DOOR
      ) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  public getBandingMaterial(
    mesh: THREE.Mesh,
    objectData?: { material?: Material | Material[]; parent?: string },
    objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Material | null {
    if (objectData?.material) {
      const materialArray = Array.isArray(objectData.material)
        ? objectData.material
        : [objectData.material];
      const bandingMaterial = materialArray.find(
        (mat: any) => mat?.type === MATERIAL_TYPES.BANDING
      );
      if (bandingMaterial) return bandingMaterial;
    }

    if (objectData?.parent && objectsData) {
      const parentObject = objectsData.find((obj) => obj.id === objectData.parent);
      if (parentObject?.material) {
        const parentMaterialArray = Array.isArray(parentObject.material)
          ? parentObject.material
          : [parentObject.material];
        const parentBandingMaterial = parentMaterialArray.find(
          (mat: any) => mat?.type === MATERIAL_TYPES.BANDING
        );
        if (parentBandingMaterial) return parentBandingMaterial;
      }
    }
    return null;
  }

  private getPlankOrientation(mesh: THREE.Mesh) {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return { isVertical: false, isHorizontal: false, isBack: false };
    }
    const { width, height, depth } = mesh.geometry.parameters;
    const dimensions = [
      { value: width, axis: 'x' },
      { value: height, axis: 'y' },
      { value: depth, axis: 'z' },
    ].sort((a, b) => a.value - b.value);

    const thicknessAxis = dimensions[0].axis;
    let isVertical = false,
      isHorizontal = false,
      isBack = false;

    if (thicknessAxis === 'x') isVertical = true;
    else if (thicknessAxis === 'y') isHorizontal = true;
    else if (thicknessAxis === 'z') isBack = true;
    else isVertical = true;

    return { isVertical, isHorizontal, isBack };
  }

  public removeAllBanding(mesh: THREE.Mesh, objectId?: string): void {
    mesh.userData.edgeBanding = {};
    if (objectId) {
      store.dispatch(updateObject({ id: objectId, edgeBanding: {} }));
    }
  }

  public removeBandingOnEdge(
    mesh: THREE.Mesh,
    edge: string,
    bandingThickness?: number,
    objectId?: string
  ): void {
    if (!mesh.userData.edgeBanding) mesh.userData.edgeBanding = {};
    mesh.userData.edgeBanding[edge] = false;

    if (objectId) {
      store.dispatch(updateObject({ id: objectId, edgeBanding: mesh.userData.edgeBanding }));
    }
  }

  public async updateBanding(
    mesh: THREE.Mesh,
    newDimensions: { width: number; height: number; depth: number },
    bandingMaterialData?: Material,
    bandingState?: EdgeBandingState,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string },
    options?: { isDimensionUpdate?: boolean }
  ): Promise<void> {
    const isDimensionUpdate = options?.isDimensionUpdate === true;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(
      newDimensions.width,
      newDimensions.height,
      newDimensions.depth
    );

    if (!isDimensionUpdate) {
      let materialData = bandingMaterialData;
      if (!materialData && objectData) {
        materialData = this.getBandingMaterial(mesh, objectData) ?? undefined;
      }
      if (materialData) {
        await this.createBandingOnPlank(mesh, materialData, bandingState, parentMesh, objectData);
      }
    }
  }

  public async applyBandingFromState(
    mesh: THREE.Mesh,
    bandingState: EdgeBandingState,
    _bandingMaterialData?: Material,
    _parentMesh?: THREE.Mesh | null,
    _objectData?: { material?: Material | Material[]; id?: string },
    _objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Promise<void> {
    void _bandingMaterialData;
    void _parentMesh;
    void _objectData;
    void _objectsData;
    if (!this.isPlank(mesh)) return;
    mesh.userData.edgeBanding = { ...bandingState };
  }

  public async toggleBandingOnEdge(
    mesh: THREE.Mesh,
    edge: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
    currentState: EdgeBandingState,
    _bandingMaterialData?: Material,
    _parentMesh?: THREE.Mesh | null,
    _objectData?: { material?: Material | Material[]; id?: string },
    _objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Promise<EdgeBandingState> {
    void _bandingMaterialData;
    void _parentMesh;
    void _objectData;
    void _objectsData;
    const newState: EdgeBandingState = {
      ...currentState,
      [edge]: !currentState[edge],
    };
    mesh.userData.edgeBanding = newState;
    return newState;
  }

  public detectBandingState(mesh: THREE.Mesh): EdgeBandingState {
    return (
      (mesh.userData.edgeBanding as EdgeBandingState) || {
        top: false,
        bottom: false,
        left: false,
        right: false,
        front: false,
        back: false,
      }
    );
  }

  public canHaveBanding(mesh: THREE.Mesh, edge: string, parentMesh?: THREE.Mesh | null): boolean {
    const validEdges = this.getValidBandingEdges(mesh);
    if (!validEdges.has(edge)) return false;
    if (this.isEdgeCovered(mesh, edge, parentMesh)) return false;
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getBandingMeshes(_mesh: THREE.Mesh): THREE.Mesh[] {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getBandingMeshForEdge(_mesh: THREE.Mesh, _edge: string): THREE.Mesh | null {
    return null;
  }

  public async createBandingOnPlank(
    mesh: THREE.Mesh,
    _bandingMaterialData: Material,
    bandingState?: EdgeBandingState,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string }
  ): Promise<void> {
    if (!this.isPlank(mesh)) return;

    let effectiveBandingState: EdgeBandingState;
    if (bandingState) {
      effectiveBandingState = bandingState;
    } else {
      const orientation = this.getPlankOrientation(mesh);
      const shouldCreateBanding = (edge: string): boolean => {
        return !this.isEdgeCovered(mesh, edge, parentMesh);
      };

      effectiveBandingState = {
        top: false,
        bottom: false,
        left: false,
        right: false,
        front: false,
        back: false,
      };

      if (orientation.isVertical) {
        effectiveBandingState.top = shouldCreateBanding(EDGES.TOP);
        effectiveBandingState.bottom = shouldCreateBanding(EDGES.BOTTOM);
        effectiveBandingState.front = shouldCreateBanding(EDGES.FRONT);
        effectiveBandingState.back = false;
      } else if (orientation.isHorizontal) {
        effectiveBandingState.left = shouldCreateBanding(EDGES.LEFT);
        effectiveBandingState.right = shouldCreateBanding(EDGES.RIGHT);
        effectiveBandingState.front = shouldCreateBanding(EDGES.FRONT);
        effectiveBandingState.back = false;
      } else if (orientation.isBack) {
        effectiveBandingState.top = shouldCreateBanding(EDGES.TOP);
        effectiveBandingState.bottom = shouldCreateBanding(EDGES.BOTTOM);
        effectiveBandingState.left = shouldCreateBanding(EDGES.LEFT);
        effectiveBandingState.right = shouldCreateBanding(EDGES.RIGHT);
      }
    }

    mesh.userData.edgeBanding = effectiveBandingState;
    if (objectData?.id) {
      try {
        store.dispatch(updateObject({ id: objectData.id, edgeBanding: effectiveBandingState }));
      } catch (error) {
        console.warn('Failed to update Redux state for plank dimensions:', error);
      }
    }
  }
}
