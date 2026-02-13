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
  OBJECT_TYPES,
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
  private textureLoader = new THREE.TextureLoader();

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
      texture = this.textureLoader.load(
        `${process.env.NEXT_PUBLIC_PUBLIC_API}` + textureData.textureDetail.image || ''
      );
      // texture.anisotropy = 8;
      // texture.generateMipmaps = true;
      // texture.minFilter = THREE.LinearMipmapLinearFilter;
      // texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1, 1);
      // texture.center.set(0, 0);
      // texture.offset.set(0, 0);
    });
    return texture;
  }

  private _createTextureMaterial(materialData: Material): THREE.MeshStandardMaterial {
    const texture = this._createTexture(materialData);
    if (!texture) return new THREE.MeshStandardMaterial({ visible: false });
    return new THREE.MeshStandardMaterial({
      map: texture,
      wireframe: false,
      roughness: 0.9,
      metalness: 0,
      // envMapIntensity: 0.6
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
      } else if (materialData.type === 'Floor') {
        // Support floor material type - use same texture loading as Panel Stock
        createdMaterial = this._createTextureMaterial(materialData);
      } else if (this.meshData.type === FLOOR_PLAN_TYPES.WALL) {
        createdMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
        });
      }

      if (this.meshData.type === OBJECT_TYPES.PLATFORM) {
        createdMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
        });
      }

      if (this.meshData.type === OBJECT_TYPES.SINK) {
        createdMaterial = new THREE.MeshStandardMaterial({
          visible: false,
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

      // Offsets as 0–100 (center = 50)
      const h = THREE.MathUtils.clamp(materialProps.horizontalInset ?? 50, 0, 100);
      const v = THREE.MathUtils.clamp(materialProps.verticalInset ?? 50, 0, 100);

      const xFactor = (h - 50) / 100;
      const yFactor = (v - 50) / 100;

      const center = new THREE.Vector3();
      bBox.getCenter(center);

      // Calculate initial local position
      let posX = center.x + xFactor * size.x;
      let posY = center.y - yFactor * size.y;

      // Handle clamping to prevent sticking out
      const handleBox = new THREE.Box3().setFromObject(handle);
      const handleSize = new THREE.Vector3();
      handleBox.getSize(handleSize);

      const rotationDeg = materialProps.rotation ?? 90;
      const rotationRad = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(rotationDeg, 0, 180));

      // Determine handle dimensions in its final orientation
      handle.rotation.set(Math.PI / 2, rotationRad, 0);
      handle.updateMatrixWorld(true);
      const rotatedHandleBox = new THREE.Box3().setFromObject(handle);
      const rotatedHandleSize = new THREE.Vector3();
      rotatedHandleBox.getSize(rotatedHandleSize);

      // Clamp posX and posY based on rotatedHandleSize
      const halfHandleW = rotatedHandleSize.x / 2;
      const halfHandleH = rotatedHandleSize.y / 2;

      // Add padding (e.g., 15mm) to prevent hugging the edge
      const padding = 15;

      // targetMesh local bounds with padding
      const minX = bBox.min.x + halfHandleW + padding;
      const maxX = bBox.max.x - halfHandleW - padding;
      const minY = bBox.min.y + halfHandleH + padding;
      const maxY = bBox.max.y - halfHandleH - padding;

      // Ensure we don't clamp to an invalid range if door is smaller than handle + padding
      // If it's too small, we fall back to the simple clamping (no padding) or center it.
      const safeMinX = Math.min(minX, maxX);
      const safeMaxX = Math.max(minX, maxX);
      const safeMinY = Math.min(minY, maxY);
      const safeMaxY = Math.max(minY, maxY);

      posX = THREE.MathUtils.clamp(posX, safeMinX, safeMaxX);
      posY = THREE.MathUtils.clamp(posY, safeMinY, safeMaxY);

      const localPos = new THREE.Vector3(posX, posY, bBox.max.z);

      const worldPos = targetMesh.localToWorld(localPos.clone());
      const attachParentLocal = attachParent.worldToLocal(worldPos.clone());

      handle.position.copy(attachParentLocal);
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

  private async _loadSink(mesh: THREE.Mesh) {
    const url = '/glb/kitchen_sink.glb';

    const sinkModel = await GLBLoader(url, 'KitchenSink', {
      width: this.meshData.dimensions.width,
      height: this.meshData.dimensions.height,
      depth: this.meshData.dimensions.depth,
    });
    sinkModel.name = `Sink_for_${mesh.name}`;
    sinkModel.userData.type = OBJECT_TYPES.SINK;
    sinkModel.userData.objectId = this.meshData.id;

    mesh.add(sinkModel);
  }

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
   * @param options.isDimensionUpdate - When true, only the changed side's banding is updated
   *   (resize/reposition existing banding); plank is not reduced, so other dimensions stay as set
   */
  public async updateBanding(
    mesh: THREE.Mesh,
    options?: { isDimensionUpdate?: boolean }
  ): Promise<void> {
    const tool = this._getOrCreateBandingTool();
    if (!tool || !(mesh.geometry instanceof THREE.BoxGeometry)) return;

    const bandingState = this.meshData.edgeBanding;
    // For dimension updates, we don't need bandingState as we just resize existing meshes.
    // For full updates, if bandingState is missing, the tool can still perform auto-detection.
    if (!bandingState && !options?.isDimensionUpdate) {
      // If we want to allow auto-detection during sync, we could proceed.
      // For now, let's at least allow dimension updates to proceed.
    }

    const { width, height, depth } = mesh.geometry.parameters;

    const bandingMaterialData = tool.getBandingMaterial(
      mesh,
      { material: this.meshData.material, parent: this.meshData.parent },
      store.getState().data.objects
    );

    if (bandingMaterialData) {
      await tool.updateBanding(
        mesh,
        { width, height, depth },
        bandingMaterialData,
        bandingState,
        this.parentMesh,
        { material: this.meshData.material, id: this.meshData.id },
        { isDimensionUpdate: options?.isDimensionUpdate }
      );
    }
  }

  /**
   * Update grooving positions and sizes when plank dimensions change
   */
  public updateGrooving(mesh: THREE.Mesh): void {
    mesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.name.includes('BACK_PLANK')) {
        mesh = child;
      }
    });

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
      }
    });

    if (this.meshData.type === OBJECT_TYPES.SINK) {
      this._loadSink(this.mesh!);
    }
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

  public getMaterial() {
    this._getMaterial();
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

        // Support both PANEL_STOCK and Floor material types
        const supportedTypes = [MATERIAL_TYPES.PANEL_STOCK, 'Floor'];

        if (
          supportedTypes.includes(oldMat.type) &&
          supportedTypes.includes(newMat.type) &&
          oldMat.textures?.[0]?.textureDetail?.image !== newMat.textures?.[0]?.textureDetail?.image
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
}
