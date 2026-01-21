import * as THREE from 'three';
import { store } from '../../store';
import { updateObject } from '../../store/dataSlice';
import { DRAWER_PLANK_TYPES, EdgeBandingState, EDGES, Material, MATERIAL_TYPES, PART_TYPES } from '../interface';
import { extractColorFromImage } from '../utils';

/**
 * Comprehensive BandingTool class for managing edge banding on planks
 * Handles creation, update, removal, and validation of banding meshes
 */
export class BandingTool {
  private scene: THREE.Scene;
  private defaultThickness: number = 1.5; // Default banding thickness in mm
  private threshold: number = 0.5; // Threshold for edge detection

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Check if a mesh is a plank that can have banding
   * Excludes drawers, doors, handles, and other non-plank types
   */
  public isPlank(mesh: THREE.Mesh): boolean {
    const type = mesh.userData.type;
    
    // Explicitly exclude drawers, doors, and handles
    if (
      type === PART_TYPES.DRAWER ||
      type === PART_TYPES.DOOR ||
      type === PART_TYPES.HANDLE ||
      type === PART_TYPES.L_SHAPE_OBJECT
    ) {
      return false;
    }
    
    // Include all plank types (including any future plank types)
    return (
      type === PART_TYPES.PLANK ||
      type === PART_TYPES.VERTICAL_PLANK ||
      type === PART_TYPES.HORIZONTAL_PLANK ||
      type === PART_TYPES.BACK_PLANK ||
      Object.values(PART_TYPES).includes(type) ||
      Object.values(DRAWER_PLANK_TYPES).includes(type)
    );
  }

  /**
   * Get valid edges for banding based on plank dimensions
   * The smallest dimension determines which faces are the "thickness" faces (no banding on those)
   */
  public getValidBandingEdges(mesh: THREE.Mesh): Set<string> {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return new Set(Object.values(EDGES));
    }

    const { width, height, depth } = mesh.geometry.parameters;

    // Find the smallest dimension (thickness)
    const dimensions = [
      { value: width, axis: 'x', disabledEdges: [EDGES.LEFT, EDGES.RIGHT] },
      { value: height, axis: 'y', disabledEdges: [EDGES.TOP, EDGES.BOTTOM] },
      { value: depth, axis: 'z', disabledEdges: [EDGES.FRONT, EDGES.BACK] },
    ].sort((a, b) => a.value - b.value);

    // The smallest dimension determines which edges should be disabled
    const disabledEdges = dimensions[0].disabledEdges;
    const validEdges = new Set(Object.values(EDGES));
    disabledEdges.forEach((edge) => validEdges.delete(edge));

