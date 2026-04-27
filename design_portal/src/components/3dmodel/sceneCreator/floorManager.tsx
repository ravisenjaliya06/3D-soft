import * as THREE from 'three';
import { Floor, WallPoint } from '../2dmodel/interface';
import { textureLoader } from './utils';

// FloorBuilder class handles creating the floor mesh for a specific set of points
class FloorBuilder {
  private points: WallPoint[];
  private scene: THREE.Scene;
  private floorMesh: THREE.Mesh | null = null;
  private textureUrl: string;

  constructor(points: WallPoint[], scene: THREE.Scene, textureUrl?: string) {
    this.points = points;
    this.scene = scene;
    this.textureUrl = textureUrl || '/textures/floor_white.jpg';
  }

  private createShape(): THREE.Shape {
    const shape = new THREE.Shape();
    if (this.points.length < 3) return shape;

    // Move to first point (scaled to 3D units)
    // Assuming 100 units 2D = 1 unit 3D
    const p0 = this.points[0];
    shape.moveTo(p0.x / 100, p0.y / 100);

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      shape.lineTo(p.x / 100, p.y / 100);
    }
    shape.closePath();

    return shape;
  }

  private createMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });

    textureLoader(this.textureUrl, 1, 1)
      .then((texture) => {
        //  FIX: proper wrapping
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // control tiling (adjust if needed)
        texture.repeat.set(1, 1);

        // make texture horizontal
        texture.center.set(0.5, 0.5);
        texture.rotation = Math.PI / 2;

        // quality improvement
        texture.anisotropy = 16;
        texture.colorSpace = THREE.SRGBColorSpace;

        // apply texture
        material.map = texture;
        material.transparent = false;
        material.opacity = 1;
        material.roughness = 0.85;
        material.metalness = 0;

        material.needsUpdate = true;
      })
      .catch((e) => {
        console.error(
          'FloorBuilder: Failed to load floor texture from',
          this.textureUrl,
          'Error:',
          e
        );
      });

    return material;
  }
  public createMesh(): THREE.Mesh | null {
    if (this.points.length < 3) return null;

    const shape = this.createShape();
    const geometry = new THREE.ShapeGeometry(shape);

    // Rotate geometry to lie flat on XZ plane
    // Shape is created in XY plane, so we rotate -90 deg around X
    geometry.rotateX(Math.PI / 2);

    const material = this.createMaterial();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'GeneratedFloor';
    mesh.userData.type = 'floor';
    mesh.receiveShadow = true;

    // Position slightly below walls to avoid z-fighting
    mesh.position.y = -0.01;

    this.floorMesh = mesh;
    return mesh;
  }
}

// FloorManager handles synchronization of all floors in the scene
export class FloorManager {
  private scene: THREE.Scene;
  private floorData: Floor[];
  private floorMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, floorData: Floor[]) {
    this.scene = scene;
    this.floorData = floorData;
  }

  private removeExistingFloors() {
    // Check if there are existing floor meshes to remove
    const floorsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.type === 'floor') {
        floorsToRemove.push(obj);
      }
    });

    floorsToRemove.forEach((floor) => {
      if (floor instanceof THREE.Mesh) {
        if (floor.geometry) floor.geometry.dispose();
        if (floor.material) {
          if (Array.isArray(floor.material)) {
            floor.material.forEach((m) => m.dispose());
          } else {
            (floor.material as THREE.Material).dispose();
          }
        }
      }
      this.scene.remove(floor);
    });
    this.floorMeshes = [];
  }

  public async syncData() {
    if (!this.scene) return;
    // Create the new meshes (async operation)
    const newMeshes: THREE.Mesh[] = [];
    for (const floor of this.floorData) {
      // Get texture URL from floor data if available
      const textureUrl = (floor as any).textureUrl || '/textures/floor_white.jpg';

      // Use the internal FloorBuilder class
      const builder = new FloorBuilder(floor.points, this.scene, textureUrl);
      const mesh = builder.createMesh();
      if (mesh) {
        // Set objectId to link mesh to Redux object
        mesh.userData.objectId = floor.id;
        newMeshes.push(mesh);
      }
    }
    //if there is any floor in the scene remove it just for helper function
    this.removeExistingFloors();

    for (const mesh of newMeshes) {
      this.scene.add(mesh);
      this.floorMeshes.push(mesh);
    }
  }
}
