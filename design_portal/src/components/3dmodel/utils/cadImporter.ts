import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShapeData } from '../interface';
import { CADImportOptions, CADObjectData } from '../interface';
import { store } from '../store';
import { addShape } from '../store/customDesignSlice';

type ExtendedShapeData = ShapeData & {
  type: ShapeData['type'] | 'su' | 'cad';
  properties: ShapeData['properties'] & {
    fileName?: string;
    fileType?: string;
  };
};

class CADImporter {
  private static instance: CADImporter;
  private loaders: {
    stl: STLLoader;
    obj: OBJLoader;
    gltf: GLTFLoader;
  };

  private constructor() {
    this.loaders = {
      stl: new STLLoader(),
      obj: new OBJLoader(),
      gltf: new GLTFLoader(),
    };
  }

  public static getInstance(): CADImporter {
    if (!CADImporter.instance) {
      CADImporter.instance = new CADImporter();
    }
    return CADImporter.instance;
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private async loadSTL(
    file: File,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<CADObjectData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const geometry = this.loaders.stl.parse(event.target?.result as ArrayBuffer);
          const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            metalness: 0.5,
            roughness: 0.5,
          });
          const mesh = new THREE.Mesh(geometry, material);

          // Calculate bounding box and center
          const boundingBox = new THREE.Box3().setFromObject(mesh);
          const center = boundingBox.getCenter(new THREE.Vector3());

          // Center the mesh
          mesh.position.sub(center);

          resolve({
            mesh,
            boundingBox,
            center,
            dimensions: {
              width: boundingBox.max.x - boundingBox.min.x,
              height: boundingBox.max.y - boundingBox.min.y,
              depth: boundingBox.max.z - boundingBox.min.z,
            },
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      if (onProgress) {
        reader.onprogress = (event) => onProgress(event);
      }
      reader.readAsArrayBuffer(file);
    });
  }

  private async loadOBJ(
    file: File,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<CADObjectData> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.loaders.obj.load(
        url,
        (object: THREE.Group) => {
          URL.revokeObjectURL(url);
          try {
            // Convert to a single mesh if it's a group
            let mesh: THREE.Mesh | THREE.Group = object;
            if (object instanceof THREE.Group) {
              // Combine all meshes in the group
              const geometries: THREE.BufferGeometry[] = [];
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  geometries.push(child.geometry);
                }
              });

              if (geometries.length > 0) {
                const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                const material = new THREE.MeshStandardMaterial({
                  color: 0x808080,
                  metalness: 0.5,
                  roughness: 0.5,
                });
                mesh = new THREE.Mesh(mergedGeometry, material);
              } else {
                // If no meshes found, create an empty mesh
                mesh = new THREE.Mesh(
                  new THREE.BufferGeometry(),
                  new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    metalness: 0.5,
                    roughness: 0.5,
                  })
                );
              }
            }

            // Calculate bounding box and center
            const boundingBox = new THREE.Box3().setFromObject(mesh);
            const center = boundingBox.getCenter(new THREE.Vector3());

            // Center the mesh
            mesh.position.sub(center);

            resolve({
              mesh,
              boundingBox,
              center,
              dimensions: {
                width: boundingBox.max.x - boundingBox.min.x,
                height: boundingBox.max.y - boundingBox.min.y,
                depth: boundingBox.max.z - boundingBox.min.z,
              },
            });
          } catch (error) {
            reject(error);
          }
        },
        onProgress,
        (error) => {
          URL.revokeObjectURL(url);
          reject(error);
        }
      );
    });
  }

  private async loadGLTF(
    file: File,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<CADObjectData> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.loaders.gltf.load(
        url,
        (gltf: { scene: THREE.Group }) => {
          URL.revokeObjectURL(url);
          const object = gltf.scene;

          // Calculate bounding box and center
          const boundingBox = new THREE.Box3().setFromObject(object);
          const center = boundingBox.getCenter(new THREE.Vector3());

          // Center the object
          object.position.sub(center);

          resolve({
            mesh: object,
            boundingBox,
            center,
            dimensions: {
              width: boundingBox.max.x - boundingBox.min.x,
              height: boundingBox.max.y - boundingBox.min.y,
              depth: boundingBox.max.z - boundingBox.min.z,
            },
          });
        },
        onProgress,
        (error) => {
          URL.revokeObjectURL(url);
          reject(error);
        }
      );
    });
  }

  public async importCADFile(options: CADImportOptions): Promise<CADObjectData> {
    const { file, onProgress, onError } = options;
    const extension = this.getFileExtension(file.name);

    try {
      let cadData: CADObjectData;

      switch (extension) {
        case 'stl':
          cadData = await this.loadSTL(file, onProgress);
          break;
        case 'obj':
          cadData = await this.loadOBJ(file, onProgress);
          break;
        case 'gltf':
        case 'glb':
          cadData = await this.loadGLTF(file, onProgress);
          break;
        case 'skp':
          const gltfFile = await this.convertSKPtoGLTF();
          cadData = await this.loadGLTF(gltfFile, onProgress);
          break;
        case 'dwg':
          throw new Error(
            'DWG files are not directly supported. Please convert your DWG file to STL, OBJ, or GLTF format before importing.'
          );
        default:
          throw new Error(
            `Unsupported file format: ${extension}. Supported formats are STL, OBJ, GLTF/GLB, and SKP.`
          );
      }

      // Add the mesh to the scene
      options.scene.add(cadData.mesh);

      // Create shape data for Redux store
      const shapeData: ExtendedShapeData = {
        id: `cad-${Date.now()}`,
        type: extension === 'skp' ? 'su' : 'cad',
        properties: {
          dimensions: cadData.dimensions,
          color: 0x808080,
          fileName: file.name,
          fileType: extension,
        },
        position: {
          x: cadData.mesh.position.x,
          y: cadData.mesh.position.y,
          z: cadData.mesh.position.z,
        },
        rotation: {
          x: cadData.mesh.rotation.x,
          y: cadData.mesh.rotation.y,
          z: cadData.mesh.rotation.z,
        },
        scale: {
          x: cadData.mesh.scale.x,
          y: cadData.mesh.scale.y,
          z: cadData.mesh.scale.z,
        },
      };

      // Store in Redux
      store.dispatch(addShape(shapeData));

      return cadData;
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  private async convertSKPtoGLTF(): Promise<File> {
    throw new Error(
      'SKP to GLTF conversion is not implemented yet. Please convert your SketchUp file to GLTF format before importing.'
    );
  }
}

export const cadImporter = CADImporter.getInstance();
export type { CADImportOptions, CADObjectData };
