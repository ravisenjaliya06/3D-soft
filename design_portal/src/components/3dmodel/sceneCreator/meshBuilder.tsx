import * as THREE from 'three';
import { GLBLoader } from '../helper/glbLoader';
import {
  DRAWER_PLANK_TYPES,
  EDGES,
  FLOOR_PLAN_TYPES,
  GEOMETRY,
  GROOVE_TYPE,
  Material,
  MATERIAL_TYPES,
  MeshObjectData,
  PART_TYPES,
} from './interface';
import { convertKeysToCamel, extractColorFromImage } from './utils';
import {
  GROOVE_DEPTH,
  GROOVE_WIDTH,
  GROOVE_END_INSET,
  GROOVE_START_INSET,
  PROTRUSION_DEPTH,
  PROTRUSION_WIDTH,
  DRAWER_GUIDE_WIDTH,
  DRAWER_GUIDE_HEIGHT,
  DRAWER_GUIDE_MULTIPLIER,
  DRAWER_GUIDE_Y_POSITION,
} from './constants';

export class MeshBuilder {
  private meshData: MeshObjectData;
  private mesh: THREE.Mesh | null = null;
  private parentMesh: THREE.Mesh | null = null;

  constructor(data: MeshObjectData) {
    this.meshData = convertKeysToCamel(data);
  }

  /**
   * Set the parent mesh to enable checking for adjacent planks
   */
  public setParentMesh(parent: THREE.Mesh | null): void {
    this.parentMesh = parent;
  }

  /**
   * Check if an edge of the current plank is covered by another plank
   * Returns true if the edge is touching/covered by another plank
   * Uses dynamic geometry-based detection, not name-based
   */
  private _isEdgeCovered(mesh: THREE.Mesh, edge: string, threshold: number = 0.5): boolean {
    if (!this.parentMesh || !(mesh.geometry instanceof THREE.BoxGeometry)) return false;

    // Get current plank's bounding box in world space
    mesh.updateMatrixWorld(true);
    const currentBox = new THREE.Box3().setFromObject(mesh);
    const currentMin = currentBox.min;
    const currentMax = currentBox.max;
    const currentSize = new THREE.Vector3();
    currentBox.getSize(currentSize);

    // Get all sibling planks
    const siblings: THREE.Mesh[] = [];
    this.parentMesh.traverse((child) => {
      if (
        child !== mesh &&
        child instanceof THREE.Mesh &&
        Object.values(PART_TYPES).includes(child.userData.type)
      ) {
        siblings.push(child);
      }
    });

    // Check if any sibling plank covers this edge
    for (const sibling of siblings) {
      if (!(sibling.geometry instanceof THREE.BoxGeometry)) continue;

      sibling.updateMatrixWorld(true);
      const siblingBox = new THREE.Box3().setFromObject(sibling);
      const siblingMin = siblingBox.min;
      const siblingMax = siblingBox.max;
      const siblingSize = new THREE.Vector3();
      siblingBox.getSize(siblingSize);

      // Determine which edge we're checking and calculate the edge area
      let edgeOverlap = false;
      let edgeTouching = false;

      if (edge === EDGES.TOP) {
        // Top edge: check if sibling overlaps in X and Z, and touches from above
        const overlapX =
          siblingMin.x < currentMax.x - threshold && siblingMax.x > currentMin.x + threshold;
        const overlapZ =
          siblingMin.z < currentMax.z - threshold && siblingMax.z > currentMin.z + threshold;
        const touchingY =
          Math.abs(siblingMin.y - currentMax.y) < threshold && siblingMin.y <= currentMax.y;
        edgeOverlap = overlapX && overlapZ;
        edgeTouching = touchingY;
      } else if (edge === EDGES.BOTTOM) {
        // Bottom edge: check if sibling overlaps in X and Z, and touches from below
        const overlapX =
          siblingMin.x < currentMax.x - threshold && siblingMax.x > currentMin.x + threshold;
        const overlapZ =
          siblingMin.z < currentMax.z - threshold && siblingMax.z > currentMin.z + threshold;
        const touchingY =
          Math.abs(siblingMax.y - currentMin.y) < threshold && siblingMax.y >= currentMin.y;
        edgeOverlap = overlapX && overlapZ;
        edgeTouching = touchingY;
      } else if (edge === EDGES.LEFT) {
        // Left edge: check if sibling overlaps in Y and Z, and touches from left
        const overlapY =
          siblingMin.y < currentMax.y - threshold && siblingMax.y > currentMin.y + threshold;
        const overlapZ =
          siblingMin.z < currentMax.z - threshold && siblingMax.z > currentMin.z + threshold;
        const touchingX =
          Math.abs(siblingMax.x - currentMin.x) < threshold && siblingMax.x <= currentMin.x;
        edgeOverlap = overlapY && overlapZ;
        edgeTouching = touchingX;
      } else if (edge === EDGES.RIGHT) {
        // Right edge: check if sibling overlaps in Y and Z, and touches from right
        const overlapY =
          siblingMin.y < currentMax.y - threshold && siblingMax.y > currentMin.y + threshold;
        const overlapZ =
          siblingMin.z < currentMax.z - threshold && siblingMax.z > currentMin.z + threshold;
        const touchingX =
          Math.abs(siblingMin.x - currentMax.x) < threshold && siblingMin.x >= currentMax.x;
        edgeOverlap = overlapY && overlapZ;
        edgeTouching = touchingX;
      } else if (edge === EDGES.FRONT) {
        // Front edge: check if sibling overlaps in X and Y, and touches from front
        const overlapX =
          siblingMin.x < currentMax.x - threshold && siblingMax.x > currentMin.x + threshold;
        const overlapY =
          siblingMin.y < currentMax.y - threshold && siblingMax.y > currentMin.y + threshold;
        const touchingZ =
          Math.abs(siblingMin.z - currentMax.z) < threshold && siblingMin.z <= currentMax.z;
        edgeOverlap = overlapX && overlapY;
        edgeTouching = touchingZ;
      } else if (edge === EDGES.BACK) {
        // Back edge: check if sibling overlaps in X and Y, and touches from back
        const overlapX =
          siblingMin.x < currentMax.x - threshold && siblingMax.x > currentMin.x + threshold;
        const overlapY =
          siblingMin.y < currentMax.y - threshold && siblingMax.y > currentMin.y + threshold;
        const touchingZ =
          Math.abs(siblingMax.z - currentMin.z) < threshold && siblingMax.z >= currentMin.z;
        edgeOverlap = overlapX && overlapY;
        edgeTouching = touchingZ;
      }

      if (edgeOverlap && edgeTouching) {
        return true;
      }
    }

    return false;
  }

