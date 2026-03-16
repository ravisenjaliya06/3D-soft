import * as THREE from 'three';
import { store } from '../../store';
import { updateObject } from '../../store/dataSlice';
import { GROOVE_DEPTH, GROOVE_WIDTH } from '../constants';
import { PART_TYPES } from '../interface';

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
    return (
      mesh.userData.type === PART_TYPES.BACK_PLANK || mesh.name.toUpperCase().includes('BACK_PLANK')
    );
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
   * Calculate groove data based on geometric intersection
   * Converts World Intersection to Local Sibling Space and maps to Face 5
   */
  private calculateGrooveFromIntersection(sibling: THREE.Mesh, intersectionBox: THREE.Box3): any {
    // 1. Convert Intersection to Sibling Local Space
    // We need the min/max of the intersection in the Sibling's local coordinate system.
    // Box3 is axis-aligned in World. To get Local Box, we transform corners?
    // If Sibling is rotated, World Box is AABB, so simple transform might not work perfectly if not aligned.
    // However, usually parts are axis aligned (0, 90, 180).

    // Better approach:
    // Transform Sibling World to Local matrix.
    const toLocal = sibling.matrixWorld.clone().invert();

    // Create a Local Box from the World Intersection corners transformed
    const localBox = new THREE.Box3();

    // We must check all 8 corners of the intersection box to find new AABB in local space
    // (Since rotation might change which corner is min/max)
    const corners = [
      new THREE.Vector3(intersectionBox.min.x, intersectionBox.min.y, intersectionBox.min.z),
      new THREE.Vector3(intersectionBox.max.x, intersectionBox.min.y, intersectionBox.min.z),
      new THREE.Vector3(intersectionBox.min.x, intersectionBox.max.y, intersectionBox.min.z),
      new THREE.Vector3(intersectionBox.min.x, intersectionBox.min.y, intersectionBox.max.z),
      new THREE.Vector3(intersectionBox.max.x, intersectionBox.max.y, intersectionBox.min.z),
      new THREE.Vector3(intersectionBox.max.x, intersectionBox.min.y, intersectionBox.max.z),
      new THREE.Vector3(intersectionBox.min.x, intersectionBox.max.y, intersectionBox.max.z),
      new THREE.Vector3(intersectionBox.max.x, intersectionBox.max.y, intersectionBox.max.z),
    ];

    corners.forEach((p) => {
      p.applyMatrix4(toLocal);
      localBox.expandByPoint(p);
    });

    // 2. Identify Thickness Axis (Smallest Dimension of Sibling)
    // We use the Geometry parameters for the "reference" size, assuming scale is 1.
    const geo = sibling.geometry as THREE.BoxGeometry;
    const dimList = [
      { key: 'width', val: geo.parameters.width },
      { key: 'height', val: geo.parameters.height },
      { key: 'depth', val: geo.parameters.depth },
    ].sort((a, b) => a.val - b.val);

    const thicknessKey = dimList[0].key;

    // 3. Map Local Bounds to Face Coordinates (matching nest.py)
    // nest.py logic:
    // If depth is thickness -> Face is Width x Height (Local X x Local Y)
    // If width is thickness -> Face is Height x Depth (Local Y x Local Z)
    // If height is thickness -> Face is Width x Depth (Local X x Local Z)

    // We need to map the "Local Box" min/max to these Face Coordinates.
    // Local Box Min: {x: ..., y: ..., z: ...}
    // Since BoxGeometry is centered at (0,0,0) usually, we need to shift to (0..W, 0..H)?
    // NO. MeshBuilder creates meshes. Usually BoxGeometry vertices are +/- size/2.
    // BUT `nest.py` XML coordinates are usually 0..W, 0..H relative to corner?

    // Let's assume XML coordinates are from Bottom-Left corner of Face.
    // So we need to offset the local coordinates by +Size/2.

    const halfSize = {
      width: geo.parameters.width / 2,
      height: geo.parameters.height / 2,
      depth: geo.parameters.depth / 2,
    };

    // Normalized Coordinates (0 to Size)
    // Start Point
    const lx = localBox.min.x + halfSize.width;
    const ly = localBox.min.y + halfSize.height;
    const lz = localBox.min.z + halfSize.depth;

    // End Point
    const lex = localBox.max.x + halfSize.width;
    const ley = localBox.max.y + halfSize.height;
    const lez = localBox.max.z + halfSize.depth;

    let x = 0,
      y = 0,
      endX = 0,
      endY = 0;

    if (thicknessKey === 'depth') {
      // Face is X/Y. Z is Thickness.
      // XML X = Local X, XML Y = Local Y.

      x = lx;
      y = ly;
      endX = lex;
      endY = ley;
    } else if (thicknessKey === 'width') {
      // Face is Y/Z. X is Thickness.
      // nest.py: w = raw_h (Y), h = raw_d (Z)

      x = ly;
      y = lz;
      endX = ley;
      endY = lez;
    } else {
      // height is thickness
      // Face is X/Z. Y is Thickness.
      // nest.py: w = raw_w (X), h = raw_d (Z)

      x = lx;
      y = lz;
      endX = lex;
      endY = lez;
    }

    // 4. Clean up Coordinates
    // The intersection is a Volume (Box). The groove is a Line/Slot (Start -> End).
    // The "Groove" should run along the "Long" dimension of the intersection.
    // The "Short" dimension determines the Width/Thickness of groove?

    // Actually, usually the tool cuts a slot of `GROOVE_WIDTH` at a specific position.
    // The position is constant on one axis, and varies on the other.

    // Determine Main Axis of the Groove on the Face
    const dx = Math.abs(endX - x);
    const dy = Math.abs(endY - y);

    const finalData = {
      id: '6000',
      type: '4',
      isGenCode: '2',
      face: '5',
      x: 0,
      y: 0,
      endX: 0,
      endY: 0,
      width: GROOVE_WIDTH,
      depth: GROOVE_DEPTH,
      toolOffset: 'ÖÐ',
      slotType: '0',
      macIndex: '1',
    };

    // If dx > dy, groove runs along X. Y is constant (Midpoint).
    if (dx > dy) {
      finalData.x = x;
      finalData.endX = endX;
      finalData.y = (y + endY) / 2; // Center of intersection
      finalData.endY = finalData.y;
    } else {
      // Groove runs along Y. X is constant.
      finalData.x = (x + endX) / 2;
      finalData.endX = finalData.x;
      finalData.y = y;
      finalData.endY = endY;
    }

    // Ensure precision
    finalData.x = Number(finalData.x.toFixed(6));
    finalData.y = Number(finalData.y.toFixed(6));
    finalData.endX = Number(finalData.endX.toFixed(6));
    finalData.endY = Number(finalData.endY.toFixed(6));

    return finalData;
  }

  /**
   * New Create Grooving: modify data, don't create meshes.
   */
  public createGrooving(mesh: THREE.Mesh): void {
    if (!this.validateMeshForGrooving(mesh)) {
      return;
    }
    // 1. Resize Back Plank (if not already)
    const geometry = mesh.geometry as THREE.BoxGeometry;
    let oldW = geometry.parameters.width;
    let oldH = geometry.parameters.height;

    if (!mesh.userData.originalDimensions) {
      mesh.userData.originalDimensions = { width: oldW, height: oldH };
      const newW = oldW + GROOVE_DEPTH * 2;
      const newH = oldH + GROOVE_DEPTH * 2;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(newW, newH, geometry.parameters.depth);
      oldW = newW; // Update local ref
      oldH = newH;
    }

    // Force World Matrix Update after resize
    mesh.updateMatrixWorld(true);

    // 2. Compute Back Plank World Box
    // Use Box3 setFromObject to include rotation/scale/position
    const backBox = new THREE.Box3().setFromObject(mesh);
    // Slightly shrink backBox to avoid touching-only contacts?
    // Or expand slightly if we want tolerance?
    // Intersection volume is what we want.

    const siblings = mesh.parent?.children || [];

    siblings.forEach((sibling) => {
      if (sibling === mesh) return;
      if (!(sibling instanceof THREE.Mesh)) return;

      const isPlank = this.isPlank(sibling);
      const isBack = this.isBackPlank(sibling);

      if (!isPlank || isBack) return;

      // Update Sibling World Matrix
      sibling.updateMatrixWorld(true);
      const siblingBox = new THREE.Box3().setFromObject(sibling);

      if (backBox.intersectsBox(siblingBox)) {
        // INTERSECTION DETECTED
        const intersectionBox = backBox.clone().intersect(siblingBox);

        // Calculate Groove Data from this intersection
        const grooveData = this.calculateGrooveFromIntersection(sibling, intersectionBox);

        // Logic to Store/Update
        if (sibling.userData.objectId) {
          // Get current store state to preserve existing grooves
          const state = store.getState();
          const existingObject = state.data.objects.find(
            (o: any) => o.id === sibling.userData.objectId
          );

          let currentGrooves: any[] = [];
          if (existingObject && existingObject.grooves) {
            currentGrooves = [...existingObject.grooves];
          } else if (sibling.userData.grooves) {
            currentGrooves = [...sibling.userData.grooves];
          }

          // Remove existing groove with same ID if exists
          const existingIndex = currentGrooves.findIndex((g: any) => g.id === grooveData.id);
          if (existingIndex !== -1) {
            currentGrooves[existingIndex] = grooveData;
          } else {
            currentGrooves.push(grooveData);
          }

          sibling.userData.grooves = currentGrooves;

          store.dispatch(
            updateObject({
              id: sibling.userData.objectId,
              grooves: currentGrooves,
            })
          );
        }
      }
    });
  }

  public updateGrooving(mesh: THREE.Mesh): void {
    this.createGrooving(mesh);
  }

  public removeAllGrooving(mesh: THREE.Mesh): void {
    // Restore original size
    if (mesh.userData.originalDimensions) {
      const { width, height } = mesh.userData.originalDimensions;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(
        width,
        height,
        (mesh.geometry as THREE.BoxGeometry).parameters.depth
      );
      delete mesh.userData.originalDimensions;
    }

    // Remove groove data from siblings
    const siblings = mesh.parent?.children || [];
    siblings.forEach((sibling) => {
      if (sibling === mesh) return;
      if (!(sibling instanceof THREE.Mesh)) return;

      if (sibling.userData.grooves) {
        // Filter out grooves related to this back plank
        const newGrooves = sibling.userData.grooves.filter((g: any) => g.id !== '6000');
        sibling.userData.grooves = newGrooves;

        if (sibling.userData.objectId) {
          store.dispatch(
            updateObject({
              id: sibling.userData.objectId,
              grooves: newGrooves,
            })
          );
        }
      }
    });
  }
}