    return validEdges;
  }

  /**
   * Check if two boxes overlap on a specific axis
   */
  private checkAxisOverlap(
    siblingMin: number,
    siblingMax: number,
    currentMin: number,
    currentMax: number
  ): boolean {
    return siblingMin < currentMax - this.threshold && siblingMax > currentMin + this.threshold;
  }

  /**
   * Check if an edge is touching another box
   * @param touchAxis - The axis along which to check touching ('x', 'y', or 'z')
   * @param useSiblingMin - true if using siblingMin, false if using siblingMax
   * @param useCurrentMax - true if comparing to currentMax, false if comparing to currentMin
   * @param comparison - 'lessEqual' for <=, 'greaterEqual' for >=
   */
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

  /**
   * Check if an edge of the current plank is covered by another plank
   * Returns true if the edge is touching/covered by another plank
   */
  public isEdgeCovered(mesh: THREE.Mesh, edge: string, parentMesh?: THREE.Mesh | null): boolean {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return false;

    const targetParent = parentMesh || this.findParentMesh(mesh);
    if (!targetParent) return false;

    // Get current plank's bounding box in world space
    mesh.updateMatrixWorld(true);
    const currentBox = new THREE.Box3().setFromObject(mesh);
    const currentMin = currentBox.min;
    const currentMax = currentBox.max;

    // Get all sibling planks
    const siblings: THREE.Mesh[] = [];
    targetParent.traverse((child) => {
      if (child !== mesh && child instanceof THREE.Mesh && this.isPlank(child)) {
        siblings.push(child);
      }
    });

    // Edge configuration: maps each edge to its overlap axes and touch parameters
    const edgeConfig: Record<
      string,
      {
        overlapAxes: Array<'x' | 'y' | 'z'>;
        touchAxis: 'x' | 'y' | 'z';
        useSiblingMin: boolean;
        useCurrentMax: boolean;
        comparison: 'lessEqual' | 'greaterEqual';
      }
    > = {
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

    // Check if any sibling plank covers this edge
    for (const sibling of siblings) {
      if (!(sibling.geometry instanceof THREE.BoxGeometry)) continue;

      sibling.updateMatrixWorld(true);
      const siblingBox = new THREE.Box3().setFromObject(sibling);
      const siblingMin = siblingBox.min;
      const siblingMax = siblingBox.max;

      // Check overlap on both required axes
      const overlaps = config.overlapAxes.map((axis) =>
        this.checkAxisOverlap(
          siblingMin[axis],
          siblingMax[axis],
          currentMin[axis],
          currentMax[axis]
        )
      );
      const edgeOverlap = overlaps.every((overlap) => overlap);

      // Check touching on the touch axis
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

      if (edgeOverlap && edgeTouching) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find the parent mesh (cupboard) of a plank
   */
  private findParentMesh(mesh: THREE.Mesh): THREE.Mesh | null {
    let current: THREE.Object3D | null = mesh.parent;

    while (current && current instanceof THREE.Mesh) {
      // Check if this is a cupboard or main object
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

  /**
   * Get banding material from plank or parent
   */
  public getBandingMaterial(
    mesh: THREE.Mesh,
    objectData?: { material?: Material | Material[]; parent?: string },
    objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Material | null {
    // First check if plank has banding material
    if (objectData?.material) {
      const materialArray = Array.isArray(objectData.material)
        ? objectData.material
        : [objectData.material];

      const bandingMaterial = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);

      if (bandingMaterial) {
        return bandingMaterial;
      }
    }

    // If plank doesn't have banding material, check parent
    if (objectData?.parent && objectsData) {
      const parentObject = objectsData.find((obj) => obj.id === objectData.parent);

      if (parentObject?.material) {
        const parentMaterialArray = Array.isArray(parentObject.material)
          ? parentObject.material
          : [parentObject.material];

        const parentBandingMaterial = parentMaterialArray.find(
          (mat) => mat?.type === MATERIAL_TYPES.BANDING
        );

        if (parentBandingMaterial) {
          return parentBandingMaterial;
        }
      }
    }

    return null;
  }

  /**
   * Get plank texture URL for color extraction
   */
  private getPlankTextureUrl(objectData?: { material?: Material | Material[] }): string | null {
    if (!objectData?.material) return null;

    const materialArray = Array.isArray(objectData.material)
      ? objectData.material
      : [objectData.material];

    // Find Panel Stock material (plank texture)
    for (const materialData of materialArray) {
      if (materialData?.type === MATERIAL_TYPES.PANEL_STOCK) {
        if (materialData.textures && materialData.textures.length > 0) {
          const textureUrl = materialData.textures[0]?.textureDetail?.image;
          if (textureUrl) {
            return `${process.env.NEXT_PUBLIC_PUBLIC_API}${textureUrl}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Darken a color by a factor (0-1, where 0.5 = 50% darker)
   */
  private darkenColor(hexColor: number, factor: number = 0.3): number {
    const r = (hexColor >> 16) & 0xff;
    const g = (hexColor >> 8) & 0xff;
    const b = hexColor & 0xff;

    const newR = Math.max(0, Math.floor(r * (1 - factor)));
    const newG = Math.max(0, Math.floor(g * (1 - factor)));
    const newB = Math.max(0, Math.floor(b * (1 - factor)));

    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Create banding material (extracts color from plank texture and darkens it)
   */
  private async createBandingMaterial(objectData?: {
    material?: Material | Material[];
  }): Promise<THREE.MeshStandardMaterial> {
    const plankTextureUrl = this.getPlankTextureUrl(objectData);

    if (plankTextureUrl) {
      try {
        const extractedColor = await extractColorFromImage(plankTextureUrl);
        // Darken the extracted color for banding (30% darker)
        const darkenedColor = this.darkenColor(extractedColor, 0.3);
        return new THREE.MeshStandardMaterial({
          color: darkenedColor,
          wireframe: false,
        });
      } catch (error) {
        console.warn('Failed to extract color from plank texture, using default:', error);
      }
    }

    return new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Darker default (was 0xffffff)
      wireframe: false,
    });
  }

  /**
   * Determine plank orientation based on dimensions
   */
  private getPlankOrientation(mesh: THREE.Mesh): {
    isVertical: boolean;
    isHorizontal: boolean;
    isBack: boolean;
  } {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return { isVertical: false, isHorizontal: false, isBack: false };
    }

    const { width, height, depth } = mesh.geometry.parameters;

    const dimensions = [
      { value: width, name: 'width', axis: 'x' },
      { value: height, name: 'height', axis: 'y' },
      { value: depth, name: 'depth', axis: 'z' },
    ].sort((a, b) => a.value - b.value);

    const thicknessAxis = dimensions[0].axis;

    let isVerticalPlank = false;
    let isHorizontalPlank = false;
    let isBackPlank = false;

    if (thicknessAxis === 'x') {
      isVerticalPlank = true;
    } else if (thicknessAxis === 'y') {
      isHorizontalPlank = true;
    } else if (thicknessAxis === 'z') {
      isBackPlank = true;
    } else {
      isVerticalPlank = true;
    }

    return {
      isVertical: isVerticalPlank,
      isHorizontal: isHorizontalPlank,
      isBack: isBackPlank,
    };
  }

  /**
   * Create a banding mesh on a specific edge
   */
  private createBandingMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    sideName: string,
    bandingMaterial: THREE.MeshStandardMaterial,
    objectId?: string
  ): THREE.Mesh {
    const banding = new THREE.Mesh(geometry, bandingMaterial);
    banding.position.copy(position);
    banding.name = `Banding_${sideName}_${mesh.name}`;
    banding.userData.type = 'banding';
    banding.userData.edge = edge;
    banding.userData.objectId = objectId
      ? `${objectId}_banding_${sideName.toLowerCase()}`
      : `${mesh.userData.objectId}_banding_${sideName.toLowerCase()}`;
    mesh.add(banding);
    return banding;
  }

  /**
   * Remove and dispose banding meshes from a plank
   * @param mesh - The plank mesh
   * @param filter - Optional filter function to determine which banding children to remove
   */
  private removeBandingMeshes(mesh: THREE.Mesh, filter?: (child: THREE.Object3D) => boolean): void {
    const toRemove: THREE.Object3D[] = [];
    mesh.children.forEach((child) => {
      if (child.userData.type === 'banding') {
        if (!filter || filter(child)) {
          toRemove.push(child);
        }
      }
    });
    toRemove.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      mesh.remove(child);
    });
  }

  /**
   * Remove all banding meshes from a plank and restore original dimensions
   */
  public removeAllBanding(mesh: THREE.Mesh, objectId?: string): void {
    this.removeBandingMeshes(mesh);

    // Restore original dimensions
    if (mesh.userData.originalDimensions) {
      this.restoreOriginalDimensions(mesh, objectId);
    }
  }

  /**
   * Remove banding from a specific edge and restore dimension on that side
   */
  public removeBandingOnEdge(
    mesh: THREE.Mesh,
    edge: string,
    bandingThickness?: number,
    objectId?: string
  ): void {
    this.removeBandingMeshes(mesh, (child) => child.userData.edge === edge);
    if (!bandingThickness || isNaN(bandingThickness)) return;
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const remainingBanding = this.detectBandingState(mesh);

    // Get original dimensions
    const original = this.getOriginalDimensions(mesh);

    // Calculate new dimensions based on remaining banding
    const adjustments = this.calculateDimensionAdjustments(remainingBanding, bandingThickness);

    const newWidth = Math.max(original.width + adjustments.width, 0.1);
    const newHeight = Math.max(original.height + adjustments.height, 0.1);
    const newDepth = Math.max(original.depth + adjustments.depth, 0.1);

    const current = mesh.geometry.parameters;

    // Only update if dimensions actually changed
    if (
      Math.abs(newWidth - current.width) > 0.01 ||
      Math.abs(newHeight - current.height) > 0.01 ||
      Math.abs(newDepth - current.depth) > 0.01
    ) {
      // Update geometry
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(newWidth, newHeight, newDepth);

      // Update Redux state
      if (objectId) {
        try {
          store.dispatch(
            updateObject({
              id: objectId,
              dimensions: {
                width: newWidth,
                height: newHeight,
                depth: newDepth,
              },
            })
          );
        } catch (error) {
          console.warn('Failed to update Redux state for plank dimensions:', error);
        }
      }
    }
  }

  /**
   * Create banding on plank based on edge banding state
   */
  public async createBandingOnPlank(
    mesh: THREE.Mesh,
    bandingMaterialData: Material,
    bandingState?: EdgeBandingState,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string }
  ): Promise<void> {
    if (!this.isPlank(mesh)) return;

    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const bandingThickness = bandingMaterialData.properties?.thickness || this.defaultThickness;

    // Store original dimensions before adjustments
    this.storeOriginalDimensions(mesh);

    // Get original dimensions (before reduction)
    const original = this.getOriginalDimensions(mesh);
    const originalWidth = original.width;
    const originalHeight = original.height;
    const originalDepth = original.depth;

    const orientation = this.getPlankOrientation(mesh);

    // Helper to determine if banding should be created
    const shouldCreateBanding = (edge: string): boolean => {
      if (bandingState) {
        const edgeMap: Record<string, keyof EdgeBandingState> = {
          [EDGES.TOP]: 'top',
          [EDGES.BOTTOM]: 'bottom',
          [EDGES.LEFT]: 'left',
          [EDGES.RIGHT]: 'right',
          [EDGES.FRONT]: 'front',
          [EDGES.BACK]: 'back',
        };
        const stateKey = edgeMap[edge];
        return stateKey ? Boolean(bandingState[stateKey] ?? false) : false;
      }
      // Default behavior: create banding if edge is not covered
      return !this.isEdgeCovered(mesh, edge, parentMesh);
    };

    // Detect which edges will get banding and create banding state for dimension reduction
    let effectiveBandingState: EdgeBandingState;
    if (bandingState) {
      effectiveBandingState = bandingState;
    } else {
      // Build banding state from edges that will get banding
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
        // For vertical planks, back edge is typically covered by cupboard back, so don't add banding initially
        // Only add back banding if explicitly requested via bandingState
        effectiveBandingState.back = false;
      } else if (orientation.isHorizontal) {
        effectiveBandingState.left = shouldCreateBanding(EDGES.LEFT);
        effectiveBandingState.right = shouldCreateBanding(EDGES.RIGHT);
        effectiveBandingState.front = shouldCreateBanding(EDGES.FRONT);
        // For horizontal planks, back edge is typically covered by cupboard back, so don't add banding initially
        // Only add back banding if explicitly requested via bandingState
        effectiveBandingState.back = false;
      } else if (orientation.isBack) {
        effectiveBandingState.top = shouldCreateBanding(EDGES.TOP);
        effectiveBandingState.bottom = shouldCreateBanding(EDGES.BOTTOM);
        effectiveBandingState.left = shouldCreateBanding(EDGES.LEFT);
        effectiveBandingState.right = shouldCreateBanding(EDGES.RIGHT);
      }
    }

    // Create banding material (async - extracts color from plank texture)
    const bandingMaterial = await this.createBandingMaterial(objectData);

    // STEP 1: Create banding meshes on original plank size
    const bandingMeshes: Array<{ mesh: THREE.Mesh; edge: string }> = [];

    if (orientation.isVertical) {
      if (shouldCreateBanding(EDGES.TOP)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.TOP,
          new THREE.BoxGeometry(originalWidth, bandingThickness, originalDepth),
          new THREE.Vector3(0, originalHeight / 2 + bandingThickness / 2, 0),
          EDGES.TOP,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.TOP });
      }

      if (shouldCreateBanding(EDGES.BOTTOM)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.BOTTOM,
          new THREE.BoxGeometry(originalWidth, bandingThickness, originalDepth),
          new THREE.Vector3(0, -originalHeight / 2 - bandingThickness / 2, 0),
          EDGES.BOTTOM,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.BOTTOM });
      }

      if (shouldCreateBanding(EDGES.FRONT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.FRONT,
          new THREE.BoxGeometry(originalWidth, originalHeight, bandingThickness),
          new THREE.Vector3(0, 0, originalDepth / 2 + bandingThickness / 2),
          EDGES.FRONT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.FRONT });
      }

      if (shouldCreateBanding(EDGES.BACK)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.BACK,
          new THREE.BoxGeometry(originalWidth, originalHeight, bandingThickness),
          new THREE.Vector3(0, 0, -originalDepth / 2 - bandingThickness / 2),
          EDGES.BACK,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.BACK });
      }
    } else if (orientation.isHorizontal) {
      if (shouldCreateBanding(EDGES.LEFT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.LEFT,
          new THREE.BoxGeometry(bandingThickness, originalHeight, originalDepth),
          new THREE.Vector3(-originalWidth / 2 - bandingThickness / 2, 0, 0),
          EDGES.LEFT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.LEFT });
      }

      if (shouldCreateBanding(EDGES.RIGHT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.RIGHT,
          new THREE.BoxGeometry(bandingThickness, originalHeight, originalDepth),
          new THREE.Vector3(originalWidth / 2 + bandingThickness / 2, 0, 0),
          EDGES.RIGHT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.RIGHT });
      }

      if (shouldCreateBanding(EDGES.FRONT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.FRONT,
          new THREE.BoxGeometry(originalWidth, originalHeight, bandingThickness),
          new THREE.Vector3(0, 0, originalDepth / 2 + bandingThickness / 2),
          EDGES.FRONT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.FRONT });
      }

      if (shouldCreateBanding(EDGES.BACK)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.BACK,
          new THREE.BoxGeometry(originalWidth, originalHeight, bandingThickness),
          new THREE.Vector3(0, 0, -originalDepth / 2 - bandingThickness / 2),
          EDGES.BACK,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.BACK });
      }
    } else if (orientation.isBack) {
      if (shouldCreateBanding(EDGES.TOP)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.TOP,
          new THREE.BoxGeometry(originalWidth, bandingThickness, originalDepth),
          new THREE.Vector3(0, originalHeight / 2 + bandingThickness / 2, 0),
          EDGES.TOP,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.TOP });
      }

      if (shouldCreateBanding(EDGES.BOTTOM)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.BOTTOM,
          new THREE.BoxGeometry(originalWidth, bandingThickness, originalDepth),
          new THREE.Vector3(0, -originalHeight / 2 - bandingThickness / 2, 0),
          EDGES.BOTTOM,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.BOTTOM });
      }

      if (shouldCreateBanding(EDGES.LEFT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.LEFT,
          new THREE.BoxGeometry(bandingThickness, originalHeight, originalDepth),
          new THREE.Vector3(-originalWidth / 2 - bandingThickness / 2, 0, 0),
          EDGES.LEFT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.LEFT });
      }

      if (shouldCreateBanding(EDGES.RIGHT)) {
        const bandingMesh = this.createBandingMesh(
          mesh,
          EDGES.RIGHT,
          new THREE.BoxGeometry(bandingThickness, originalHeight, originalDepth),
          new THREE.Vector3(originalWidth / 2 + bandingThickness / 2, 0, 0),
          EDGES.RIGHT,
          bandingMaterial,
          objectData?.id
        );
        if (bandingMesh) bandingMeshes.push({ mesh: bandingMesh, edge: EDGES.RIGHT });
      }
    }

    // STEP 2: Reduce plank dimensions based on banding state
    this.updatePlankDimensions(mesh, effectiveBandingState, bandingThickness, objectData?.id);

    // STEP 3: Get reduced dimensions and adjust banding positions
    const { width, height, depth } = mesh.geometry.parameters;

    // Adjust banding mesh positions and sizes to match reduced plank
    for (const { mesh: bandingMesh, edge } of bandingMeshes) {
      if (!(bandingMesh.geometry instanceof THREE.BoxGeometry)) continue;

      let newGeometry: THREE.BoxGeometry;
      let newPosition: THREE.Vector3;

      if (orientation.isVertical) {
        if (edge === EDGES.TOP) {
          newGeometry = new THREE.BoxGeometry(width, bandingThickness, depth);
          newPosition = new THREE.Vector3(0, height / 2 + bandingThickness / 2, 0);
        } else if (edge === EDGES.BOTTOM) {
          newGeometry = new THREE.BoxGeometry(width, bandingThickness, depth);
          newPosition = new THREE.Vector3(0, -height / 2 - bandingThickness / 2, 0);
        } else if (edge === EDGES.FRONT) {
          newGeometry = new THREE.BoxGeometry(width, height, bandingThickness);
          newPosition = new THREE.Vector3(0, 0, depth / 2 + bandingThickness / 2);
        } else if (edge === EDGES.BACK) {
          newGeometry = new THREE.BoxGeometry(width, height, bandingThickness);
          newPosition = new THREE.Vector3(0, 0, -depth / 2 - bandingThickness / 2);
        } else {
          continue;
        }
      } else if (orientation.isHorizontal) {
        if (edge === EDGES.LEFT) {
          newGeometry = new THREE.BoxGeometry(bandingThickness, height, depth);
          newPosition = new THREE.Vector3(-width / 2 - bandingThickness / 2, 0, 0);
        } else if (edge === EDGES.RIGHT) {
          newGeometry = new THREE.BoxGeometry(bandingThickness, height, depth);
          newPosition = new THREE.Vector3(width / 2 + bandingThickness / 2, 0, 0);
        } else if (edge === EDGES.FRONT) {
          newGeometry = new THREE.BoxGeometry(width, height, bandingThickness);
          newPosition = new THREE.Vector3(0, 0, depth / 2 + bandingThickness / 2);
        } else if (edge === EDGES.BACK) {
          newGeometry = new THREE.BoxGeometry(width, height, bandingThickness);
          newPosition = new THREE.Vector3(0, 0, -depth / 2 - bandingThickness / 2);
        } else {
          continue;
        }
      } else if (orientation.isBack) {
        if (edge === EDGES.TOP) {
          newGeometry = new THREE.BoxGeometry(width, bandingThickness, depth);
          newPosition = new THREE.Vector3(0, height / 2 + bandingThickness / 2, 0);
        } else if (edge === EDGES.BOTTOM) {
          newGeometry = new THREE.BoxGeometry(width, bandingThickness, depth);
          newPosition = new THREE.Vector3(0, -height / 2 - bandingThickness / 2, 0);
        } else if (edge === EDGES.LEFT) {
          newGeometry = new THREE.BoxGeometry(bandingThickness, height, depth);
          newPosition = new THREE.Vector3(-width / 2 - bandingThickness / 2, 0, 0);
        } else if (edge === EDGES.RIGHT) {
          newGeometry = new THREE.BoxGeometry(bandingThickness, height, depth);
          newPosition = new THREE.Vector3(width / 2 + bandingThickness / 2, 0, 0);
        } else {
          continue;
        }
      } else {
        continue;
      }

      // Update banding mesh geometry and position
      bandingMesh.geometry.dispose();
      bandingMesh.geometry = newGeometry;
      bandingMesh.position.copy(newPosition);
    }
  }

  /**
   * Update banding positions and sizes when plank dimensions change
   */
  public async updateBanding(
    mesh: THREE.Mesh,
    newDimensions: { width: number; height: number; depth: number },
    bandingMaterialData?: Material,
    bandingState?: EdgeBandingState,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string }
  ): Promise<void> {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    // If dimensions are being updated externally, update original dimensions
    // This handles the case where user manually changes dimensions
    mesh.userData.originalDimensions = { ...newDimensions };

    // Remove all existing banding (without restoring dimensions since we're updating)
    this.removeBandingMeshes(mesh);

    // Update geometry to new dimensions
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(
      newDimensions.width,
      newDimensions.height,
      newDimensions.depth
    );

    // Get banding material if not provided
    let materialData = bandingMaterialData;
    if (!materialData && objectData) {
      materialData = this.getBandingMaterial(mesh, objectData) ?? undefined;
    }

    if (materialData && bandingState) {
      // Recreate banding with adjusted dimensions based on banding state
      await this.createBandingOnPlank(mesh, materialData, bandingState, parentMesh, objectData);
    }
  }

  /**
   * Apply banding from state (used when toggling edges)
   */
  public async applyBandingFromState(
    mesh: THREE.Mesh,
    bandingState: EdgeBandingState,
    bandingMaterialData?: Material,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string },
    objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Promise<void> {
    if (!this.isPlank(mesh)) return;

    // Get banding material if not provided
    let materialData = bandingMaterialData;
    if (!materialData && objectData) {
      materialData = this.getBandingMaterial(mesh, objectData, objectsData) ?? undefined;
    }

    if (!materialData) {
      console.warn('No banding material found. Cannot apply banding.');
      return;
    }

    // Check if at least one edge is enabled
    const hasAnyBanding =
      bandingState.top ||
      bandingState.bottom ||
      bandingState.left ||
      bandingState.right ||
      bandingState.front ||
      bandingState.back;

    if (hasAnyBanding) {
      // Remove all existing banding first to avoid duplicates
      // Don't restore dimensions yet - we'll recalculate based on new state
      const toRemove: THREE.Object3D[] = [];
      mesh.children.forEach((child) => {
        if (child.userData.type === 'banding') {
          toRemove.push(child);
        }
      });
      toRemove.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
        mesh.remove(child);
      });

      // Update plank dimensions and recreate banding based on current state
      await this.createBandingOnPlank(mesh, materialData, bandingState, parentMesh, objectData);
    } else {
      // No edges enabled, remove all banding and restore original dimensions
      this.removeAllBanding(mesh, objectData?.id);
    }
  }

  /**
   * Toggle banding on a specific edge
   */
  public async toggleBandingOnEdge(
    mesh: THREE.Mesh,
    edge: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
    currentState: EdgeBandingState,
    bandingMaterialData?: Material,
    parentMesh?: THREE.Mesh | null,
    objectData?: { material?: Material | Material[]; id?: string },
    objectsData?: Array<{ id: string; material?: Material | Material[] }>
  ): Promise<EdgeBandingState> {
    // Toggle the edge state
    const newState: EdgeBandingState = {
      ...currentState,
      [edge]: !currentState[edge],
    };

    // Apply the new state
    await this.applyBandingFromState(
      mesh,
      newState,
      bandingMaterialData,
      parentMesh,
      objectData,
      objectsData
    );

    return newState;
  }

  /**
   * Detect existing banding state from scene meshes
   */
  public detectBandingState(mesh: THREE.Mesh): EdgeBandingState {
    const detectedBanding: Partial<
      Pick<EdgeBandingState, 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'>
    > = {};

    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.type === 'banding') {
        const edge = child.userData.edge;
        if (edge && typeof edge === 'string') {
          // Only assign to boolean properties (exclude thickness which is number)
          const edgeKey = edge as 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
          if (
            edge === 'top' ||
            edge === 'bottom' ||
            edge === 'left' ||
            edge === 'right' ||
            edge === 'front' ||
            edge === 'back'
          ) {
            detectedBanding[edgeKey] = true;
          }
        }
      }
    });

    return detectedBanding as EdgeBandingState;
  }

  /**
   * Validate if an edge can have banding (not covered and valid for plank orientation)
   */
  public canHaveBanding(mesh: THREE.Mesh, edge: string, parentMesh?: THREE.Mesh | null): boolean {
    // Check if edge is valid for this plank orientation
    const validEdges = this.getValidBandingEdges(mesh);
    if (!validEdges.has(edge)) {
      return false;
    }

    // Check if edge is covered
    if (this.isEdgeCovered(mesh, edge, parentMesh)) {
      return false;
    }

    return true;
  }

  /**
   * Get all banding meshes for a plank
   */
  public getBandingMeshes(mesh: THREE.Mesh): THREE.Mesh[] {
    const bandingMeshes: THREE.Mesh[] = [];

    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.type === 'banding') {
        bandingMeshes.push(child);
      }
    });

    return bandingMeshes;
  }

  /**
   * Get banding mesh for a specific edge
   */
  public getBandingMeshForEdge(mesh: THREE.Mesh, edge: string): THREE.Mesh | null {
    for (const child of mesh.children) {
      if (
        child instanceof THREE.Mesh &&
        child.userData.type === 'banding' &&
        child.userData.edge === edge
      ) {
        return child;
      }
    }
    return null;
  }

  /**
   * Store original dimensions before banding is applied
   */
  private storeOriginalDimensions(mesh: THREE.Mesh): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;
    const { width, height, depth } = mesh.geometry.parameters;

    // Store original dimensions if not already stored
    if (!mesh.userData.originalDimensions) {
      mesh.userData.originalDimensions = { width, height, depth };
    }
  }

  /**
   * Get original dimensions (before banding adjustments)
   */
  private getOriginalDimensions(mesh: THREE.Mesh): {
    width: number;
    height: number;
    depth: number;
  } {
    if (mesh.userData.originalDimensions) {
      return mesh.userData.originalDimensions;
    }

    // If no original dimensions stored, use current dimensions
    if (mesh.geometry instanceof THREE.BoxGeometry) {
      const { width, height, depth } = mesh.geometry.parameters;
      return { width, height, depth };
    }

    return { width: 0, height: 0, depth: 0 };
  }

  /**
   * Calculate dimension adjustments based on banding state
   */
  private calculateDimensionAdjustments(
    bandingState: EdgeBandingState,
    bandingThickness: number
  ): { width: number; height: number; depth: number } {
    const adjustments = { width: 0, height: 0, depth: 0 };

    // Top and bottom reduce height
    adjustments.height -=
      bandingThickness * ((bandingState.top ? 1 : 0) + (bandingState.bottom ? 1 : 0));

    // Left and right reduce width
    adjustments.width -=
      bandingThickness * ((bandingState.left ? 1 : 0) + (bandingState.right ? 1 : 0));

    // Front and back reduce depth
    adjustments.depth -=
      bandingThickness * ((bandingState.front ? 1 : 0) + (bandingState.back ? 1 : 0));

    return adjustments;
  }

  /**
   * Update plank dimensions based on banding state
   */
  private updatePlankDimensions(
    mesh: THREE.Mesh,
    bandingState: EdgeBandingState,
    bandingThickness: number,
    objectId?: string
  ): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    // Store original dimensions if not already stored
    this.storeOriginalDimensions(mesh);
    const original = this.getOriginalDimensions(mesh);

    // Calculate adjustments
    const adjustments = this.calculateDimensionAdjustments(bandingState, bandingThickness);

    // Calculate new dimensions
    const newWidth = Math.max(original.width + adjustments.width, 0.1);
    const newHeight = Math.max(original.height + adjustments.height, 0.1);
    const newDepth = Math.max(original.depth + adjustments.depth, 0.1);

    // Update geometry
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(newWidth, newHeight, newDepth);

    // Update Redux state if objectId is provided
    if (objectId) {
      try {
        store.dispatch(
          updateObject({
            id: objectId,
            dimensions: {
              width: newWidth,
              height: newHeight,
              depth: newDepth,
            },
          })
        );
      } catch (error) {
        console.warn('Failed to update Redux state for plank dimensions:', error);
      }
    }
  }

  /**
   * Restore original dimensions when all banding is removed
   */
  private restoreOriginalDimensions(mesh: THREE.Mesh, objectId?: string): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const original = this.getOriginalDimensions(mesh);

    // Update geometry
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(original.width, original.height, original.depth);

    // Clear stored original dimensions
    delete mesh.userData.originalDimensions;

    // Update Redux state if objectId is provided
    if (objectId) {
      try {
        store.dispatch(
          updateObject({
            id: objectId,
            dimensions: {
              width: original.width,
              height: original.height,
              depth: original.depth,
            },
          })
        );
      } catch (error) {
        console.warn('Failed to update Redux state for plank dimensions:', error);
      }
    }
  }
}
