import * as THREE from 'three';
import {
  GROOVE_DEPTH,
  GROOVE_END_INSET,
  GROOVE_START_INSET,
  GROOVE_WIDTH,
  PROTRUSION_DEPTH,
  PROTRUSION_WIDTH,
} from '../constants';
import { EDGES, GROOVE_TYPE, PART_TYPES } from '../interface';

/**
 * Comprehensive GroovingTool class for managing grooving on planks
 * Handles creation, update, removal, and validation of groove and protrusion meshes
 */
export class GroovingTool {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Check if a mesh is a plank that can have grooving
   */
  public isPlank(mesh: THREE.Mesh): boolean {
    const type = mesh.userData.type;
    return Object.values(PART_TYPES).includes(type)
  }

  /**
   * Check if a plank is a back plank (only back planks get grooving)
   */
  public isBackPlank(mesh: THREE.Mesh): boolean {
    if (!this.isPlank(mesh)) return false;
    return mesh.userData.type === PART_TYPES.BACK_PLANK || mesh.name.toUpperCase() === 'BACK_PLANK';
  }

  /**
   * Get plank material from mesh
   */
  private getPlankMaterial(mesh: THREE.Mesh): THREE.Material {
    if (mesh.material instanceof THREE.Material) {
      return mesh.material.clone();
    } else if (Array.isArray(mesh.material) && mesh.material.length > 0) {
      return mesh.material[0].clone();
    }
    return new THREE.MeshStandardMaterial({ color: 0xffffff });
  }

  /**
   * Create groove material (slightly darker to show depth)
   */
  private createGrooveMaterial(plankMaterial: THREE.Material): THREE.Material {
    const grooveMaterial = plankMaterial.clone();
    grooveMaterial.visible = true;

    if (!(grooveMaterial instanceof THREE.MeshStandardMaterial)) {
      return grooveMaterial;
    }

    if (!grooveMaterial.color) {
      grooveMaterial.transparent = false;
      return grooveMaterial;
    }

    const color = new THREE.Color();
    color.copy(grooveMaterial.color);
    color.multiplyScalar(0.7);
    grooveMaterial.color = color;
    grooveMaterial.transparent = false;

    return grooveMaterial;
  }

  /**
   * Create protrusion material (same as plank material)
   */
  private createProtrusionMaterial(plankMaterial: THREE.Material): THREE.Material {
    const protrusionMaterial = plankMaterial.clone();
    protrusionMaterial.visible = true;

    if (protrusionMaterial instanceof THREE.MeshStandardMaterial) {
      protrusionMaterial.transparent = false;
    }

    return protrusionMaterial;
  }

