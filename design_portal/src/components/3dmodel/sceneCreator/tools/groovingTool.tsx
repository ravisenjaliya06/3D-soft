import * as THREE from 'three';
import {
  EDGES,
  GROOVE_TYPE,
  PART_TYPES,
} from '../interface';
import {
  GROOVE_DEPTH,
  GROOVE_END_INSET,
  GROOVE_START_INSET,
  GROOVE_WIDTH,
  PROTRUSION_DEPTH,
  PROTRUSION_WIDTH,
} from '../constants';

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
    return (
      type === PART_TYPES.PLANK ||
      type === PART_TYPES.VERTICAL_PLANK ||
      type === PART_TYPES.HORIZONTAL_PLANK ||
      type === PART_TYPES.BACK_PLANK ||
      Object.values(PART_TYPES).includes(type)
    );
  }

  /**
   * Check if a plank is a back plank (only back planks get grooving)
   */
  public isBackPlank(mesh: THREE.Mesh): boolean {
    if (!this.isPlank(mesh)) return false;
    
    const plankName = (mesh.name || '').toUpperCase();
    return plankName === 'BACK_PLANK' || mesh.userData.type === PART_TYPES.BACK_PLANK;
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
    
    if (grooveMaterial instanceof THREE.MeshStandardMaterial) {
      const color = new THREE.Color();
      if (grooveMaterial.color) {
        color.copy(grooveMaterial.color);
        color.multiplyScalar(0.7); // Slightly darker for depth effect
        grooveMaterial.color = color;
      }
      grooveMaterial.transparent = false;
    }
    
    grooveMaterial.visible = true;
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
    // Groove runs horizontally along width
    // Groove starts GROOVE_START_INSET from left edge, ends GROOVE_END_INSET from right edge
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
    // Groove runs vertically along height
    // Groove starts GROOVE_START_INSET from bottom edge, ends GROOVE_END_INSET from top edge
    const grooveLength = height - GROOVE_START_INSET - GROOVE_END_INSET;
    
    const isLeft = edge === EDGES.LEFT;
    const grooveCenterX = isLeft
      ? -width / 2 + GROOVE_WIDTH / 2 // Slightly inside left edge
      : width / 2 - GROOVE_WIDTH / 2; // Slightly inside right edge
    
    const grooveCenterY =
      (-height / 2 + GROOVE_START_INSET + (height / 2 - GROOVE_END_INSET)) / 2;

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
    let geometry: THREE.BoxGeometry;
    let position: THREE.Vector3;

    switch (edge) {
      case EDGES.TOP:
        geometry = new THREE.BoxGeometry(width, PROTRUSION_WIDTH, PROTRUSION_DEPTH);
        position = new THREE.Vector3(0, height / 2 + PROTRUSION_WIDTH / 2, 0);
        break;
      case EDGES.BOTTOM:
        geometry = new THREE.BoxGeometry(width, PROTRUSION_WIDTH, PROTRUSION_DEPTH);
        position = new THREE.Vector3(0, -height / 2 - PROTRUSION_WIDTH / 2, 0);
        break;
      case EDGES.LEFT:
        geometry = new THREE.BoxGeometry(PROTRUSION_WIDTH, height, PROTRUSION_DEPTH);
        position = new THREE.Vector3(-width / 2 - PROTRUSION_WIDTH / 2, 0, 0);
        break;
      case EDGES.RIGHT:
        geometry = new THREE.BoxGeometry(PROTRUSION_WIDTH, height, PROTRUSION_DEPTH);
        position = new THREE.Vector3(width / 2 + PROTRUSION_WIDTH / 2, 0, 0);
        break;
      default:
        throw new Error(`Invalid edge for protrusion: ${edge}`);
    }

    return { geometry, position };
  }

  /**
   * Create grooving system: grooves (female) and protrusions (male) on back plank
   */
  public createGrooving(mesh: THREE.Mesh, objectId?: string): void {
    if (!this.isPlank(mesh)) {
      console.log('[Grooving] Not a plank');
      return;
    }

    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      console.log('[Grooving] Not a BoxGeometry');
      return;
    }

    // Only create grooving for BACK_PLANK
    if (!this.isBackPlank(mesh)) {
      return;
    }

    const { width, height } = mesh.geometry.parameters;
    const plankMaterial = this.getPlankMaterial(mesh);

    // Create grooves (female parts) on back plank edges
    const grooveMaterial = this.createGrooveMaterial(plankMaterial);

    // Top groove
    const topGroove = this.calculateTopBottomGroove(width, height, EDGES.TOP);
    this.createGrooveMesh(
      mesh,
      EDGES.TOP,
      topGroove.geometry,
      topGroove.position,
      grooveMaterial
    );

    // Bottom groove
    const bottomGroove = this.calculateTopBottomGroove(width, height, EDGES.BOTTOM);
    this.createGrooveMesh(
      mesh,
      EDGES.BOTTOM,
      bottomGroove.geometry,
      bottomGroove.position,
      grooveMaterial
    );

    // Left groove
    const leftGroove = this.calculateLeftRightGroove(width, height, EDGES.LEFT);
    this.createGrooveMesh(
      mesh,
      EDGES.LEFT,
      leftGroove.geometry,
      leftGroove.position,
      grooveMaterial
    );

    // Right groove
    const rightGroove = this.calculateLeftRightGroove(width, height, EDGES.RIGHT);
    this.createGrooveMesh(
      mesh,
      EDGES.RIGHT,
      rightGroove.geometry,
      rightGroove.position,
      grooveMaterial
    );

    // Create protrusions (male parts) on back plank edges - extending outward
    const protrusionMaterial = this.createProtrusionMaterial(plankMaterial);

    // Top protrusion
    const topProtrusion = this.calculateProtrusion(width, height, EDGES.TOP);
    this.createProtrusionMesh(
      mesh,
      EDGES.TOP,
      topProtrusion.geometry,
      topProtrusion.position,
      protrusionMaterial
    );

    // Bottom protrusion
    const bottomProtrusion = this.calculateProtrusion(width, height, EDGES.BOTTOM);
    this.createProtrusionMesh(
      mesh,
      EDGES.BOTTOM,
      bottomProtrusion.geometry,
      bottomProtrusion.position,
      protrusionMaterial
    );

    // Left protrusion
    const leftProtrusion = this.calculateProtrusion(width, height, EDGES.LEFT);
    this.createProtrusionMesh(
      mesh,
      EDGES.LEFT,
      leftProtrusion.geometry,
      leftProtrusion.position,
      protrusionMaterial
    );

    // Right protrusion
    const rightProtrusion = this.calculateProtrusion(width, height, EDGES.RIGHT);
    this.createProtrusionMesh(
      mesh,
      EDGES.RIGHT,
      rightProtrusion.geometry,
      rightProtrusion.position,
      protrusionMaterial
    );
  }

  /**
   * Update grooving positions and sizes when plank dimensions change
   */
  public updateGrooving(mesh: THREE.Mesh, objectId?: string): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      console.log('[Grooving] Cannot update grooving: Not a BoxGeometry');
      return;
    }

    // Remove all existing grooving
    this.removeAllGrooving(mesh);

    // Recreate grooving with new dimensions
    this.createGrooving(mesh, objectId);
  }

  /**
   * Remove all grooving meshes from a plank
   */
  public removeAllGrooving(mesh: THREE.Mesh): void {
    const toRemove: THREE.Object3D[] = [];
    
    mesh.children.forEach((child) => {
      if (
        child.userData.type === GROOVE_TYPE.GROOVE ||
        child.userData.type === GROOVE_TYPE.PROTRUSION
      ) {
        toRemove.push(child);
      }
    });

    toRemove.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat instanceof THREE.Material) {
              mat.dispose();
            }
          });
        }
      }
      mesh.remove(child);
    });
  }

  /**
   * Remove grooving from a specific edge
   */
  public removeGroovingOnEdge(mesh: THREE.Mesh, edge: string): void {
    const toRemove: THREE.Object3D[] = [];
    
    mesh.children.forEach((child) => {
      if (
        (child.userData.type === GROOVE_TYPE.GROOVE ||
          child.userData.type === GROOVE_TYPE.PROTRUSION) &&
        child.userData.edge === edge
      ) {
        toRemove.push(child);
      }
    });

    toRemove.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat instanceof THREE.Material) {
              mat.dispose();
            }
          });
        }
      }
      mesh.remove(child);
    });
  }

  /**
   * Get all grooving meshes for a plank
   */
  public getGroovingMeshes(mesh: THREE.Mesh): THREE.Mesh[] {
    const groovingMeshes: THREE.Mesh[] = [];

    mesh.children.forEach((child) => {
      if (
        child instanceof THREE.Mesh &&
        (child.userData.type === GROOVE_TYPE.GROOVE ||
          child.userData.type === GROOVE_TYPE.PROTRUSION)
      ) {
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
    for (const child of mesh.children) {
      if (
        child instanceof THREE.Mesh &&
        (child.userData.type === GROOVE_TYPE.GROOVE ||
          child.userData.type === GROOVE_TYPE.PROTRUSION) &&
        child.userData.edge === edge
      ) {
        if (!type || child.userData.type === GROOVE_TYPE[type.toUpperCase() as keyof typeof GROOVE_TYPE]) {
          return child;
        }
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

    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.userData.type === GROOVE_TYPE.GROOVE) {
          const edge = child.userData.edge;
          if (edge && typeof edge === 'string' && !grooves.includes(edge)) {
            grooves.push(edge);
          }
        } else if (child.userData.type === GROOVE_TYPE.PROTRUSION) {
          const edge = child.userData.edge;
          if (edge && typeof edge === 'string' && !protrusions.includes(edge)) {
            protrusions.push(edge);
          }
        }
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
   * Validate if a plank can have grooving
   */
  public canHaveGrooving(mesh: THREE.Mesh): boolean {
    if (!this.isPlank(mesh)) {
      return false;
    }

    if (!(mesh.geometry instanceof THREE.BoxGeometry)) {
      return false;
    }

    return this.isBackPlank(mesh);
  }
}
