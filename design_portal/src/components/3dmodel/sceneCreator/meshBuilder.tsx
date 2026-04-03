import * as THREE from 'three';
import { detectPlankByBoundingBox } from '../../utils/plankUtils';
import { GLBLoader } from '../helper/glbLoader';
import {
  alignExtrudedGeometry,
  buildThreeShape,
  createHolePath,
} from '../panelDesign/utils/geometryUtils';
import { store } from '../store';
import { applyCSGHoles } from '../utils/csgUtils';
import {
  DIRECTION_TYPES,
  DRAWER_PLANK_TYPES,
  FLOOR_PLAN_TYPES,
  GEOMETRY,
  Material,
  MATERIAL_TYPES,
  MeshObjectData,
  OBJECT_TYPES,
  PART_TYPES,
  TEXTURE_GRAIN,
} from './interface';
import { BandingTool } from './tools/bandingTool';
import { GroovingTool } from './tools/groovingTool';
import { convertKeysToCamel, globalTextureLoader, normalizeUVs } from './utils';

export class MeshBuilder {
  private meshData: MeshObjectData;
  public mesh: THREE.Mesh | null = null;
  public parentMesh: THREE.Mesh | null = null;
  public geometryPromise: Promise<void> | null = null;
  private bandingTool: BandingTool | null = null;
  private groovingTool: GroovingTool | null = null;
  private textureLoader = globalTextureLoader;

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
      const imgPath = textureData.textureDetail?.image;
      if (imgPath) {
        const fullUrl =
          imgPath.startsWith('http') || imgPath.startsWith('https')
            ? imgPath
            : `${process.env.NEXT_PUBLIC_PUBLIC_API}${imgPath}`;
        texture = this.textureLoader.load(fullUrl);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.repeat.set(1, 1);

        //it is for texture grain when design loaded
        texture.center.set(0.5, 0.5);
        if (this.meshData.textureGrain === TEXTURE_GRAIN.VERTICAL) {
          texture.rotation = Math.PI / 2;
        } else {
          texture.rotation = 0;
        }
      }
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
        const wallTexture = this._createTexture(materialData);
        createdMaterial = wallTexture
          ? new THREE.MeshStandardMaterial({ map: wallTexture })
          : new THREE.MeshStandardMaterial({ color: 0xffffff });
      } else if (materialData.type === MATERIAL_TYPES.MISCELLANEOUS) {
        // Support floor material type - use same texture loading as Panel Stock
        createdMaterial = this._createTextureMaterial(materialData);
      }

      if (this.meshData.type === OBJECT_TYPES.PLATFORM) {
        createdMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
        });
      }

      if (this.meshData.type === OBJECT_TYPES.SINK || this.meshData.type === OBJECT_TYPES.MODEL) {
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

  private async _createExtrudeGeometry(): Promise<THREE.ExtrudeGeometry> {
    const { panelDesign, dimensions } = this.meshData;

    if (panelDesign) {
      const { outline, cornerRadius, cornerTypes, curveControls, holes } = panelDesign;

      // Detect orientation and thickness axis
      const tempGeo = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
      const tempMesh = new THREE.Mesh(tempGeo);
      const { thicknessAxis, size } = detectPlankByBoundingBox(tempMesh);
      tempGeo.dispose();

      let w = 0,
        h = 0;
      if (thicknessAxis === 'y') {
        w = size.x;
        h = size.z;
      } else if (thicknessAxis === 'x') {
        w = size.z;
        h = size.y;
      } else {
        w = size.x;
        h = size.y;
      }

      const isRotated2D = h > w;
      const mappedPoints = isRotated2D ? outline.map((p) => ({ x: -p.y, y: p.x })) : outline;
      const getMappedPoint = (p: { x: number; y: number }) =>
        isRotated2D ? { x: -p.y, y: p.x } : p;

      const mainShape = buildThreeShape(
        mappedPoints,
        cornerRadius || [],
        curveControls || {},
        'shape',
        cornerTypes || []
      );

      holes?.forEach((hole, index) => {
        if (hole.type !== 'slotting') {
          mainShape.holes.push(
            createHolePath(hole, index, curveControls || {}, getMappedPoint, isRotated2D)
          );
        }
      });

      const thickness = size[thicknessAxis];
      const geometry = new THREE.ExtrudeGeometry(mainShape, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: 32,
      });

      alignExtrudedGeometry(geometry, thickness, thicknessAxis);

      let finalGeometry = geometry as THREE.BufferGeometry;

      const slottingHoles = holes?.filter((h) => h.type === 'slotting') || [];
      if (slottingHoles.length > 0) {
        const { Evaluator, Brush, SUBTRACTION } = await import('three-bvh-csg');
        const evaluator = new Evaluator();
        let resultBrush = new Brush(finalGeometry);
        resultBrush.updateMatrixWorld();

        for (const hole of slottingHoles) {
          const pocketDepth = hole.depth ?? 10;
          const originalIndex = holes!.indexOf(hole);
          const holePath = createHolePath(
            hole,
            originalIndex,
            curveControls || {},
            getMappedPoint,
            isRotated2D
          );
          const plugShape = new THREE.Shape(holePath.getPoints());

          const plugGeom = new THREE.ExtrudeGeometry(plugShape, {
            depth: pocketDepth,
            bevelEnabled: false,
            curveSegments: 32,
          });

          // 1. Position identically to the front face
          plugGeom.translate(0, 0, thickness / 2 - pocketDepth);

          // 2. Rotate exactly identically to the main extrusion
          if (thicknessAxis === 'x') {
            plugGeom.rotateY(Math.PI / 2);
          } else if (thicknessAxis === 'y') {
            plugGeom.rotateX(Math.PI / 2);
          }

          const holeBrush = new Brush(plugGeom);
          holeBrush.updateMatrixWorld();

          resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
        }

        finalGeometry = resultBrush.geometry;
        Object.setPrototypeOf(finalGeometry, THREE.ExtrudeGeometry.prototype);
        Object.defineProperty(finalGeometry, 'type', { value: 'ExtrudeGeometry' });
        (finalGeometry as any).parameters = geometry.parameters;
      }

      normalizeUVs(finalGeometry);

      return finalGeometry as THREE.ExtrudeGeometry;
    }

    const shape = this._createShape();

    // NOTE: Right now, it only has two external properties (depth and bevelEnabled). Later on, we’ll add more properties when we need to support custom shapes.
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: this.meshData.dimensions?.depth || 0,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    normalizeUVs(geometry);
    return geometry;
  }

  private async _getGeometry(): Promise<THREE.BufferGeometry> {
    if (this.meshData.type === FLOOR_PLAN_TYPES.FLOOR && this.meshData.floorData) {
      const shape = new THREE.Shape();
      const points = this.meshData.floorData.points;
      if (points.length >= 3) {
        shape.moveTo(points[0].x / 100, points[0].y / 100);
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i].x / 100, points[i].y / 100);
        }
        shape.closePath();
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(Math.PI / 2);
        return geometry;
      }
    }
    let geometry: THREE.BufferGeometry;
    switch (this.meshData.geometryType) {
      case GEOMETRY.BOX_GEOMETRY:
        geometry = this._createBoxGeometry();
        break;
      case GEOMETRY.EXTRUDE_GEOMETRY:
        geometry = await this._createExtrudeGeometry();
        break;
      default:
        geometry = this._createBoxGeometry();
        break;
    }

    if (
      this.meshData.type === OBJECT_TYPES.PLATFORM &&
      this.meshData.holes &&
      this.meshData.holes.length > 0
    ) {
      try {
        const csgGeometry = await applyCSGHoles(geometry, this.meshData.holes);
        return csgGeometry;
      } catch (error) {
        console.error('Failed to apply CSG holes:', error);
      }
    }

    return geometry;
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
    mesh.userData.direction = this.meshData.direction;
    mesh.userData.dimensions = this.meshData.dimensions;

    // this "if" for glb model on refresh transform control active
    if (this.meshData.type === OBJECT_TYPES.MODEL) {
      mesh.userData.isGLB = true;
    }
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
    const backendUrl = url
      ? url.startsWith('http') || url.startsWith('https') || url.startsWith('/glb/')
        ? url
        : `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`
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

  private async _loadModel(mesh: THREE.Mesh) {
    const url = this.meshData.path || '';
    if (!url) return;

    const backendUrl =
      url.startsWith('http') || url.startsWith('/glb/')
        ? url
        : `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`;

    try {
      const model = await GLBLoader(backendUrl, 'Model', {
        width: this.meshData.dimensions.width,
        height: this.meshData.dimensions.height,
        depth: this.meshData.dimensions.depth,
      });

      model.name = `Model_for_${mesh.name}`;
      model.userData.type = OBJECT_TYPES.MODEL;
      model.userData.objectId = this.meshData.id;

      model.traverse((child) => {
        child.userData.objectId = this.meshData.id;
        child.userData.isGLB = true;
        if (child instanceof THREE.Mesh) {
          child.userData.type = OBJECT_TYPES.MODEL;
          child.name = `Model_Child_${child.id}`;
        }
      });

      // GLBLoader shifts the model via model.position.sub(center) to center it in its
      // own local space. When the model is placed directly in the scene (initial toolbar
      // placement),
      // coincides with the parent's center — which gives perfect floor alignment on reload.
      model.position.set(0, 0, 0);

      mesh.add(model);
    } catch (error) {
      console.error('Failed to load model:', error);
    }
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
    const bandingState =
      edgeBandingState ||
      this.meshData.edgeBanding ||
      (this.meshData as any).edge_banding ||
      (this.meshData as any).edgebands;

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

  private async _handleMaterial() {
    if (!this.mesh) return;

    const materialArray = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : [this.meshData.material];

    const promises: Promise<void>[] = [];

    materialArray.forEach((materialData) => {
      if (materialData?.type === MATERIAL_TYPES.PULL) {
        this._loadHandle(this.mesh!, materialData.properties);
      } else if (materialData?.type === MATERIAL_TYPES.HINGE) {
        this._loadHinge(this.mesh!, materialData.properties);
      } else if (materialData?.type === MATERIAL_TYPES.DRAWER_GUIDE) {
        // Deprecated: Attach to side planks instead.
        this._loadDrawerChannel(this.mesh!, materialData.properties);
      } else if (materialData?.type === MATERIAL_TYPES.BANDING) {
        if (this.mesh) {
          const tool = this._getOrCreateBandingTool();
          if (tool) {
            promises.push(
              tool
                .createBandingOnPlank(
                  this.mesh,
                  materialData,
                  this.meshData.edgeBanding ||
                    (this.meshData as any).edge_banding ||
                    (this.meshData as any).edgebands,
                  this.parentMesh,
                  { material: this.meshData.material, id: this.meshData.id }
                )
                .catch((error) => {
                  console.warn('Failed to create banding:', error);
                })
            );
          }
        }
      }
    });

    if (this.meshData.type === OBJECT_TYPES.SINK) {
      this._loadSink(this.mesh!);
    } else if (this.meshData.type === OBJECT_TYPES.MODEL) {
      this._loadModel(this.mesh!);
    }

    // Also attempt to apply banding using parent material if not found in direct materials
    const materials: any = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : this.meshData.material
        ? [this.meshData.material]
        : [];
    const hasDirectBanding = materials.some((m: any) => m?.type === MATERIAL_TYPES.BANDING);

    if (!hasDirectBanding && this.mesh) {
      promises.push(this.updateBanding(this.mesh));
    }

    await Promise.all(promises);
  }

  public createMesh(): THREE.Mesh {
    const material = this._getMaterial();

    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(), // Temporary geometry
      material ?? new THREE.MeshBasicMaterial({ visible: false })
    );

    this.mesh = mesh;

    // Now compute the real geometry (possibly with CSG)
    this.geometryPromise = this._getGeometry().then(async (geometry) => {
      mesh.geometry = geometry;
      await this._handleMaterial();
      this._createGrooving();
    });

    this._setName(mesh);
    this._setPosition(mesh);
    this._setRotation(mesh);
    this._setScale(mesh);
    this._setUserData(mesh);
    this._checkForParentAddons(mesh);
    return mesh;
  }

  private async _loadHinge(mesh: THREE.Mesh, materialProps: any) {
    const url = materialProps?.modelFile;
    const backendUrl = url
      ? url.startsWith('http') || url.startsWith('/glb/')
        ? url
        : `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`
      : '/glb/hinge_close.glb';

    const hingeModel = await GLBLoader(backendUrl, 'Hinge', {
      width: 10,
      height: 10,
      depth: 10,
    });

    if (!hingeModel) return;

    const hingeBox = new THREE.Box3().setFromObject(hingeModel);
    const hingeSize = new THREE.Vector3();
    hingeBox.getSize(hingeSize);
    const hingeDepth = hingeSize.z;

    const margin = 100; // 100mm from ends
    const doorHeight = this.meshData.dimensions.height;
    const doorWidth = this.meshData.dimensions.width;
    const doorDepth = this.meshData.dimensions.depth;

    const openDirection = this.meshData.openDirection || DIRECTION_TYPES.RIGHT;
    const isVertical =
      openDirection === DIRECTION_TYPES.LEFT || openDirection === DIRECTION_TYPES.RIGHT;

    const standardDistance = 1000;
    const relevantDimension = isVertical ? doorHeight : doorWidth;
    const numHinges = Math.max(2, Math.ceil(relevantDimension / standardDistance) + 1);

    const startPos = -relevantDimension / 2 + margin;
    const endPos = relevantDimension / 2 - margin;
    const totalSpan = endPos - startPos;

    // Z position (move hinge inside door properly)
    const zPos = -doorDepth / 2 + hingeDepth / 2 - 20;

    // create for ignore hingeW for bounding box
    const hingeW = hingeSize.x;

    for (let i = 0; i < numHinges; i++) {
      const t = numHinges > 1 ? i / (numHinges - 1) : 0.5;
      const varyPos = startPos + t * totalSpan;

      const hinge = hingeModel.clone();
      hinge.name = `Hinge_${i + 1}`;

      if (openDirection === DIRECTION_TYPES.RIGHT) {
        hinge.position.set(doorWidth / 2 - hingeW / 2, varyPos, zPos);
        hinge.rotation.set(0, Math.PI / 2, -Math.PI / 2);
      } else if (openDirection === DIRECTION_TYPES.LEFT) {
        hinge.position.set(-doorWidth / 2 + hingeW / 2, varyPos, zPos);
        hinge.rotation.set(0, -Math.PI / 2, Math.PI / 2);
      } else if (openDirection === DIRECTION_TYPES.TOP) {
        hinge.position.set(varyPos, doorHeight / 2 - hingeW / 2, zPos);
        hinge.rotation.set(Math.PI / 2, 0, Math.PI);
      } else if (openDirection === DIRECTION_TYPES.BOTTOM) {
        hinge.position.set(varyPos, -doorHeight / 2 + hingeW / 2, zPos);
        hinge.rotation.set(-Math.PI / 2, 0, 0);
      }

      hinge.scale.set(1, 1, 1);
      mesh.add(hinge);
    }
  }

  public async updateHinges(mesh: THREE.Mesh): Promise<void> {
    // Remove existing hinges
    for (let i = mesh.children.length - 1; i >= 0; i--) {
      const child = mesh.children[i];
      if (child.name.startsWith('Hinge')) {
        mesh.remove(child);
      }
    }

    // Find Query Hinge Material
    const materialArray = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : this.meshData.material
        ? [this.meshData.material]
        : [];

    const hingeMaterial = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.HINGE);

    if (hingeMaterial) {
      await this._loadHinge(mesh, hingeMaterial.properties);
    }
  }

  public async updateHandle(mesh: THREE.Mesh): Promise<void> {
    // Remove existing handle
    for (let i = mesh.children.length - 1; i >= 0; i--) {
      const child = mesh.children[i];
      if (child.userData.type === 'handle') {
        mesh.remove(child);
      }
    }

    const materialArray = Array.isArray(this.meshData.material)
      ? this.meshData.material
      : this.meshData.material
        ? [this.meshData.material]
        : [];

    const pullMaterial = materialArray.find((mat) => mat?.type === MATERIAL_TYPES.PULL);

    if (pullMaterial) {
      await this._loadHandle(mesh, pullMaterial.properties);
    }
  }

  private async _loadDrawerChannel(mesh: THREE.Mesh, materialProps: any, side?: 'left' | 'right') {
    const url = materialProps?.modelFile;
    const backendUrl = url
      ? url.startsWith('http') || url.startsWith('/glb/')
        ? url
        : `${process.env.NEXT_PUBLIC_PUBLIC_API}${url}`
      : '/glb/chennal_close2.glb';

    if (side) {
      const plankDepth = this.meshData.dimensions.depth;

      const plankPositionX = this.meshData.position.x;
      const plankPositionY = this.meshData.position.y;
      const plankPositionZ = this.meshData.position.z;

      const sideGap = 12; // Gap between drawer and cabinet wall
      const plankThickness = this.meshData.dimensions.width;

      // Calculate offset to move channel from plank center to gap center
      const offset = (sideGap + plankThickness) / 2;

      let channelX = plankPositionX;
      if (side === 'left') {
        channelX -= offset;
      } else {
        channelX += offset;
      }

      // dynamic depth
      const depthChange = Math.max(plankDepth - 10, 100);

      const channelModel = await GLBLoader(backendUrl, 'DrawerChannel', {
        width: 5,
        height: sideGap,
        depth: depthChange,
      });

      if (!channelModel) return;

      const channel = channelModel.clone();
      channel.name = `Channel_${side}`;

      // force depth scaling change
      // After rotation (Math.PI/2 on X and Y), local Z might map differently
      channel.updateMatrixWorld(true);
      const bBox = new THREE.Box3().setFromObject(channel);
      const currentSize = new THREE.Vector3();
      bBox.getSize(currentSize);

      channel.position.set(channelX, plankPositionY, plankPositionZ);
      // Rotation matches user logic
      if (side === 'left') {
        channel.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        channel.scale.set(1, 1, 1);
      } else {
        channel.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        channel.scale.set(1, 1, -1);
      }

      // Final adjustment to ensure it doesn't protrude
      channel.updateMatrixWorld(true);
      const finalBBox = new THREE.Box3().setFromObject(channel);
      const finalSize = new THREE.Vector3();
      finalBBox.getSize(finalSize);

      if (finalSize.z > depthChange) {
        const scaleFactor = depthChange / finalSize.z;
        channel.scale.y *= scaleFactor; // because of PI/2 rotations, Y local to World Z
      }

      const box = new THREE.Box3().setFromObject(channel);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Calculate offset needed to align center.z with plankPositionZ
      const zOffset = plankPositionZ - center.z;
      channel.position.z += zOffset;

      mesh.parent?.add(channel);
      return;
    }
  }
  //for channel addons
  private _checkForParentAddons(mesh: THREE.Mesh) {
    if (
      this.meshData.name === DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK ||
      this.meshData.name === DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK
    ) {
      // Find parent object to check for Drawer Guide material
      const state = store.getState().data.objects;
      const parentObject = state.find((obj) => obj.id === this.meshData.parent);

      if (parentObject) {
        const materialArray = Array.isArray(parentObject.material)
          ? parentObject.material
          : parentObject.material
            ? [parentObject.material]
            : [];

        const channelMaterial = materialArray.find((m) => m?.type === MATERIAL_TYPES.DRAWER_GUIDE);

        if (channelMaterial) {
          const side =
            this.meshData.name === DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK ? 'left' : 'right';
          // Use the main loader with side parameter
          this._loadDrawerChannel(mesh, channelMaterial.properties, side);
        }
      }
    }
  }

  public getMaterial() {
    this._getMaterial();
  }

  public async updateMesh(
    mesh: THREE.Mesh,
    changes: Partial<MeshObjectData>,
    oldMaterial?: MeshObjectData['material']
  ): Promise<void> {
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
    if (changes.dimensions || changes.holes || changes.panelDesign || changes.floorData) {
      mesh.geometry.dispose();
      const geometry = await this._getGeometry();
      mesh.geometry = geometry;
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
