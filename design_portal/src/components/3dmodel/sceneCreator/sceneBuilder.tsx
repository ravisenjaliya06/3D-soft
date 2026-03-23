import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
// import { createGrid } from '../design/grid-creator';
import { ThreeDView } from '../design/interface';
import { loadSinkModel } from '../design/scene';
import { MoveHandler } from '../handler/moveHandler';
import { SceneBuilderConfig } from './interface';
import { SelectObjectController } from './tools/selectTool';
import { ZoomSelectionController } from './tools/zoomTools';

/**
 * SceneBuilder class for creating and managing Three.js scenes
 * This class encapsulates all scene creation logic including:
 * - Scene setup
 * - Camera configuration (Perspective & Orthographic)
 * - Renderer setup
 * - Lighting setup (Ambient, Directional, Hemisphere)
 * - Controls (Orbit & Transform)
 * - Post-processing effects
 * - Sky and environment
 */
export class SceneBuilder {
  // Core Three.js components
  private scene: THREE.Scene;
  private perspectiveCamera: THREE.PerspectiveCamera;
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private mount: HTMLDivElement;

  // Controls
  private controls: OrbitControls;
  private transformControls: TransformControls;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  // State
  private isDay: boolean = true;
  private animationId: number | null = null;
  private isZoomMode: boolean = false;
  private zoomController: ZoomSelectionController;

  // Zoom mode state
  private overlayCanvas: HTMLCanvasElement | null = null;

  // Configuration
  private config: SceneBuilderConfig;

  private cupboards: THREE.Mesh[] = [];
  private selector: SelectObjectController | null = null;
  private moveHandler: MoveHandler | null = null;

  constructor(config: SceneBuilderConfig) {
    this.config = config;
    this.mount = config.mount;

    // Enable global Three.js cache so textures and models are stored in memory and instantly reused
    THREE.Cache.enabled = true;

    // Initialize core components
    this.scene = this.createScene();
    this.perspectiveCamera = this.createPerspectiveCamera();
    this.camera = this.perspectiveCamera;
    this.renderer = this.createRenderer();

    // Initialize lighting
    const lights = this.createLighting();
    this.ambientLight = lights.ambientLight;
    this.directionalLight = lights.directionalLight;

    // Initialize controls
    this.controls = this.createOrbitControls();
    this.transformControls = this.createTransformControls();

    // Initialize zoom controller
    this.zoomController = new ZoomSelectionController(
      this.scene,
      this.camera,
      this.renderer,
      this.mount,
      this.controls
    );

    this.setupScene();
    this.initSelector();
    this.initMoveHandler();

    // Setup event listeners
    this.setupEventListeners();

    // Start animation loop
    this.startAnimation();
  }

  private createScene(): THREE.Scene {
    return new THREE.Scene();
  }

  private createPerspectiveCamera(): THREE.PerspectiveCamera {
    const cameraConfig = this.config.cameraConfig || {};
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const position = cameraConfig.position || new THREE.Vector3(0, 3, 15);
    camera.position.copy(position);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;

    this.mount.appendChild(renderer.domElement);
    return renderer;
  }

  private createLighting(): {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight | null;
  } {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    return { ambientLight, directionalLight, hemiLight: null };
  }

  private createOrbitControls(): OrbitControls {
    const controlsConfig = this.config.controlsConfig || {};
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping =
      controlsConfig.enableDamping !== undefined ? controlsConfig.enableDamping : false;
    controls.dampingFactor = controlsConfig.dampingFactor || 0.05;
    controls.enableZoom =
      controlsConfig.enableZoom !== undefined ? controlsConfig.enableZoom : true;
    controls.enablePan = controlsConfig.enablePan !== undefined ? controlsConfig.enablePan : true;
    controls.target.set(0, 0, 0);

    return controls;
  }

  private createTransformControls(): TransformControls {
    const transformControls = new TransformControls(this.camera, this.renderer.domElement);
    transformControls.size = 0.8;
    transformControls.space = 'world';
    transformControls.setMode('translate'); // Default to translate

    transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });

    return transformControls;
  }

  private async setupScene(): Promise<void> {
    // Add grid
    // this.scene.add(this.grid);

    this.scene.background = new THREE.Color(0xdddddd);

    // Add lighting
    this.scene.add(this.ambientLight);
    this.scene.add(this.directionalLight);

    // Add transform controls to scene
    this.scene.add(this.transformControls.getHelper());
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
    }
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.overlayCanvas) {
      this.overlayCanvas.width = window.innerWidth;
      this.overlayCanvas.height = window.innerHeight;
    }
  };

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      if (this.selector) this.selector.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public toggleSky(): void { }

  private initSelector() {
    this.selector = new SelectObjectController(this.camera as THREE.PerspectiveCamera, this.scene);
  }

  private initMoveHandler() {
    const options = {
      scene: this.scene,
      camera: this.camera as THREE.PerspectiveCamera,
      renderer: this.renderer,
    };
    this.moveHandler = new MoveHandler(options);
  }

  public toggleZoomMode(enable: boolean) {
    this.zoomController.toggleZoomMode(enable);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public getTransformControls(): TransformControls {
    return this.transformControls;
  }

  public getMount(): HTMLDivElement {
    return this.mount;
  }

  public getIsDayState(): boolean {
    return this.isDay;
  }

  public getIsZoomMode(): boolean {
    return this.isZoomMode;
  }

  public build(): ThreeDView {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      mount: this.mount,
      transformControls: this.transformControls,
      toggleSky: () => this.toggleSky(),
      isDay: this.isDay,
      toggleZoomMode: (enable: boolean) => this.toggleZoomMode(enable),
      isZoomMode: this.isZoomMode,
      loadSinkModel: async (url: string) => {
        loadSinkModel(this.scene, url);
      },
      selector: this.selector,
      moveHandler: this.moveHandler ? this.moveHandler : undefined,
    };
  }

  /**
   * Disposes of all resources and stops animation
   */
  public dispose(): void {
    // Stop animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Dispose of geometries and materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else if (object.material) {
          object.material.dispose();
        }
      }
    });

    // Dispose of renderer
    this.renderer.dispose();

    // Remove renderer from DOM
    if (this.mount.contains(this.renderer.domElement)) {
      this.mount.removeChild(this.renderer.domElement);
    }

    // Clean up controls
    this.controls.dispose();
    this.transformControls.dispose();
  }
}
