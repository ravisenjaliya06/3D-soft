import * as THREE from 'three';
import { GLBLoader } from '../helper/glbLoader';
import { store } from '../store';
import {
  DRAWER_PLANK_TYPES,
  FLOOR_PLAN_TYPES,
  GEOMETRY,
  Material,
  MATERIAL_TYPES,
  MeshObjectData,
  PART_TYPES,
} from './interface';
import { BandingTool } from './tools/bandingTool';
import { GroovingTool } from './tools/groovingTool';
import { convertKeysToCamel } from './utils';

export class MeshBuilder {
  private meshData: MeshObjectData;
  private mesh: THREE.Mesh | null = null;
  private parentMesh: THREE.Mesh | null = null;
  private bandingTool: BandingTool | null = null;
  private groovingTool: GroovingTool | null = null;

  constructor(data: MeshObjectData, scene?: THREE.Scene) {
    this.meshData = convertKeysToCamel(data);
    if (scene) {
      this.bandingTool = new BandingTool(scene);
      this.groovingTool = new GroovingTool(scene);
    }
  }

  /**
   * Set the parent mesh to enable checking for adjacent planks
   */
  public setParentMesh(parent: THREE.Mesh | null): void {
    this.parentMesh = parent;
  }

  /**
   * Set the scene for BandingTool and GroovingTool initialization
   */
  public setScene(scene: THREE.Scene): void {
    this.bandingTool = new BandingTool(scene);
    this.groovingTool = new GroovingTool(scene);
  }

  /**
   * Get or initialize BandingTool from mesh's scene
   * This ensures banding works even when scene wasn't passed initially
   */
  private _getOrCreateBandingTool(): BandingTool | null {
    if (this.bandingTool) {
      return this.bandingTool;
    }

    let scene: THREE.Scene | null = null;

    // Try to get scene from mesh's parent chain
    if (this.mesh) {
      let current: THREE.Object3D | null = this.mesh;
      while (current && !(current instanceof THREE.Scene)) {
        current = current.parent;
      }
      if (current instanceof THREE.Scene) {
        scene = current;
      }
    }

    // If not found from mesh, try to get from Redux store
    if (!scene) {
      try {
        const state = store.getState();
        scene = state.scene?.scene || null;
      } catch (error) {
        console.error(error);
      }
    }

    if (scene) {
      this.bandingTool = new BandingTool(scene);
      return this.bandingTool;
    }

    return null;
  }

  /**
   * Get or initialize GroovingTool from mesh's scene
   * This ensures grooving works even when scene wasn't passed initially
   */
  private _getOrCreateGroovingTool(): GroovingTool | null {
    if (this.groovingTool) {
      return this.groovingTool;
    }

    let scene: THREE.Scene | null = null;

    // Try to get scene from mesh's parent chain
    if (this.mesh) {
      let current: THREE.Object3D | null = this.mesh;
      while (current && !(current instanceof THREE.Scene)) {
        current = current.parent;
      }
      if (current instanceof THREE.Scene) {
        scene = current;
      }
    }

    // If not found from mesh, try to get from Redux store
    if (!scene) {
      try {
        const state = store.getState();
        scene = state.scene?.scene || null;
      } catch (error) {
        console.error(error);
      }
    }

    if (scene) {
      this.groovingTool = new GroovingTool(scene);
      return this.groovingTool;
    }

    return null;
  }

  /**
   * Check if an edge of the current plank is covered by another plank
   * Delegates to BandingTool if available
   */
  private _isEdgeCovered(mesh: THREE.Mesh, edge: string): boolean {
    const tool = this._getOrCreateBandingTool();
    if (tool) {
      return tool.isEdgeCovered(mesh, edge, this.parentMesh);
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
   * Remove all banding meshes from a plank
   */
  public removeAllBanding(mesh: THREE.Mesh): void {
    const tool = this._getOrCreateBandingTool();
    if (tool) {
      tool.removeAllBanding(mesh, this.meshData.id);
    }
  }

  /**
   * Remove banding from a specific edge
   */
  public removeBandingOnEdge(mesh: THREE.Mesh, edge: string): void {
    const tool = this._getOrCreateBandingTool();
    if (tool) {
      // Get banding thickness from material
      const materialData = this.meshData.material;
      const materialArray = Array.isArray(materialData)
        ? materialData
        : materialData
          ? [materialData]
          : [];
      const bandingMaterialData = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);
      const bandingThickness = bandingMaterialData?.properties?.thickness || 1.5;

      tool.removeBandingOnEdge(mesh, edge, bandingThickness, this.meshData.id);
    }
  }

  /**
   * Update banding positions and sizes when plank dimensions change
   */
  public async updateBanding(mesh: THREE.Mesh): Promise<void> {
    const tool = this._getOrCreateBandingTool();
    if (!tool || !(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const bandingState = this.meshData.edgeBanding;
    if (!bandingState) return;

    const { width, height, depth } = mesh.geometry.parameters;

    // Get banding material
    const materialData = this.meshData.material;
    if (!materialData) return;

    const materialArray = Array.isArray(materialData) ? materialData : [materialData];
    const bandingMaterialData = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.BANDING);

    if (bandingMaterialData) {
      await tool.updateBanding(
        mesh,
        { width, height, depth },
        bandingMaterialData,
        bandingState,
        this.parentMesh,
        { material: this.meshData.material, id: this.meshData.id }
      );
    }
  }

  /**
   * Update grooving positions and sizes when plank dimensions change
   */
  public updateGrooving(mesh: THREE.Mesh): void {
    const tool = this._getOrCreateGroovingTool();
    if (tool) {
      tool.updateGrooving(mesh);
    }
  }

  /**
   * Apply banding material from parent to this plank mesh
   * This is used when the parent (e.g., cupboard) has banding material
   * that should be applied to all child planks
   */
  public async applyParentBandingMaterial(parentBandingMaterial: Material): Promise<void> {
    if (!this.mesh) return;
    const tool = this._getOrCreateBandingTool();
    if (!tool) return;
    await tool.createBandingOnPlank(
      this.mesh,
      parentBandingMaterial,
      this.meshData.edgeBanding,
      this.parentMesh,
      { material: this.meshData.material, id: this.meshData.id }
    );
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
    const tool = this._getOrCreateBandingTool();
    if (!tool) return;

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

    if (bandingMaterialData && bandingState) {
      await tool.applyBandingFromState(
        targetMesh,
        bandingState,
        bandingMaterialData,
        this.parentMesh,
        { material: this.meshData.material, id: this.meshData.id }
      );
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
        if (this.mesh) {
          const tool = this._getOrCreateBandingTool();
          if (tool) {
            tool
              .createBandingOnPlank(
                this.mesh,
                materialData,
                this.meshData.edgeBanding,
                this.parentMesh,
                { material: this.meshData.material, id: this.meshData.id }
              )
              .catch((error) => {
                console.warn('Failed to create banding:', error);
              });
          }
        }
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
    const tool = this._getOrCreateGroovingTool();
    if (tool) {
      tool.removeAllGrooving(mesh);
    }
  }

  /**
   * Create grooving system: grooves on side planks (female) and protrusions on back plank (male)
   */
  private _createGrooving(): void {
    if (!this.mesh) return;

    const tool = this._getOrCreateGroovingTool();
    if (tool) {
      tool.createGrooving(this.mesh);
    }
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