  /**
   * Create a groove mesh (female part) on a plank edge
   */
  private createGrooveMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    material: THREE.Material
  ): THREE.Mesh {
    const groove = new THREE.Mesh(geometry, material);
    groove.position.copy(position);
    groove.name = `Groove_${edge}_${mesh.name}`;
    groove.userData.type = GROOVE_TYPE.GROOVE;
    groove.userData.edge = edge;
    groove.userData.objectId = `${mesh.userData.objectId}_groove_${edge.toLowerCase()}`;

    // Ensure groove is visible
    groove.visible = true;
    groove.castShadow = true;
    groove.receiveShadow = true;

    mesh.add(groove);
    return groove;
  }

  /**
   * Create a protrusion mesh (male part) on back plank edge
   */
  private createProtrusionMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    material: THREE.Material
  ): THREE.Mesh {
    const protrusion = new THREE.Mesh(geometry, material);
    protrusion.position.copy(position);
    protrusion.name = `Protrusion_${edge}_${mesh.name}`;
    protrusion.userData.type = GROOVE_TYPE.PROTRUSION;
    protrusion.userData.edge = edge;
    protrusion.userData.objectId = `${mesh.userData.objectId}_protrusion_${edge.toLowerCase()}`;

    protrusion.visible = true;
    protrusion.castShadow = true;
    protrusion.receiveShadow = true;

    mesh.add(protrusion);
    return protrusion;
  }

  /**
   * Calculate groove dimensions and positions for top/bottom edges
   */
  private calculateTopBottomGroove(
    width: number,
    height: number,
    edge: string
  ): { geometry: THREE.BoxGeometry; position: THREE.Vector3 } {
    const grooveLength = width - GROOVE_START_INSET - GROOVE_END_INSET;
    const grooveCenterX = (-width / 2 + GROOVE_START_INSET + (width / 2 - GROOVE_END_INSET)) / 2;

    const isTop = edge === EDGES.TOP;
    const grooveCenterY = isTop
      ? height / 2 - GROOVE_WIDTH / 2 // Slightly inside top edge
      : -height / 2 + GROOVE_WIDTH / 2; // Slightly inside bottom edge

    const geometry = new THREE.BoxGeometry(grooveLength, GROOVE_WIDTH, GROOVE_DEPTH);
    const position = new THREE.Vector3(grooveCenterX, grooveCenterY, 0);

    return { geometry, position };
  }

  /**
   * Calculate groove dimensions and positions for left/right edges
   */
  private calculateLeftRightGroove(
    width: number,
    height: number,
    edge: string
  ): { geometry: THREE.BoxGeometry; position: THREE.Vector3 } {
    const grooveLength = height - GROOVE_START_INSET - GROOVE_END_INSET;

    const isLeft = edge === EDGES.LEFT;
    const grooveCenterX = isLeft ? -width / 2 + GROOVE_WIDTH / 2 : width / 2 - GROOVE_WIDTH / 2;

    const grooveCenterY = (-height / 2 + GROOVE_START_INSET + (height / 2 - GROOVE_END_INSET)) / 2;

    const geometry = new THREE.BoxGeometry(GROOVE_WIDTH, grooveLength, GROOVE_DEPTH);
    const position = new THREE.Vector3(grooveCenterX, grooveCenterY, 0);

    return { geometry, position };
  }

  /**
   * Calculate protrusion dimensions and positions
   */
  private calculateProtrusion(
    width: number,
    height: number,
    edge: string
  ): { geometry: THREE.BoxGeometry; position: THREE.Vector3 } {
    const isHorizontal = edge === EDGES.TOP || edge === EDGES.BOTTOM;
    const isVertical = edge === EDGES.LEFT || edge === EDGES.RIGHT;

    if (!isHorizontal && !isVertical) {
      throw new Error(`Invalid edge for protrusion: ${edge}`);
    }

    const geometry = isHorizontal
      ? new THREE.BoxGeometry(width, PROTRUSION_WIDTH, PROTRUSION_DEPTH)
      : new THREE.BoxGeometry(PROTRUSION_WIDTH, height, PROTRUSION_DEPTH);

    const position = new THREE.Vector3(
      isVertical ? (edge === EDGES.LEFT ? -1 : 1) * (width / 2 + PROTRUSION_WIDTH / 2) : 0,
      isHorizontal ? (edge === EDGES.BOTTOM ? -1 : 1) * (height / 2 + PROTRUSION_WIDTH / 2) : 0,
      0
    );

    return { geometry, position };
  }

  /**
   * Check if child is a grooving mesh (groove or protrusion)
   */
  private isGroovingMesh(child: THREE.Object3D): boolean {
    return (
      child.userData.type === GROOVE_TYPE.GROOVE || child.userData.type === GROOVE_TYPE.PROTRUSION
    );
  }

  /**
   * Dispose of mesh geometry and materials properly
   */
  private disposeMesh(mesh: THREE.Mesh): void {
    if (!(mesh instanceof THREE.Mesh)) {
      return;
    }

    mesh.geometry.dispose();

    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
      return;
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        if (mat instanceof THREE.Material) {
          mat.dispose();
        }
      });
    }
  }

  /**
   * Get all grooving children from a mesh
   */
  private getGroovingChildren(mesh: THREE.Mesh, edge?: string): THREE.Object3D[] {
    const children: THREE.Object3D[] = [];

    mesh.children.forEach((child) => {
      if (!this.isGroovingMesh(child) ||
        (edge && child.userData.edge !== edge)) {
        return;
      }

      children.push(child);
    });

    return children;
  }

  /**
   * Create grooving system: grooves (female) and protrusions (male) on back plank
   */
  public createGrooving(mesh: THREE.Mesh): void {
    if (!this.validateMeshForGrooving(mesh)) {
      return;
    }

    // TypeScript type narrowing - we know it's BoxGeometry from validation
    const geometry = mesh.geometry as THREE.BoxGeometry;
    const { width, height } = geometry.parameters;
    const plankMaterial = this.getPlankMaterial(mesh);
    const grooveMaterial = this.createGrooveMaterial(plankMaterial);
    const protrusionMaterial = this.createProtrusionMaterial(plankMaterial);

    // Create grooves (female parts) on all edges
    const topBottomEdges = [EDGES.TOP, EDGES.BOTTOM];
    const leftRightEdges = [EDGES.LEFT, EDGES.RIGHT];

    topBottomEdges.forEach((edge) => {
      const groove = this.calculateTopBottomGroove(width, height, edge);
      this.createGrooveMesh(mesh, edge, groove.geometry, groove.position, grooveMaterial);
    });

    leftRightEdges.forEach((edge) => {
      const groove = this.calculateLeftRightGroove(width, height, edge);
      this.createGrooveMesh(mesh, edge, groove.geometry, groove.position, grooveMaterial);
    });

    // Create protrusions (male parts) on all edges
    const allEdges = [EDGES.TOP, EDGES.BOTTOM, EDGES.LEFT, EDGES.RIGHT];
    allEdges.forEach((edge) => {
      const protrusion = this.calculateProtrusion(width, height, edge);
      this.createProtrusionMesh(
        mesh,
        edge,
        protrusion.geometry,
        protrusion.position,
        protrusionMaterial
      );
    });
  }

  /**
   * Update grooving positions and sizes when plank dimensions change
   */
  public updateGrooving(mesh: THREE.Mesh): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return;
    }

    this.removeAllGrooving(mesh);
    this.createGrooving(mesh);
  }

  /**
   * Remove all grooving meshes from a plank
   */
  public removeAllGrooving(mesh: THREE.Mesh): void {
    const toRemove = this.getGroovingChildren(mesh);

    toRemove.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      }
      mesh.remove(child);
    });
  }

  /**
   * Remove grooving from a specific edge
   */
  public removeGroovingOnEdge(mesh: THREE.Mesh, edge: string): void {
    const toRemove = this.getGroovingChildren(mesh, edge);

    toRemove.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      }
      mesh.remove(child);
    });
  }

  /**
   * Get all grooving meshes for a plank
   */
  public getGroovingMeshes(mesh: THREE.Mesh): THREE.Mesh[] {
    const groovingMeshes: THREE.Mesh[] = [];
    const children = this.getGroovingChildren(mesh);

    children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        groovingMeshes.push(child);
      }
    });

    return groovingMeshes;
  }

  /**
   * Get grooving mesh for a specific edge
   */
  public getGroovingMeshForEdge(
    mesh: THREE.Mesh,
    edge: string,
    type?: 'groove' | 'protrusion'
  ): THREE.Mesh | null {
    const children = this.getGroovingChildren(mesh, edge);

    for (const child of children) {
      if (!(child instanceof THREE.Mesh)) continue;
      if (!type) return child;

      const expectedType = GROOVE_TYPE[type.toUpperCase() as keyof typeof GROOVE_TYPE];
      if (child.userData.type === expectedType) {
        return child;
      }
    }

    return null;
  }

  /**
   * Detect existing grooving state from scene meshes
   */
  public detectGroovingState(mesh: THREE.Mesh): {
    grooves: string[];
    protrusions: string[];
  } {
    const grooves: string[] = [];
    const protrusions: string[] = [];
    const children = this.getGroovingChildren(mesh);

    children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const edge = child.userData.edge;
      if (!edge || typeof edge !== 'string') {
        return;
      }

      if (child.userData.type === GROOVE_TYPE.GROOVE && !grooves.includes(edge)) {
        grooves.push(edge);
        return;
      }

      if (child.userData.type === GROOVE_TYPE.PROTRUSION && !protrusions.includes(edge)) {
        protrusions.push(edge);
      }
    });

    return { grooves, protrusions };
  }

  /**
   * Check if grooving exists on a specific edge
   */
  public hasGroovingOnEdge(mesh: THREE.Mesh, edge: string): boolean {
    return this.getGroovingMeshForEdge(mesh, edge) !== null;
  }

  /**
   * Validate mesh before grooving operations
   */
  private validateMeshForGrooving(mesh: THREE.Mesh): boolean {
    return (
      this.isPlank(mesh) &&
      mesh.geometry instanceof THREE.BoxGeometry &&
      this.isBackPlank(mesh)
    );
  }
}