  private _createTexture(materialData: Material): THREE.Texture | null {
    let texture: THREE.Texture | null = null;
    materialData?.textures?.forEach((textureData) => {
      texture = new THREE.TextureLoader().load(
        `${process.env.NEXT_PUBLIC_PUBLIC_API}` + textureData.textureDetail.image || ''
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(2, 2);
      texture.center.set(0, 0);
      texture.offset.set(0, 0);
    });
    return texture;
  }

  private _createTextureMaterial(materialData: Material): THREE.MeshStandardMaterial {
    const texture = this._createTexture(materialData);
    if (!texture) return new THREE.MeshStandardMaterial({ visible: false });
    return new THREE.MeshStandardMaterial({
      map: texture,
      wireframe: false,
    });
  }

  private _getMaterial(): THREE.Material {
    let createdMaterial: THREE.Material | null = null;

    const material = this.meshData.material;
    if (!material) return new THREE.MeshStandardMaterial({ visible: false });

    const materialArray = Array.isArray(material) ? material : [material];

    materialArray.forEach((materialData) => {
      if (materialData.type === MATERIAL_TYPES.PANEL_STOCK) {
        createdMaterial = this._createTextureMaterial(materialData);
      } else if (this.meshData.type === FLOOR_PLAN_TYPES.WALL) {
        createdMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
        });
      }
    });

