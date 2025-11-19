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
  private orthographicCamera: THREE.OrthographicCamera;
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
  private isZoomMode: boolean = false;
  private animationId: number | null = null;

  // Zoom mode state
  private startPoint: THREE.Vector2 | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;

  // Configuration
  private config: SceneBuilderConfig;

  constructor(config: SceneBuilderConfig) {
    this.config = config;
    this.mount = config.mount;

    // Initialize core components
    this.scene = this.createScene();
    this.perspectiveCamera = this.createPerspectiveCamera();
    this.orthographicCamera = this.createOrthographicCamera();
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

    // Initialize post-processing
    this.composer = this.createComposer();

    // Setup scene
    this.setupScene();

    // Setup event listeners
    this.setupEventListeners();

    // Start animation loop
    this.startAnimation();
  }

  /**
   * Creates the Three.js scene
   */
  private createScene(): THREE.Scene {
    return new THREE.Scene();
  }

  /**
   * Creates the perspective camera
   */
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

  /**
   * Creates the orthographic camera for 2D mode
   */
  private createOrthographicCamera(): THREE.OrthographicCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const zoom = 10;
    const camera = new THREE.OrthographicCamera(
      -zoom * aspect,
      zoom * aspect,
      zoom,
      -zoom,
      0.1,
      1000
    );
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);
    camera.zoom = 1;

    return camera;
  }

  /**
   * Creates the WebGL renderer
   */
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

  /**
   * Creates the grid helper
   */
  private createGrid(): THREE.GridHelper {
    const gridConfig = this.config.gridConfig || {};
    return createGrid(gridConfig.size || 1000, gridConfig.divisions || 1000);
  }

  /**
   * Creates sky objects (day, night, and stars)
   */
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

  /**
   * Creates all lighting for the scene
   */
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

  /**
   * Creates orbit controls
   */
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

  /**
   * Creates transform controls
   */
  private createTransformControls(): TransformControls {
    const transformControls = new TransformControls(this.camera, this.renderer.domElement);
    transformControls.size = 0.3;
    transformControls.space = 'world';
    return transformControls;
  }

  /**
   * Creates post-processing composer
   */
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

  /**
   * Sets up the scene by adding all objects
   */
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

  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Handles window resize
   */
  private handleResize(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    } else {
      const aspect = window.innerWidth / window.innerHeight;
      const zoom = this.camera.zoom;
      this.camera.left = -zoom * aspect;
      this.camera.right = zoom * aspect;
      this.camera.top = zoom;
      this.camera.bottom = -zoom;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.overlayCanvas) {
      this.overlayCanvas.width = window.innerWidth;
      this.overlayCanvas.height = window.innerHeight;
    }

    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Starts the animation loop
   */
  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.composer.render();
    };
    animate();
  }

  /**
   * Toggles between day and night sky
   */
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

  /**
   * Toggles between 2D and 3D mode
   */
  public toggle2DMode(is2D: boolean): void {
    if (is2D) {
      this.camera = this.orthographicCamera;
      this.controls.enableRotate = false;
      this.controls.enablePan = true;
      this.controls.enableZoom = true;
      this.transformControls.showY = false;
      this.camera.position.set(0, 10, 0);
      this.camera.lookAt(0, 0, 0);
    } else {
      this.camera = this.perspectiveCamera;
      this.controls.enableRotate = true;
      this.controls.enablePan = true;
      this.controls.enableZoom = true;
      this.transformControls.showY = true;
      this.camera.position.set(0, 1, 4.5);
      this.camera.lookAt(0, 0, 0);
    }

    this.controls.object = this.camera;
    this.transformControls.camera = this.camera;
    this.controls.update();
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Toggles zoom mode
   */
  public toggleZoomMode(enable: boolean): void {
    this.isZoomMode = enable;
    if (enable) {
      document.body.style.cursor = 'zoom-in';
      this.controls.enabled = false;
      this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    } else {
      document.body.style.cursor = 'default';
      this.controls.enabled = true;
      this.renderer.domElement.removeEventListener('mousedown', (e) => this.onMouseDown(e));
      if (this.overlayCanvas && this.overlayCanvas.parentNode) {
        this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
        this.overlayCanvas = null;
        this.overlayContext = null;
      }
    }
  }

  /**
   * Handles mouse down for zoom mode
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.isZoomMode) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.startPoint = new THREE.Vector2(x, y);

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.width = window.innerWidth;
    this.overlayCanvas.height = window.innerHeight;
    this.mount.appendChild(this.overlayCanvas);
    this.overlayContext = this.overlayCanvas.getContext('2d');

    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e), { once: true });
  }

  /**
   * Handles mouse move for zoom mode
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.startPoint || !this.isZoomMode || !this.overlayCanvas || !this.overlayContext) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = ((this.startPoint.x + 1) / 2) * rect.width;
    const startY = ((-this.startPoint.y + 1) / 2) * rect.height;

    this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const width = currentX - startX;
    const height = currentY - startY;

    this.overlayContext.strokeStyle = 'green';
    this.overlayContext.fillStyle = 'rgba(0, 255, 0, 0.1)';
    this.overlayContext.lineWidth = 2;
    this.overlayContext.beginPath();
    this.overlayContext.rect(startX, startY, width, height);
    this.overlayContext.fill();
    this.overlayContext.stroke();
  }

  /**
   * Handles mouse up for zoom mode
   */
  private onMouseUp(event: MouseEvent): void {
    if (!this.startPoint) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const endPoint = new THREE.Vector2(x, y);

    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
      this.overlayCanvas = null;
      this.overlayContext = null;
    }

    const objectBounds = this.getObjectsBoundingBox(this.startPoint, endPoint);

    if (!objectBounds) {
      this.startPoint = null;
      this.renderer.domElement.removeEventListener('mousemove', (e) => this.onMouseMove(e));
      this.toggleZoomMode(false);
      return;
    }

    const { min, max, center } = objectBounds;
    const width = max.x - min.x;

    if (this.camera instanceof THREE.PerspectiveCamera) {
      const height = max.y - min.y;
      const depth = max.z - min.z;
      const fovRad = this.camera.fov * (Math.PI / 180);
      const aspect = window.innerWidth / window.innerHeight;
      const maxDimension = Math.max(width, height, depth);
      let distance: number;

      if (width / height > aspect) {
        distance = maxDimension / 2 / Math.tan(fovRad / 2);
      } else {
        distance = maxDimension / 2 / (Math.tan(fovRad / 2) * aspect);
      }

      distance = Math.max(distance * 1.2, 0.1);

      const direction = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
      const newPosition = center.clone().add(direction.clone().negate().multiplyScalar(distance));

      this.camera.position.copy(newPosition);
      this.camera.lookAt(center);
      this.controls.target.copy(center);
    } else {
      const height = max.z - min.z;
      const aspect = window.innerWidth / window.innerHeight;
      const maxDimension = Math.max(width, height);
      const newZoom = Math.min(
        window.innerWidth / maxDimension,
        window.innerHeight / (maxDimension / aspect)
      );

      this.camera.zoom = newZoom * 0.8;
      this.camera.position.set(center.x, 10, center.z);
      this.camera.lookAt(center.x, 0, center.z);
      this.controls.target.set(center.x, 0, center.z);
      this.camera.updateProjectionMatrix();
    }

    this.controls.update();

    this.startPoint = null;
    this.renderer.domElement.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    this.toggleZoomMode(false);
  }

  /**
   * Gets bounding box of objects in selection area
   */
  private getObjectsBoundingBox(
    startPoint: THREE.Vector2,
    endPoint: THREE.Vector2
  ): { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 } | null {
    const raycaster = new THREE.Raycaster();
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    const selectableObjects = this.scene.children.filter(
      (obj) =>
        obj.visible &&
        !(obj instanceof THREE.GridHelper) &&
        !(obj instanceof Sky) &&
        obj.name !== 'stars'
    );

    const xMin = Math.min(startPoint.x, endPoint.x);
    const xMax = Math.max(startPoint.x, endPoint.x);
    const yMin = Math.min(startPoint.y, endPoint.y);
    const yMax = Math.max(startPoint.y, endPoint.y);

    let hitAnyObject = false;
    const steps = 5;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const y = yMin + (yMax - yMin) * (j / steps);

        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = raycaster.intersectObjects(selectableObjects, true);

        if (intersects.length) {
          const { point } = intersects[0];
          min.min(point);
          max.max(point);
          hitAnyObject = true;
        }
      }
    }

    if (!hitAnyObject) return null;

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    return { min, max, center };
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
      toggle2DMode: (is2D: boolean) => this.toggle2DMode(is2D),
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
