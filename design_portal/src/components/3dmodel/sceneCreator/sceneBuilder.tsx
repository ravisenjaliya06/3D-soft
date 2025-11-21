import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createGrid } from '../design/grid-creator';
import { ThreeDView } from '../design/interface';
import { addSimpleCabinet, loadSinkModel } from '../design/scene';
import { createSky } from '../helper/sky';
import { SKY_SETS } from '../helper/sky/constants';
import { SceneBuilderConfig } from './interface';
import { ZoomSelectionController } from './tools';

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
  private hemiLight: THREE.HemisphereLight;

  // Environment
  private grid: THREE.GridHelper;
  private daySky: Sky;
  private nightSky: Sky;
  private stars: THREE.Points;

  // Post-processing
  private composer: EffectComposer;

  // State
  private isDay: boolean = true;
  private animationId: number | null = null;
  private isZoomMode: boolean = false;
  private zoomController: ZoomSelectionController;

  // Zoom mode state
  private overlayCanvas: HTMLCanvasElement | null = null;

  // Configuration
  private config: SceneBuilderConfig;

  constructor(config: SceneBuilderConfig) {
    this.config = config;
    this.mount = config.mount;

    // Initialize core components
    this.scene = this.createScene();
    this.perspectiveCamera = this.createPerspectiveCamera();
    this.camera = this.perspectiveCamera;
    this.renderer = this.createRenderer();

    // Initialize environment
    this.grid = this.createGrid();
    const skySet = this.createSkySet();
    this.daySky = skySet.daySky;
    this.nightSky = skySet.nightSky;
    this.stars = skySet.stars;

    // Initialize lighting
    const lights = this.createLighting();
    this.ambientLight = lights.ambientLight;
    this.directionalLight = lights.directionalLight;
    this.hemiLight = lights.hemiLight;

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

    // Initialize post-processing
    this.composer = this.createComposer();

    // Setup scene
    this.setupScene();

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
      cameraConfig.fov || 50,
      window.innerWidth / window.innerHeight,
      cameraConfig.near || 0.1,
      cameraConfig.far || 1000
    );

    const position = cameraConfig.position || new THREE.Vector3(0, 1, 4.5);
    camera.position.copy(position);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const rendererConfig = this.config.rendererConfig || {};
    const renderer = new THREE.WebGLRenderer({
      antialias: rendererConfig.antialias !== undefined ? rendererConfig.antialias : true,
      alpha: rendererConfig.alpha !== undefined ? rendererConfig.alpha : true,
      preserveDrawingBuffer:
        rendererConfig.preserveDrawingBuffer !== undefined
          ? rendererConfig.preserveDrawingBuffer
          : true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMappingExposure = 1;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.mount.appendChild(renderer.domElement);

    return renderer;
  }

  private createGrid(): THREE.GridHelper {
    const gridConfig = this.config.gridConfig || {};
    return createGrid(gridConfig.size || 1000, gridConfig.divisions || 1000);
  }

  private createSkySet(): { daySky: Sky; nightSky: Sky; stars: THREE.Points } {
    const daySky = createSky(SKY_SETS.daySky);
    const nightSky = createSky(SKY_SETS.nightSky);

    // Create stars
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 5000; i++) {
      starVertices.push(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.name = 'stars';

    return { daySky, nightSky, stars };
  }

  private createLighting(): {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
  } {
    const lightingConfig = this.config.lightingConfig || {};

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, lightingConfig.ambientIntensity || 0.8);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      lightingConfig.directionalIntensity || 0.8
    );
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(
      0xffffff,
      0x444444,
      lightingConfig.hemiIntensity || 0.6
    );

    return { ambientLight, directionalLight, hemiLight };
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
    transformControls.size = 0.3;
    transformControls.space = 'world';
    return transformControls;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.1,
      0.1,
      0.1
    );
    composer.addPass(bloomPass);

    const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    composer.addPass(smaaPass);

    return composer;
  }

  private setupScene(): void {
    // Add grid
    this.scene.add(this.grid);

    // Add lighting
    this.scene.add(this.ambientLight);
    this.scene.add(this.directionalLight);
    this.scene.add(this.hemiLight);

    // Add day sky by default
    this.scene.add(this.daySky);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.overlayCanvas) {
      this.overlayCanvas.width = window.innerWidth;
      this.overlayCanvas.height = window.innerHeight;
    }

    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.composer.render();
    };
    animate();
  }

  public toggleSky(): void {
    if (this.isDay) {
      this.scene.remove(this.daySky);
      this.scene.add(this.nightSky);
      this.scene.add(this.stars);
    } else {
      this.scene.remove(this.nightSky);
      this.scene.remove(this.stars);
      this.scene.add(this.daySky);
    }
    this.isDay = !this.isDay;
  }

  public toggleZoomMode(enable: boolean) {
    this.zoomController.toggleZoomMode(enable);
  }

  /**
   * Gets the Three.js scene
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Gets the current camera
   */
  public getCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.camera;
  }

  /**
   * Gets the renderer
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Gets the orbit controls
   */
  public getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Gets the transform controls
   */
  public getTransformControls(): TransformControls {
    return this.transformControls;
  }

  /**
   * Gets the mount element
   */
  public getMount(): HTMLDivElement {
    return this.mount;
  }

  /**
   * Gets the current day/night state
   */
  public getIsDayState(): boolean {
    return this.isDay;
  }

  /**
   * Gets the current zoom mode state
   */
  public getIsZoomMode(): boolean {
    return this.isZoomMode;
  }

  /**
   * Builds and returns the complete ThreeDView object
   */
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
      addSimpleCabinet: () => {
        addSimpleCabinet(this.scene);
      },
      loadSinkModel: async (url: string) => {
        loadSinkModel(this.scene, url);
      },
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
    window.removeEventListener('resize', () => this.handleResize());

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
