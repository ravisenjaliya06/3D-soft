import * as THREE from 'three';
import {
  GROOVE_DEPTH,
  GROOVE_WIDTH,
} from '../constants';
import { EDGES, PART_TYPES } from '../interface';
import { store } from '../../store';
import { updateObject } from '../../store/dataSlice';

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
    return Object.values(PART_TYPES).includes(type);
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
   * Validate mesh before grooving operations
   */
  private validateMeshForGrooving(mesh: THREE.Mesh): boolean {
    return (
      this.isPlank(mesh) && mesh.geometry instanceof THREE.BoxGeometry && this.isBackPlank(mesh)
    );
  }

  /**
   * Calculate groove data for a specific edge on an *adjacent* plank.
   * This calculates the cut relative to the ADJACENT plank's coordinate system.
   */
  private calculateGrooveDataForAdjacentPlank(
    adjacentMesh: THREE.Mesh,
    backMesh: THREE.Mesh,
    edgeOnBack: string // 'top', 'bottom', 'left', 'right' of the back plank
  ): any {
    console.log('calculateGrooveDataForAdjacentPlank');
    // 1. Get Back Plank Dimensions (Global)
    const backGeo = backMesh.geometry as THREE.BoxGeometry;
    // const backWidth = backGeo.parameters.width * backMesh.scale.x;
    // const backHeight = backGeo.parameters.height * backMesh.scale.y;

    // 2. Get Adjacent Plank Dimensions
    const adjGeo = adjacentMesh.geometry as THREE.BoxGeometry;
    const adjWidth = adjGeo.parameters.width * adjacentMesh.scale.x;
    const adjHeight = adjGeo.parameters.height * adjacentMesh.scale.y;

    // 3. Determine Face and Coordinates based on relative position
    // Default values matching XML example for now
    const grooveData = {
      id: "6000",
      type: "4",
      isGenCode: "2",
      face: "5", // Assuming inner face for now
      x: 0,
      y: 0,
      endX: 0,
      endY: 0,
      width: GROOVE_WIDTH, // 10
      depth: GROOVE_DEPTH, // 6
      toolOffset: "ÖÐ",
      slotType: "0",
      macIndex: "1"
    };

    // Logic for XML "Slot" coordinates (Type 4)
    if (edgeOnBack === EDGES.TOP || edgeOnBack === EDGES.BOTTOM) {
      // Horizontal Groove on Adjacent Panel
      // XML Example: width=10, depth=6
      // Coordinates depend on the machine origin. 
      // Assuming simplistic mapping for now.
      grooveData.x = 0;
      grooveData.y = 20; // 20mm inset
      grooveData.endX = adjWidth;
      grooveData.endY = 20;
    } else {
      // Vertical Groove
      grooveData.x = 20;
      grooveData.y = 0;
      grooveData.endX = 20;
      grooveData.endY = adjHeight;
    }

    return grooveData;
  }

  /**
   * Find adjacent meshes (Top, Bottom, Left, Right)
   * This is a simplified finder based on bounding boxes or names/userData.
   */
  private findAdjacentPlank(backMesh: THREE.Mesh, edge: string): THREE.Mesh | null {
    // TODO: Implement robust adjacency detection.
    // For now, relies on naming convention if possible? 
    // Or iterate all planks and check distance.

    let foundMesh: THREE.Mesh | null = null;

    this.scene.traverse((object) => {
      if (foundMesh) return;
      if (object === backMesh) return;
      if (!(object instanceof THREE.Mesh)) return;
      if (!object.userData || !Object.values(PART_TYPES).includes(object.userData.type)) return;
      if (object.userData.type === PART_TYPES.BACK_PLANK) return;

      // Naive check: Bounding Box intersection or proximity
      // Since this is "magic" for now, we leave it as a placeholder hook for the user to improve
      // or we implement a basic centroid distance check.
    });

    return foundMesh;
  }

  /**
   * New Create Grooving: modify data, don't create meshes.
   */
  public createGrooving(mesh: THREE.Mesh): void {
    if (!this.validateMeshForGrooving(mesh)) {
      return;
    }

    // 1. Resize Back Plank
    // Increase Width and Height by PROTRUSION_DEPTH * 2 (assuming groove on all sides)

    // We modify the geometry dimensions.
    const geometry = mesh.geometry as THREE.BoxGeometry;
    const oldW = geometry.parameters.width;
    const oldH = geometry.parameters.height;

    // Check if already resized? 
    // Store original size in userData to avoid double resizing?
    if (!mesh.userData.originalDimensions) {
      mesh.userData.originalDimensions = { width: oldW, height: oldH };

      const newW = oldW + (GROOVE_DEPTH * 2);
      const newH = oldH + (GROOVE_DEPTH * 2);

      // Update Geometry
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(newW, newH, geometry.parameters.depth);
      // Reset scale if needed, but usually scale should be 1.
    }

    // 2. Add Groove Data to Adjacent Planks
    // Identifying neighbors is key.
    console.log(mesh)
    const siblings = mesh.children;
    console.log(`[GroovingTool] Found ${siblings.length} siblings to check.`);

    siblings.forEach(sibling => {
      console.log(`[GroovingTool] Sibling ID: ${sibling.userData?.objectId}, Name: ${sibling.name}, Constructor: ${sibling.constructor.name}, Type: ${sibling.type}`);
      if (sibling === mesh) return;

      if (!(sibling instanceof THREE.Mesh)) {
        console.log(`[GroovingTool] Siobling ${sibling.name} is not a Mesh.`);
        return;
      }

      const isPlank = this.isPlank(sibling);
      const isBack = this.isBackPlank(sibling);

      console.log(`[GroovingTool] Sibling ${sibling.name} Check: IsPlank=${isPlank}, IsBack=${isBack}`);

      if (!isPlank) return;
      if (isBack) return;

      // Determine relationship (Top/Bottom/Left/Right)
      // For this task, we will add groove data to ALL plank siblings as a POC 
      // because we lack the spatial graph.
      // But we should try to be specific if possible.
      // Let's assume standard names:

      const name = sibling.name.toUpperCase();
      let edge = '';
      if (name.includes('TOP')) edge = EDGES.TOP;
      else if (name.includes('BOTTOM')) edge = EDGES.BOTTOM;
      else if (name.includes('LEFT')) edge = EDGES.LEFT;
      else if (name.includes('RIGHT')) edge = EDGES.RIGHT;

      console.log(`[GroovingTool] Sibling ${sibling.name} Edge Detection: ${edge}`);

      if (edge) {
        const grooveData = this.calculateGrooveDataForAdjacentPlank(sibling, mesh, edge);
        console.log('Groove Data:', grooveData);

        // Store in userData and Sync to Redux
        if (sibling.userData.objectId) {
          // If Persistent Object: Fetch from Store -> Update -> Dispatch
          const state = store.getState();
          const existingObject = state.data.objects.find((o: any) => o.id === sibling.userData.objectId);

          // Create copy of grooves array or empty array
          const currentGrooves = existingObject?.grooves ? [...existingObject.grooves] : [];

          const existingIndex = currentGrooves.findIndex((g: any) => g.id === grooveData.id);

          if (existingIndex !== -1) {
            currentGrooves[existingIndex] = grooveData;
          } else {
            currentGrooves.push(grooveData);
          }

          // Update local mesh data immediately to reflect changes visually if needed
          if (!sibling.userData.grooves) sibling.userData.grooves = [];
          sibling.userData.grooves = currentGrooves;

          // Update store
          console.log('Updating store', currentGrooves);
          store.dispatch(updateObject({
            id: sibling.userData.objectId,
            grooves: currentGrooves
          }));
        } else {
          // Non-persistent Object (e.g. preview): Update userData only
          if (!sibling.userData.grooves) {
            sibling.userData.grooves = [];
          }
          const existingIndex = sibling.userData.grooves.findIndex((g: any) => g.id === grooveData.id);
          if (existingIndex === -1) {
            sibling.userData.grooves.push(grooveData);
          } else {
            sibling.userData.grooves[existingIndex] = grooveData;
          }
        }
      }
    });

    console.log("Back plank resized and groove data calculated");
  }

  public updateGrooving(mesh: THREE.Mesh): void {
    this.createGrooving(mesh);
  }

  public removeAllGrooving(mesh: THREE.Mesh): void {
    // Restore original size
    if (mesh.userData.originalDimensions) {
      const { width, height } = mesh.userData.originalDimensions;
      // Restore geometry
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(width, height, (mesh.geometry as THREE.BoxGeometry).parameters.depth);
      delete mesh.userData.originalDimensions;
    }

    // Remove groove data from siblings
    const siblings = mesh.parent?.children || this.scene.children;
    siblings.forEach(sibling => {
      if (sibling === mesh) return;
      if (!(sibling instanceof THREE.Mesh)) return;
      if (sibling.userData.grooves) {
        // Filter out grooves related to this back plank (ID 6000 is generic, might need unique ID)
        // For now, clear generic ID 6000
        sibling.userData.grooves = sibling.userData.grooves.filter((g: any) => g.id !== "6000");
      }
    });
  }

  // Legacy/Unused methods stubs to maintain interface if called elsewhere
  public removeGroovingOnEdge(mesh: THREE.Mesh, edge: string): void { }
  public getGroovingMeshes(mesh: THREE.Mesh): THREE.Mesh[] { return []; }
  public hasGroovingOnEdge(mesh: THREE.Mesh, edge: string): boolean { return false; }
  public detectGroovingState(mesh: THREE.Mesh): any { return { grooves: [], protrusions: [] }; }
}