    return createdMaterial || new THREE.MeshStandardMaterial({ visible: false });
  }

  private _createBoxGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(
      this.meshData.dimensions?.width || 0,
      this.meshData.dimensions?.height || 0,
      this.meshData.dimensions?.depth || 0
    );
  }

  // NOTE: Right now, we only support square shapes. In the future, we’ll add more shape options when we need to create custom shapes.
  private _createShape(): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.lineTo(0, 1);
    shape.closePath();
    return shape;
  }

  private _createExtrudeGeometry(): THREE.ExtrudeGeometry {
    const shape = this._createShape();

    // NOTE: Right now, it only has two external properties (depth and bevelEnabled). Later on, we’ll add more properties when we need to support custom shapes.
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: this.meshData.dimensions?.depth || 0,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private _getGeometry() {
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        return this._createBoxGeometry();
      case GEOMETRY.EXTRUDE_GEOMETRY:
        return this._createExtrudeGeometry();
      default:
        return this._createBoxGeometry();
    }
  }

  private _setPosition(mesh: THREE.Mesh) {
    if (!this.meshData.position) return;
    mesh.position.set(this.meshData.position.x, this.meshData.position.y, this.meshData.position.z);
  }

  private _setRotation(mesh: THREE.Mesh) {
    if (!this.meshData.rotation) return;
    mesh.rotation.set(this.meshData.rotation.x, this.meshData.rotation.y, this.meshData.rotation.z);
  }

  private _setScale(mesh: THREE.Mesh) {
    if (!this.meshData.scale) return;
    mesh.scale.set(
      this.meshData.scale.x || 0.01,
      this.meshData.scale.y || 0.01,
      this.meshData.scale.z || 0.01
    );
  }

  private _setUserData(mesh: THREE.Mesh) {
    mesh.userData.type = this.meshData.type;
    mesh.userData.objectId = this.meshData.id;
    mesh.userData.isMain = this.meshData.isMain;
    mesh.userData.openDirection = this.meshData.openDirection;
    mesh.userData.drawerType = this.meshData.drawerType;
  }

  private _setName(mesh: THREE.Mesh) {
    mesh.name = this.meshData.name;
  }

  private _placeHandleOnMesh(handle: THREE.Object3D, createdMesh: THREE.Mesh, materialProps: any) {
    const placeHandle = () => {
      let targetMesh = createdMesh;
      let attachParent = createdMesh;

      if (createdMesh.userData.type === PART_TYPES.DRAWER && createdMesh.userData.isMain) {
        const drawerFace = createdMesh.children.find(
          (child) => child instanceof THREE.Mesh && child.name === DRAWER_PLANK_TYPES.DRAWER_FACE
        ) as THREE.Mesh | undefined;

        if (drawerFace) {
          targetMesh = drawerFace;
          attachParent = createdMesh;
        }
      }

      targetMesh.geometry.computeBoundingBox();
      const bBox = targetMesh.geometry.boundingBox;
      if (!bBox) return;

      const size = new THREE.Vector3();
      bBox.getSize(size);

      const horizontalInset = materialProps.horizontalInset ?? 0;
      const verticalInset = materialProps.verticalInset ?? 0;

      const localPos = new THREE.Vector3(
        bBox.min.x + horizontalInset,
        bBox.max.y - verticalInset,
        bBox.max.z
      );

      const worldPos = targetMesh.localToWorld(localPos.clone());
      const attachParentLocal = attachParent.worldToLocal(worldPos.clone());

      handle.position.copy(attachParentLocal);
      handle.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      attachParent.add(handle);
    };

    if (createdMesh.userData.type === PART_TYPES.DRAWER && createdMesh.userData.isMain) {
      requestAnimationFrame(() => {
        requestAnimationFrame(placeHandle);
      });
    } else {
      placeHandle();
    }
  }

  private async _loadHandle(mesh: THREE.Mesh, materialProps: any) {
    const url = materialProps.modelFile;
    const backendUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`
      ? `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`
      : '/glb/door_handle.glb';

    const handleModel = await GLBLoader(backendUrl, mesh.name, {
      width: materialProps.width ? materialProps.width : 5,
      height: materialProps.height ? materialProps.height : 5,
      depth: materialProps.depth ? materialProps.depth : 25,
    });

    handleModel.name = `Handle_for_${mesh.name}`;
    handleModel.userData.type = 'handle';
    handleModel.userData.objectId = crypto.randomUUID();

    this._placeHandleOnMesh(handleModel, mesh, materialProps);
  }

  // NOTE: This code use to load drawer guides
  // private async _loadDrawerGuide(mesh: THREE.Mesh, materialProps: any) {
  //   // Only load guides for drawer groups (isMain: true)
  //   if (mesh.userData.type !== PART_TYPES.DRAWER || !mesh.userData.isMain) return;

  //   const placeGuide = async () => {
  //     const url = materialProps.modelFile;
  //     if (!url) return;

  //     const backendUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`;
  //     const guideType = materialProps.guideType || materialProps.guide_type || 'Side Mount';
  //     const sideClearance = (materialProps.sideClearance || materialProps.side_clearance || 12.7) / 1000;
  //     const guideLength = (materialProps.length || 1);

  //     if (guideType === 'Side Mount') {
  //       mesh.updateMatrixWorld(true);

  //       // Find left and right planks dynamically
  //       let leftPlank: THREE.Mesh | null = null;
  //       let rightPlank: THREE.Mesh | null = null;

  //       mesh.traverse((child) => {
  //         if (child instanceof THREE.Mesh) {
  //           const plankName = child.name;
  //           if (plankName === 'DRAWER_LEFT_PLANK' || plankName === DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK) {
  //             leftPlank = child;
  //           } else if (plankName === 'DRAWER_RIGHT_PLANK' || plankName === DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK) {
  //             rightPlank = child;
  //           }
  //         }
  //       });

  //       // Calculate guide dimensions based on plank dimensions
  //       let guideWidth = DRAWER_GUIDE_WIDTH; // Default width (thickness)
  //       let guideHeight = DRAWER_GUIDE_HEIGHT; // Default height
  //       let guideDepth = guideLength; // Default depth

  //       // Calculate positions
  //       let leftGuideX: number;
  //       let rightGuideX: number;
  //       let guideY: number;
  //       let guideZ: number;

  //       if (leftPlank !== null && rightPlank !== null) {
  //         // Update matrices to get accurate bounding boxes
  //         (leftPlank as THREE.Mesh).updateMatrixWorld(true);
  //         (rightPlank as THREE.Mesh).updateMatrixWorld(true);

  //         // Get bounding boxes of planks
  //         const leftPlankBox = new THREE.Box3().setFromObject(leftPlank);
  //         const rightPlankBox = new THREE.Box3().setFromObject(rightPlank);

  //         const leftPlankSize = new THREE.Vector3();
  //         const rightPlankSize = new THREE.Vector3();
  //         leftPlankBox.getSize(leftPlankSize);
  //         rightPlankBox.getSize(rightPlankSize);

  //         // Calculate guide dimensions from plank dimensions
  //         // Height: Match plank height
  //         guideHeight = (leftPlankSize.y + rightPlankSize.y) / 2;
  //         // Depth: Match plank depth (or use guideLength if specified)
  //         guideDepth = (leftPlankSize.z + rightPlankSize.z) / 2;
  //         // Width: Keep guide thickness (small width)
  //         guideWidth = DRAWER_GUIDE_WIDTH;

  //         // Get plank positions in drawer's local space
  //         const leftPlankWorldPos = new THREE.Vector3();
  //         const rightPlankWorldPos = new THREE.Vector3();
  //         (leftPlank as THREE.Mesh).getWorldPosition(leftPlankWorldPos);
  //         (rightPlank as THREE.Mesh).getWorldPosition(rightPlankWorldPos);

  //         const leftPlankLocalPos = mesh.worldToLocal(leftPlankWorldPos.clone());
  //         const rightPlankLocalPos = mesh.worldToLocal(rightPlankWorldPos.clone());

  //         // Get plank bounding boxes in drawer's local space for accurate positioning
  //         const leftPlankBoxLocal = new THREE.Box3();
  //         const rightPlankBoxLocal = new THREE.Box3();
          
  //         (leftPlank as THREE.Mesh).traverse((child: THREE.Object3D) => {
  //           if (child instanceof THREE.Mesh && child.geometry) {
  //             child.geometry.computeBoundingBox();
  //             if (child.geometry.boundingBox) {
  //               const worldMin = child.localToWorld(child.geometry.boundingBox.min.clone());
  //               const worldMax = child.localToWorld(child.geometry.boundingBox.max.clone());
  //               const localMin = mesh.worldToLocal(worldMin);
  //               const localMax = mesh.worldToLocal(worldMax);
  //               leftPlankBoxLocal.expandByPoint(localMin);
  //               leftPlankBoxLocal.expandByPoint(localMax);
  //             }
  //           }
  //         });

  //         (rightPlank as THREE.Mesh).traverse((child: THREE.Object3D) => {
  //           if (child instanceof THREE.Mesh && child.geometry) {
  //             child.geometry.computeBoundingBox();
  //             if (child.geometry.boundingBox) {
  //               const worldMin = child.localToWorld(child.geometry.boundingBox.min.clone());
  //               const worldMax = child.localToWorld(child.geometry.boundingBox.max.clone());
  //               const localMin = mesh.worldToLocal(worldMin);
  //               const localMax = mesh.worldToLocal(worldMax);
  //               rightPlankBoxLocal.expandByPoint(localMin);
  //               rightPlankBoxLocal.expandByPoint(localMax);
  //             }
  //           }
  //         });

  //         // Position guides based on plank positions
  //         // X: Position on inner side of planks with clearance
  //         leftGuideX = leftPlankLocalPos.x + sideClearance;
  //         rightGuideX = rightPlankLocalPos.x - sideClearance;
          
  //         // Y: Center Y of planks
  //         guideY = (leftPlankBoxLocal.max.y + leftPlankBoxLocal.min.y) / 2;
          
  //         // Z: Center Z of planks
  //         guideZ = (leftPlankBoxLocal.max.z + leftPlankBoxLocal.min.z) / 2;
  //       } else {
  //         // Fallback to drawer bounding box if planks not found
  //         console.warn('Left or right plank not found, using drawer bounding box');
  //         const drawerBox = new THREE.Box3().setFromObject(mesh);
  //         const drawerMinWorld = drawerBox.min.clone();
  //         const drawerMaxWorld = drawerBox.max.clone();
  //         const drawerMinLocal = mesh.worldToLocal(drawerMinWorld);
  //         const drawerMaxLocal = mesh.worldToLocal(drawerMaxWorld);
          
  //         const drawerCenterLocal = new THREE.Vector3();
  //         drawerCenterLocal.addVectors(drawerMinLocal, drawerMaxLocal);
  //         drawerCenterLocal.multiplyScalar(0.5);
          
  //         leftGuideX = drawerMinLocal.x + sideClearance;
  //         rightGuideX = drawerMaxLocal.x - sideClearance;
  //         guideY = drawerCenterLocal.y;
  //         guideZ = (drawerMinLocal.z + drawerMaxLocal.z) * DRAWER_GUIDE_MULTIPLIER;
  //       }

  //       // Load GLB with calculated dimensions based on plank sizes
  //       const guideModelGroup = await GLBLoader(backendUrl, `DrawerGuide_${mesh.name}`, {
  //         width: 1,
  //         height: 1,
  //         depth: 1,
  //       });

  //       const extractMeshFromGroup = (object: THREE.Object3D): THREE.Mesh | null => {
  //         if (object instanceof THREE.Mesh) {
  //           return object;
  //         }
  //         for (const child of object.children) {
  //           const mesh = extractMeshFromGroup(child);
  //           if (mesh) return mesh;
  //         }
  //         return null;
  //       };

  //       const baseMesh = extractMeshFromGroup(guideModelGroup);
  //       if (!baseMesh) {
  //         console.warn('Could not extract mesh from drawer guide model');
  //         return;
  //       }

  //       const createGuideMesh = (side: 'left' | 'right'): THREE.Mesh => {
  //         const guideMesh = baseMesh.clone();
  //         guideMesh.name = `DrawerGuide_${side}_${mesh.name}`;
  //         guideMesh.userData.type = 'drawerGuide';
  //         guideMesh.userData.side = side;
  //         guideMesh.userData.objectId = `${mesh.userData.objectId}_guide_${side}`;
  //         return guideMesh;
  //       };
        
  //       const leftGuide = createGuideMesh('left');
  //       leftGuide.rotation.set(Math.PI / 2, 0, 0);
  //       leftGuide.position.set(leftGuideX, guideY, guideZ);
  //       mesh.add(leftGuide);

  //       const rightGuide = createGuideMesh('right');
  //       rightGuide.rotation.set(Math.PI / 2, Math.PI, 0);
  //       rightGuide.position.set(rightGuideX, guideY, guideZ);
  //       mesh.add(rightGuide);
  //     }
  //   };

  //   // Wait for drawer structure to be complete (similar to handles)
  //   if (mesh.userData.type === PART_TYPES.DRAWER && mesh.userData.isMain) {
  //     requestAnimationFrame(() => {
  //       requestAnimationFrame(() => {
  //         placeGuide().catch((error) => {
  //           console.warn('Failed to load drawer guide:', error);
  //         });
  //       });
  //     });
  //   } else {
  //     await placeGuide();
  //   }
  // }

  /**
   * Get the plank's texture image URL from its material
   */
  private _getPlankTextureUrl(): string | null {
    if (!this.meshData.material) return null;

    const materialArray = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : [this.meshData.material];

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

  private async _createBandingMaterial(): Promise<THREE.MeshStandardMaterial> {
    const plankTextureUrl = this._getPlankTextureUrl();

    if (plankTextureUrl) {
      try {
        const color = await extractColorFromImage(plankTextureUrl);
        return new THREE.MeshStandardMaterial({
          color: color,
          wireframe: false,
        });
      } catch (error) {
        console.warn('Failed to extract color from plank texture, using default:', error);
      }
    }

    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      wireframe: false,
    });
  }

  /**
   * Helper function to create a banding mesh on a specific edge
   * Banding sits ON the plank surface, not outside
   */
  private _createBandingMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    sideName: string,
    bandingMaterial: THREE.MeshStandardMaterial
  ): void {
    if (this._isEdgeCovered(mesh, edge)) return;

    const banding = new THREE.Mesh(geometry, bandingMaterial);
    banding.position.copy(position);
    banding.name = `Banding_${sideName}_${mesh.name}`;
    banding.userData.type = 'banding';
    banding.userData.edge = edge;
    banding.userData.objectId = `${mesh.userData.objectId}_banding_${sideName.toLowerCase()}`;
    mesh.add(banding);
  }

  /**
   * Remove all banding meshes from a plank
   */
  public removeAllBanding(mesh: THREE.Mesh): void {
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
  }

  /**
   * Remove banding from a specific edge
   */
  public removeBandingOnEdge(mesh: THREE.Mesh, edge: string): void {
    const toRemove: THREE.Object3D[] = [];
    mesh.children.forEach((child) => {
      if (child.userData.type === 'banding' && child.userData.edge === edge) {
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
  }

  /**
   * Update banding positions and sizes when plank dimensions change
   */
  public async updateBanding(
    mesh: THREE.Mesh
  ): Promise<void> {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const bandingState = this.meshData.edgeBanding;
    if (!bandingState) return;

    // Remove all existing banding
    this.removeAllBanding(mesh);

    // Recreate banding with new dimensions
    const materialData = this.meshData.material;
    if (!materialData) return;

    const materialArray = Array.isArray(materialData) ? materialData : [materialData];
    const bandingMaterialData = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);

    if (bandingMaterialData) {
      await this._createBandingOnPlank(mesh, bandingMaterialData, bandingState);
    }
  }

  /**
   * Update grooving positions and sizes when plank dimensions change
   */
  public updateGrooving(mesh: THREE.Mesh): void {
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    // Remove all existing grooving
    this.removeAllGrooving(mesh);

    // Update meshData dimensions from the actual mesh geometry
    if (mesh.geometry instanceof THREE.BoxGeometry) {
      const params = mesh.geometry.parameters;
      this.meshData.dimensions = {
        width: params.width,
        height: params.height,
        depth: params.depth,
      };
    }

    // Recreate grooving with new dimensions
    this.mesh = mesh;
    this._createGrooving();
  }

  private async _createBandingOnPlank(
    mesh: THREE.Mesh,
    materialData: Material,
    bandingState?: {
      top?: boolean;
      bottom?: boolean;
      left?: boolean;
      right?: boolean;
      front?: boolean;
      back?: boolean;
    }
  ) {
    // Check if this is a plank
    const isPlank = Object.values(PART_TYPES).includes(mesh.userData.type);

    if (!isPlank) return;
    if (mesh.userData.type === PART_TYPES.DRAWER && mesh.userData.isMain === true) return;

    const bandingThickness = materialData.properties?.thickness || 1.5;

    // Get plank dimensions
    if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const { width, height, depth } = mesh.geometry.parameters;

    // Create banding material (async - extracts color from plank texture)
    const bandingMaterial = await this._createBandingMaterial();

    const dimensions = [
      { value: width, name: 'width', axis: 'x' },
      { value: height, name: 'height', axis: 'y' },
      { value: depth, name: 'depth', axis: 'z' },
    ].sort((a, b) => a.value - b.value);

    const thicknessAxis = dimensions[0].axis;

    // Determine which faces are the main faces (with texture) vs edges dynamically
    let isVerticalPlank = false;
    let isHorizontalPlank = false;
    let isBackPlank = false;

    // Dynamic detection: smallest dimension determines the textured faces
    if (thicknessAxis === 'x') {
      isVerticalPlank = true;
    } else if (thicknessAxis === 'y') {
      isHorizontalPlank = true;
    } else if (thicknessAxis === 'z') {
      isBackPlank = true;
    } else {
      isVerticalPlank = true;
    }

    // Use bandingState if provided, otherwise check all edges
    const shouldCreateBanding = (edge: string): boolean => {
      if (bandingState) {
        const edgeMap: Record<string, keyof typeof bandingState> = {
          [EDGES.TOP]: 'top',
          [EDGES.BOTTOM]: 'bottom',
          [EDGES.LEFT]: 'left',
          [EDGES.RIGHT]: 'right',
          [EDGES.FRONT]: 'front',
          [EDGES.BACK]: 'back',
        };
        const stateKey = edgeMap[edge];
        return stateKey ? (bandingState[stateKey] ?? false) : false;
      }
      // Default behavior: create banding if edge is not covered
      return !this._isEdgeCovered(mesh, edge);
    };

    // Create banding only on specified edges (from bandingState) or visible/exposed edges
    // For vertical planks: create banding on left, right, front, back sides
    // where: front = top edge, back = bottom edge, right = front edge, left = back edge
    if (isVerticalPlank) {
      // Top edge: banding sits ON the top surface (not outside)
      if (shouldCreateBanding(EDGES.TOP)) {
        this._createBandingMesh(
          mesh,
          EDGES.TOP,
          new THREE.BoxGeometry(width, bandingThickness, depth),
          new THREE.Vector3(0, height / 2 - bandingThickness / 2, 0),
          EDGES.TOP,
          bandingMaterial
        );
      }

      // Bottom edge: banding sits ON the bottom surface
      if (shouldCreateBanding(EDGES.BOTTOM)) {
        this._createBandingMesh(
          mesh,
          EDGES.BOTTOM,
          new THREE.BoxGeometry(width, bandingThickness, depth),
          new THREE.Vector3(0, -height / 2 + bandingThickness / 2, 0),
          EDGES.BOTTOM,
          bandingMaterial
        );
      }

      // Front edge: banding sits ON the front surface
      if (shouldCreateBanding(EDGES.FRONT)) {
        this._createBandingMesh(
          mesh,
          EDGES.FRONT,
          new THREE.BoxGeometry(width, height, bandingThickness),
          new THREE.Vector3(0, 0, depth / 2 - bandingThickness / 2),
          EDGES.FRONT,
          bandingMaterial
        );
      }

      // Back edge: banding sits ON the back surface
      if (shouldCreateBanding(EDGES.BACK)) {
        this._createBandingMesh(
          mesh,
          EDGES.BACK,
          new THREE.BoxGeometry(width, height, bandingThickness),
          new THREE.Vector3(0, 0, -depth / 2 + bandingThickness / 2),
          EDGES.BACK,
          bandingMaterial
        );
      }
    } else if (isHorizontalPlank) {
      // Horizontal plank: banding on Left, Right, Front, Back faces
      if (shouldCreateBanding(EDGES.LEFT)) {
        this._createBandingMesh(
          mesh,
          EDGES.LEFT,
          new THREE.BoxGeometry(bandingThickness, height, depth),
          new THREE.Vector3(-width / 2 + bandingThickness / 2, 0, 0),
          EDGES.LEFT,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.RIGHT)) {
        this._createBandingMesh(
          mesh,
          EDGES.RIGHT,
          new THREE.BoxGeometry(bandingThickness, height, depth),
          new THREE.Vector3(width / 2 - bandingThickness / 2, 0, 0),
          EDGES.RIGHT,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.FRONT)) {
        this._createBandingMesh(
          mesh,
          EDGES.FRONT,
          new THREE.BoxGeometry(width, height, bandingThickness),
          new THREE.Vector3(0, 0, depth / 2 - bandingThickness / 2),
          EDGES.FRONT,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.BACK)) {
        this._createBandingMesh(
          mesh,
          EDGES.BACK,
          new THREE.BoxGeometry(width, height, bandingThickness),
          new THREE.Vector3(0, 0, -depth / 2 + bandingThickness / 2),
          EDGES.BACK,
          bandingMaterial
        );
      }
    } else if (isBackPlank) {
      // Back plank: banding on Top, Bottom, Left, Right faces
      if (shouldCreateBanding(EDGES.TOP)) {
        this._createBandingMesh(
          mesh,
          EDGES.TOP,
          new THREE.BoxGeometry(width, bandingThickness, depth),
          new THREE.Vector3(0, height / 2 - bandingThickness / 2, 0),
          EDGES.TOP,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.BOTTOM)) {
        this._createBandingMesh(
          mesh,
          EDGES.BOTTOM,
          new THREE.BoxGeometry(width, bandingThickness, depth),
          new THREE.Vector3(0, -height / 2 + bandingThickness / 2, 0),
          EDGES.BOTTOM,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.LEFT)) {
        this._createBandingMesh(
          mesh,
          EDGES.LEFT,
          new THREE.BoxGeometry(bandingThickness, height, depth),
          new THREE.Vector3(-width / 2 + bandingThickness / 2, 0, 0),
          EDGES.LEFT,
          bandingMaterial
        );
      }

      if (shouldCreateBanding(EDGES.RIGHT)) {
        this._createBandingMesh(
          mesh,
          EDGES.RIGHT,
          new THREE.BoxGeometry(bandingThickness, height, depth),
          new THREE.Vector3(width / 2 - bandingThickness / 2, 0, 0),
          EDGES.RIGHT,
          bandingMaterial
        );
      }
    }
  }

  /**
   * Apply banding material from parent to this plank mesh
   * This is used when the parent (e.g., cupboard) has banding material
   * that should be applied to all child planks
   */
  public async applyParentBandingMaterial(parentBandingMaterial: Material): Promise<void> {
    if (!this.mesh) return;
    await this._createBandingOnPlank(this.mesh, parentBandingMaterial, this.meshData.edgeBanding);
  }

  /**
   * Create or update banding based on edgeBanding state
   */
  public async applyBandingFromState(
    mesh?: THREE.Mesh,
    bandingMaterial?: Material,
    edgeBandingState?: {
      top?: boolean;
      bottom?: boolean;
      left?: boolean;
      right?: boolean;
      front?: boolean;
      back?: boolean;
    }
  ): Promise<void> {
    const targetMesh = mesh || this.mesh;
    if (!targetMesh) return;

    // Use provided banding material or find it from meshData
    let bandingMaterialData = bandingMaterial;

    if (!bandingMaterialData) {
      const materialArray = Array.isArray(this.meshData.material)
        ? this.meshData.material
        : this.meshData.material
          ? [this.meshData.material]
          : [];

      bandingMaterialData = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);
    }

    // Use provided edgeBandingState or fall back to meshData
    const bandingState = edgeBandingState || this.meshData.edgeBanding;

    // Check if we have banding material and at least one edge is enabled
    if (bandingMaterialData && bandingState) {
      const hasAnyBanding =
        bandingState.top ||
        bandingState.bottom ||
        bandingState.left ||
        bandingState.right ||
        bandingState.front ||
        bandingState.back;

      if (hasAnyBanding) {
        // Remove all existing banding first to avoid duplicates
        this.removeAllBanding(targetMesh);
        // Then recreate based on current state
        await this._createBandingOnPlank(targetMesh, bandingMaterialData, bandingState);
      } else {
        // No edges enabled, remove all banding
        this.removeAllBanding(targetMesh);
      }
    }
  }

  private _handleMaterial() {
    if (!this.mesh) return;

    const materialArray = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : [this.meshData.material];

    materialArray.forEach((materialData) => {
      if (materialData?.type === MATERIAL_TYPES.PULL) {
        this._loadHandle(this.mesh!, materialData.properties);
      } else if (materialData?.type === MATERIAL_TYPES.BANDING) {
        this._createBandingOnPlank(this.mesh!, materialData).catch((error) => {
          console.warn('Failed to create banding:', error);
        });
      } else if (materialData?.type === MATERIAL_TYPES.DRAWER_GUIDE) {
        // this._loadDrawerGuide(this.mesh!, materialData.properties);
      }
    });
  }

  public createMesh(): THREE.Mesh {
    const geometry = this._getGeometry();
    const material = this._getMaterial();

    const mesh = new THREE.Mesh(
      geometry,
      material ?? new THREE.MeshBasicMaterial({ visible: false })
    );
    this.mesh = mesh;

    this._setName(mesh);
    this._setPosition(mesh);
    this._setRotation(mesh);
    this._setScale(mesh);
    this._setUserData(mesh);
    this._handleMaterial();
    this._createGrooving();
    return mesh;
  }

  public updateMesh(
    mesh: THREE.Mesh,
    changes: Partial<MeshObjectData>,
    oldMaterial?: MeshObjectData['material']
  ) {
    this._setUserData(mesh);
    if (changes.position) {
      this._setPosition(mesh);
    }
    if (changes.rotation) {
      this._setRotation(mesh);
    }
    if (changes.scale) {
      this._setScale(mesh);
    }
    if (changes.material) {
      if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
      const newMaterial = changes.material;
      const oldMaterialArray = Array.isArray(oldMaterial)
        ? oldMaterial
        : oldMaterial
          ? [oldMaterial]
          : [];
      const newMaterialArray = Array.isArray(newMaterial)
        ? newMaterial
        : newMaterial
          ? [newMaterial]
          : [];

      if (oldMaterialArray.length > 0 && newMaterialArray.length > 0) {
        const oldMat = oldMaterialArray[0];
        const newMat = newMaterialArray[0];
        if (
          oldMat.type === MATERIAL_TYPES.PANEL_STOCK &&
          newMat.type === MATERIAL_TYPES.PANEL_STOCK &&
          oldMat.textures?.[0]?.textureDetail?.image === newMat.textures?.[0]?.textureDetail?.image
        ) {
          mesh.material.dispose();
          mesh.material = this._getMaterial();
        } else {
          mesh.material.dispose();
          mesh.material = this._getMaterial();
        }
      } else {
        mesh.material.dispose();
        mesh.material = this._getMaterial();
      }
    }
    if (changes.dimensions) {
      mesh.geometry.dispose();
      mesh.geometry = this._getGeometry();
      this.updateGrooving(mesh);
    }
  }

  /**
   * Remove all grooving meshes from a plank
   */
  public removeAllGrooving(mesh: THREE.Mesh): void {
    const toRemove: THREE.Object3D[] = [];
    mesh.children.forEach((child) => {
      if (child.userData.type === GROOVE_TYPE.GROOVE || child.userData.type === GROOVE_TYPE.PROTRUSION) {
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
  }

  /**
   * Create grooving system: grooves on side planks (female) and protrusions on back plank (male)
   */
  private _createGrooving(): void {
    if (!this.mesh) return;

    // Check if this is a plank
    const isPlank = Object.values(PART_TYPES).includes(this.mesh.userData.type);
    if (!isPlank) {
      return;
    }

    if (!(this.mesh.geometry instanceof THREE.BoxGeometry)) {
      console.log('[Grooving] Not a BoxGeometry');
      return;
    }

    // Check both meshData.name and mesh.name (mesh.name is set after _setName)
    const plankName = (this.meshData.name || this.mesh.name || '').toUpperCase();
    const { width, height, depth } = this.mesh.geometry.parameters;

    // Only create grooving for BACK_PLANK
    if (plankName !== 'BACK_PLANK') {
      return;
    }

    // Get plank material
    const plankMaterial = this.mesh.material instanceof THREE.Material
      ? this.mesh.material.clone()
      : Array.isArray(this.mesh.material) && this.mesh.material.length > 0
        ? this.mesh.material[0].clone()
        : new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Back plank: create both grooves (female) and protrusions (male)
    console.log('[Grooving] Creating grooves and protrusions for back plank');
    
    // Create grooves (female parts) on back plank edges
    // Groove begins 25mm inside and ends 6mm from the edge
    const grooveMaterial = plankMaterial.clone();
    // Make groove slightly darker to show depth
    if (grooveMaterial instanceof THREE.MeshStandardMaterial) {
      const color = new THREE.Color();
      if (grooveMaterial.color) {
        color.copy(grooveMaterial.color);
        color.multiplyScalar(0.7); // Slightly darker for depth effect
        grooveMaterial.color = color;
      }
    }
    grooveMaterial.visible = true;
    if (grooveMaterial instanceof THREE.MeshStandardMaterial) {
      grooveMaterial.transparent = false;
    }

    // Calculate groove dimensions and positions
    // Groove begins 25mm inside and ends 6mm from the edge
    
    // For top/bottom edges: groove runs horizontally along width
    // Groove starts 25mm from left edge, ends 6mm from right edge
    const topBottomGrooveLength = width - GROOVE_START_INSET - GROOVE_END_INSET; // width - 25 - 6
    const topBottomGrooveCenterX = ((-width / 2 + GROOVE_START_INSET) + (width / 2 - GROOVE_END_INSET)) / 2;
    const topBottomGrooveCenterY_top = height / 2 - GROOVE_WIDTH / 2; // Slightly inside top edge
    const topBottomGrooveCenterY_bottom = -height / 2 + GROOVE_WIDTH / 2; // Slightly inside bottom edge

    // For left/right edges: groove runs vertically along height
    // Groove starts 25mm from bottom edge, ends 6mm from top edge
    const leftRightGrooveLength = height - GROOVE_START_INSET - GROOVE_END_INSET; // height - 25 - 6
    const leftRightGrooveCenterX_left = -width / 2 + GROOVE_WIDTH / 2; // Slightly inside left edge
    const leftRightGrooveCenterX_right = width / 2 - GROOVE_WIDTH / 2; // Slightly inside right edge
    const leftRightGrooveCenterY = ((-height / 2 + GROOVE_START_INSET) + (height / 2 - GROOVE_END_INSET)) / 2;

    // Top groove - begins 25mm inside, ends 6mm from edge
    this._createGrooveMesh(
      this.mesh,
      EDGES.TOP,
      new THREE.BoxGeometry(topBottomGrooveLength, GROOVE_WIDTH, GROOVE_DEPTH),
      new THREE.Vector3(topBottomGrooveCenterX, topBottomGrooveCenterY_top, 0),
      grooveMaterial
    );

    // Bottom groove - begins 25mm inside, ends 6mm from edge
    this._createGrooveMesh(
      this.mesh,
      EDGES.BOTTOM,
      new THREE.BoxGeometry(topBottomGrooveLength, GROOVE_WIDTH, GROOVE_DEPTH),
      new THREE.Vector3(topBottomGrooveCenterX, topBottomGrooveCenterY_bottom, 0),
      grooveMaterial
    );

    // Left groove - begins 25mm inside, ends 6mm from edge
    this._createGrooveMesh(
      this.mesh,
      EDGES.LEFT,
      new THREE.BoxGeometry(GROOVE_WIDTH, leftRightGrooveLength, GROOVE_DEPTH),
      new THREE.Vector3(leftRightGrooveCenterX_left, leftRightGrooveCenterY, 0),
      grooveMaterial
    );

    // Right groove - begins 25mm inside, ends 6mm from edge
    this._createGrooveMesh(
      this.mesh,
      EDGES.RIGHT,
      new THREE.BoxGeometry(GROOVE_WIDTH, leftRightGrooveLength, GROOVE_DEPTH),
      new THREE.Vector3(leftRightGrooveCenterX_right, leftRightGrooveCenterY, 0),
      grooveMaterial
    );
    
    // Create protrusions (male parts) on back plank edges - extending outward
    const protrusionMaterial = plankMaterial.clone();
    // Keep original material color for protrusions
    protrusionMaterial.visible = true;
    if (protrusionMaterial instanceof THREE.MeshStandardMaterial) {
      protrusionMaterial.transparent = false;
    }
    
    this._createProtrusionMesh(
      this.mesh,
      EDGES.TOP,
      new THREE.BoxGeometry(width, PROTRUSION_WIDTH, PROTRUSION_DEPTH),
      new THREE.Vector3(0, height / 2 + PROTRUSION_WIDTH / 2, 0),
      protrusionMaterial
    );
    this._createProtrusionMesh(
      this.mesh,
      EDGES.BOTTOM,
      new THREE.BoxGeometry(width, PROTRUSION_WIDTH, PROTRUSION_DEPTH),
      new THREE.Vector3(0, -height / 2 - PROTRUSION_WIDTH / 2, 0),
      protrusionMaterial
    );
    this._createProtrusionMesh(
      this.mesh,
      EDGES.LEFT,
      new THREE.BoxGeometry(PROTRUSION_WIDTH, height, PROTRUSION_DEPTH),
      new THREE.Vector3(-width / 2 - PROTRUSION_WIDTH / 2, 0, 0),
      protrusionMaterial
    );
    this._createProtrusionMesh(
      this.mesh,
      EDGES.RIGHT,
      new THREE.BoxGeometry(PROTRUSION_WIDTH, height, PROTRUSION_DEPTH),
      new THREE.Vector3(width / 2 + PROTRUSION_WIDTH / 2, 0, 0),
      protrusionMaterial
    );
  }

  /**
   * Helper function to create a groove mesh (female part) on a plank edge
   */
  private _createGrooveMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    material: THREE.Material
  ): void {
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
  }

  /**
   * Helper function to create a protrusion mesh (male part) on back plank edge
   */
  private _createProtrusionMesh(
    mesh: THREE.Mesh,
    edge: string,
    geometry: THREE.BoxGeometry,
    position: THREE.Vector3,
    material: THREE.Material
  ): void {
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
  }

  private _updateTextureRotation(mesh: THREE.Mesh, rotationDegrees?: number): void {
    const updateTextureRotation = (material: THREE.Material) => {
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        // For seamless tiling, rotate around (0, 0) not (0.5, 0.5)
        material.map.center.set(0, 0);

        // Ensure proper wrapping
        material.map.wrapS = THREE.RepeatWrapping;
        material.map.wrapT = THREE.RepeatWrapping;

        if (rotationDegrees !== undefined) {
          const rotationRad = THREE.MathUtils.degToRad(rotationDegrees);
          material.map.rotation = rotationRad;

          // Adjust offset to compensate for rotation and maintain seamless tiling
          // This prevents the zigzag pattern by aligning the rotated texture properly
          const cos = Math.cos(rotationRad);
          const sin = Math.sin(rotationRad);
          const offsetX = (1 - cos) * 0.5 - sin * 0.5;
          const offsetY = (1 - cos) * 0.5 + sin * 0.5;
          material.map.offset.set(offsetX, offsetY);
        } else {
          material.map.rotation = 0;
          material.map.offset.set(0, 0);
        }
        material.map.needsUpdate = true;
        material.needsUpdate = true;
      }
    };

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(updateTextureRotation);
    } else {
      updateTextureRotation(mesh.material);
    }

    // Also update children if this is a main mesh
    if (mesh.userData.isMain) {
      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach(updateTextureRotation);
          } else {
            updateTextureRotation(child.material);
          }
        }
      });
    }
  }
}
