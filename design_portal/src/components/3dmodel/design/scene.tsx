import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { initializeMoveHandler } from '../handler/items';
import { store } from '../store';
import { updateObject } from '../store/dataSlice';
import { createGrid } from './grid-creator';
import { ThreeDView } from './interface';

import {
  setobjectSelected,
  setSelectedChildObject,
  setHoverdMesh,
} from '../store/dataSlice';


import { removeExistingLines } from '.';

let cachedHandleModel: THREE.Object3D | null = null;

// ===== Dimension helpers (exported) =====
const DIMENSION_GROUP_PREFIX = 'plank_dimension_group_';
const DIM_LABEL_PREFIX = 'plank_dim_label_';

const mm = (meters: number) => Math.max(0, meters) * 1000; // meters → millimeters

const toAvoidOverlap = 0.01; // 1mm offset to avoid overlap z-fighting // so floor sits just up y=0.01 to avoid overlap grid
export const init3DDesign = async (
  mount: HTMLDivElement,
): Promise<ThreeDView> => {
  const scene = new THREE.Scene();

  // Perspective Camera (3D)
  const perspectiveCamera = new THREE.PerspectiveCamera(
    80,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  perspectiveCamera.position.set(0, 1, 4.5);
  perspectiveCamera.lookAt(0, 0, 0);

  const aspect = window.innerWidth / window.innerHeight;
  const zoom = 10;
  const orthographicCamera = new THREE.OrthographicCamera(
    -zoom * aspect,
    zoom * aspect,
    zoom,
    -zoom,
    0.1,
    1000,
  );
  orthographicCamera.position.set(0, 10, 0);
  orthographicCamera.lookAt(0, 0, 0);
  orthographicCamera.zoom = 1;

  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera =
    perspectiveCamera;

  const daySky = new Sky();
  daySky.scale.setScalar(450000);
  const daySun = new THREE.Vector3();
  const dayPhi = THREE.MathUtils.degToRad(70);
  const dayTheta = THREE.MathUtils.degToRad(0);
  daySun.setFromSphericalCoords(1, dayPhi, dayTheta);
  daySky.name = 'daysky';
  daySky.material.uniforms['sunPosition'].value.copy(daySun);
  daySky.material.uniforms['rayleigh'].value = 2;
  daySky.material.uniforms['turbidity'].value = 2;
  daySky.material.uniforms['mieCoefficient'].value = 0.0001;

  const nightSky = new Sky();
  nightSky.scale.setScalar(450000);
  const nightSun = new THREE.Vector3();
  const nightPhi = THREE.MathUtils.degToRad(190);
  const nightTheta = THREE.MathUtils.degToRad(180);
  nightSun.setFromSphericalCoords(1, nightPhi, nightTheta);
  nightSky.name = 'nightsky';
  nightSky.material.uniforms['sunPosition'].value.copy(nightSun);
  nightSky.material.uniforms['rayleigh'].value = 0.1;
  nightSky.material.uniforms['turbidity'].value = 0.1;
  nightSky.material.uniforms['mieCoefficient'].value = 0.005;
  nightSky.material.uniforms['mieDirectionalG'].value = 0.8;

  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices, 3),
  );
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
  const stars = new THREE.Points(starGeometry, starMaterial);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1; // tweak for brightness
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  initializeMoveHandler({ scene, camera, renderer });

  // Grid
  const gridSize = 1000;
  const gridDivisions = 1000;
  const grid = createGrid(gridSize, gridDivisions);
  scene.add(grid);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.size = 0.3;
  transformControls.showY = false;
  transformControls.space = 'world';
  controls.target.set(0, 0, 0);

  // State
  let isDay = true;
  let isZoomMode = false;
  let startPoint: THREE.Vector2 | null = null;
  let overlayCanvas: HTMLCanvasElement | null = null;
  let overlayContext: CanvasRenderingContext2D | null = null;

  scene.add(daySky);

  const textureLoader = new THREE.TextureLoader();
  const wallTexture = textureLoader.load('/WallTexture.jpg');
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(1, 1);

  const floorTexture = textureLoader.load('/img2_6.jpg');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(2, 2);

  const stoneTex = textureLoader.load('/img14_64.jpg');
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  stoneTex.repeat.set(1.5, 1.5);

  const counterTexture = textureLoader.load('/img14_64.jpg');
  counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
  counterTexture.repeat.set(2, 1);

  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.position.set(10, 15, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.radius = 4; // softer edge
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 50;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemiLight);

  const toggleSky = () => {
    if (isDay) {
      scene.remove(daySky);
      scene.add(nightSky);
      scene.add(stars);
      ambientLight.intensity = 0.5;
      directionalLight.intensity = 0.2;
    } else {
      scene.remove(nightSky);
      scene.remove(stars);
      scene.add(daySky);
      ambientLight.intensity = 1.5;
      directionalLight.intensity = 1;
    }
    isDay = !isDay;
  };

  addCTypeWallWithFloor(scene, wallTexture, floorTexture);

  const loadSinkModel = async (url: string) => {
    let counterMesh = scene.getObjectByName(
      'Counter_CenterWall',
    ) as THREE.Mesh | null;
    if (!counterMesh) {
      const lShape = scene.getObjectByName(
        'LShapeKitchenPlatform',
      ) as THREE.Group | null;
      if (lShape) {
        counterMesh = lShape.children.find(
          (c) => c.name === 'Back Counter',
        ) as THREE.Mesh | null;
      }
    }
    if (!counterMesh) {
      scene.traverse((o) => {
        if (
          !counterMesh &&
          o instanceof THREE.Mesh &&
          o.name.startsWith('Counter_')
        )
          counterMesh = o;
      });
    }
    if (!counterMesh) return;
    const mesh = counterMesh as THREE.Mesh;

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((n: any) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
        // Normalize scale roughly to fit a typical 800x450mm sink footprint
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetW = 0.8;
        const targetD = 0.45;
        const scale = Math.min(
          targetW / Math.max(size.x, 0.0001),
          targetD / Math.max(size.z, 0.0001),
        );
        model.scale.setScalar(scale);
        // Recompute bounds after scale
        const box2 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        model.position.sub(center);
        // Place on counter slightly inset from front edge
        model.position.x = mesh.position.x - 2;
        model.position.y = 0.52;
        model.position.z = mesh.position.z;
        // model.rotation.y = Math.PI / 2;
        model.name = 'SinkGLB';
        scene.add(model);
      },
      undefined,
      (err) => {
        console.error('Failed to load sink model', err);
      },
    );
  };

  const toggleZoomMode = (enable: boolean) => {
    isZoomMode = enable;
    if (enable) {
      document.body.style.cursor = 'zoom-in';
      controls.enabled = false;
      renderer.domElement.addEventListener('mousedown', onMouseDown);
    } else {
      document.body.style.cursor = 'default';
      controls.enabled = true;
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      if (overlayCanvas && overlayCanvas.parentNode) {
        overlayCanvas.parentNode.removeChild(overlayCanvas);
        overlayCanvas = null;
        overlayContext = null;
      }
    }
  };

  const toggle2DMode = (is2D: boolean) => {
    if (is2D) {
      camera = orthographicCamera;
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.enableZoom = true;
      transformControls.showY = false;
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 0, 0);
    } else {
      camera = perspectiveCamera;
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      transformControls.showY = true;
      camera.position.set(0, 1, 4.5);
      camera.lookAt(0, 0, 0);
    }
    controls.object = camera;
    transformControls.camera = camera;
    controls.update();
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const getObjectsBoundingBox = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    startPoint: THREE.Vector2,
    endPoint: THREE.Vector2,
  ): {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  } | null => {
    const raycaster = new THREE.Raycaster();
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    const selectableObjects = scene.children.filter(
      (obj) =>
        !(obj instanceof THREE.GridHelper) &&
        !(obj instanceof Sky) &&
        obj !== scene.getObjectByName('stars'),
    );

    const xMin = Math.min(startPoint.x, endPoint.x);
    const xMax = Math.max(startPoint.x, endPoint.x);
    const yMin = Math.min(startPoint.y, endPoint.y);
    const yMax = Math.max(startPoint.y, endPoint.y);

    const steps = 5;
    let hitAnyObject = false;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const y = yMin + (yMax - yMin) * (j / steps);
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersects = raycaster.intersectObjects(selectableObjects, true);

        if (intersects.length > 0) {
          const point = intersects[0].point;
          min.min(point);
          max.max(point);
          hitAnyObject = true;
        }
      }
    }

    if (!hitAnyObject) {
      return null;
    }

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    return { min, max, center };
  };

  const onMouseDown = (event: MouseEvent) => {
    if (!isZoomMode) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    startPoint = new THREE.Vector2(x, y);

    overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
    mount.appendChild(overlayCanvas);
    overlayContext = overlayCanvas.getContext('2d');

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp, { once: true });
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!startPoint || !isZoomMode || !overlayCanvas || !overlayContext) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = ((startPoint.x + 1) / 2) * rect.width;
    const startY = ((-startPoint.y + 1) / 2) * rect.height;

    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const width = currentX - startX;
    const height = currentY - startY;

    overlayContext.strokeStyle = 'green';
    overlayContext.fillStyle = 'rgba(0, 255, 0, 0.1)';
    overlayContext.lineWidth = 2;
    overlayContext.beginPath();
    overlayContext.rect(startX, startY, width, height);
    overlayContext.fill();
    overlayContext.stroke();
  };

  const onMouseUp = (event: MouseEvent) => {
    if (!startPoint) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const endPoint = new THREE.Vector2(x, y);

    if (overlayCanvas && overlayCanvas.parentNode) {
      overlayCanvas.parentNode.removeChild(overlayCanvas);
      overlayCanvas = null;
      overlayContext = null;
    }

    const objectBounds = getObjectsBoundingBox(
      scene,
      camera,
      startPoint,
      endPoint,
    );

    if (!objectBounds) {
      startPoint = null;
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      toggleZoomMode(false);
      return;
    }

    const { min, max, center } = objectBounds;

    if (camera instanceof THREE.PerspectiveCamera) {
      const width = max.x - min.x;
      const height = max.y - min.y;
      const depth = max.z - min.z;
      const fovRad = camera.fov * (Math.PI / 180);
      const aspect = window.innerWidth / window.innerHeight;
      const maxDimension = Math.max(width, height, depth);
      let distance: number;

      if (width / height > aspect) {
        distance = maxDimension / 2 / Math.tan(fovRad / 2);
      } else {
        distance = maxDimension / 2 / (Math.tan(fovRad / 2) * aspect);
      }

      distance = Math.max(distance * 1.2, 0.1);

      const direction = camera
        .getWorldDirection(new THREE.Vector3())
        .normalize();
      const newPosition = center
        .clone()
        .add(direction.clone().negate().multiplyScalar(distance));

      camera.position.copy(newPosition);
      camera.lookAt(center);
      controls.target.copy(center);
    } else {
      // Orthographic camera zoom
      const width = max.x - min.x;
      const height = max.z - min.z; // Use Z for depth in 2D top-down
      const aspect = window.innerWidth / window.innerHeight;
      const maxDimension = Math.max(width, height);
      const newZoom = Math.min(
        window.innerWidth / maxDimension,
        window.innerHeight / (maxDimension / aspect),
      );

      camera.zoom = newZoom * 0.8; // Slightly zoom out
      camera.position.set(center.x, 10, center.z);
      camera.lookAt(center.x, 0, center.z);
      controls.target.set(center.x, 0, center.z);
      camera.updateProjectionMatrix();
    }

    controls.update();

    startPoint = null;
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    toggleZoomMode(false);
  };

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    } else {
      const aspect = window.innerWidth / window.innerHeight;
      const zoom = camera.zoom;
      camera.left = -zoom * aspect;
      camera.right = zoom * aspect;
      camera.top = zoom;
      camera.bottom = -zoom;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (overlayCanvas) {
      overlayCanvas.width = window.innerWidth;
      overlayCanvas.height = window.innerHeight;
    }
  };
  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    controls,
    mount,
    transformControls,
    toggleSky,
    isDay,
    toggleZoomMode,
    isZoomMode,
    toggle2DMode,
    addSimpleCabinet: () => addSimpleCabinet(scene),
    addSimpleTVUnit: () => addSimpleTVUnit(scene),
    addSimpleTable: () => addSimpleTable(scene),
    addComputerDesk: () => addComputerDesk(scene),
    // addBaseCabinetsUnderPlatform,
    // addFullKitchenSetup,
    loadSinkModel,
    // exportRenderPNG: (options?: { width?: number; height?: number; filename?: string; download?: boolean }) => {
    //   exportRenderPNG(renderer, scene, camera, options);
    // },
    addUpperCabinetsAbovePlatform,
    addDoubleDoorUpperCabinetsAbovePlatform,
    // addChimneyWithGlassCabinets,
    // loadHandleModel,
  };
};

export const cleanupThreeDView = (view: ThreeDView) => {
  window.removeEventListener('resize', () => {});
  if (view.mount && view.renderer.domElement) {
    view.mount.removeChild(view.renderer.domElement);
  }
};

const addCTypeWallWithFloor = (
  scene: THREE.Scene,
  wallTexture: THREE.Texture,
  floorTexture: THREE.Texture,
) => {
  const wallHeight = 3;
  const wallThickness = 0.05;
  const wallLength = 5;
  // ---------- Materials ----------
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTexture,
    side: THREE.DoubleSide,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    side: THREE.DoubleSide,
  });

  // ---------- Panels ----------
  // Back wall
  const centerPanel = new THREE.Mesh(
    new THREE.BoxGeometry(
      wallLength - 2 * wallThickness,
      wallHeight,
      wallThickness,
    ),
    wallMat,
  );
  centerPanel.name = 'Center Wall';
  centerPanel.castShadow = true;
  centerPanel.receiveShadow = true;
  centerPanel.position.set(0, wallHeight / 2, 0);

  // Left wall
  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, wallLength),
    wallMat,
  );
  leftPanel.name = 'Left Wall';
  leftPanel.castShadow = true;
  leftPanel.receiveShadow = true;
  leftPanel.position.set(
    -wallLength / 2 + wallThickness / 2,
    wallHeight / 2,
    wallLength / 2 - wallThickness / 2,
  );

  // Right wall
  const rightPanel = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, wallLength),
    wallMat,
  );
  rightPanel.name = 'Right Wall';
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;
  rightPanel.position.set(
    wallLength / 2 - wallThickness / 2,
    wallHeight / 2,
    wallLength / 2 - wallThickness / 2,
  );

  // ---------- Floor ----------
  // Slightly larger than inside of C so it meets wall edges
  const floorPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(wallLength, wallLength), // square floor
    floorMat,
  );
  floorPanel.rotation.x = -Math.PI / 2;
  floorPanel.castShadow = true;
  floorPanel.receiveShadow = true;
  floorPanel.position.set(
    0,
    toAvoidOverlap,
    wallLength / 2 - wallThickness / 2,
  );

  // ---------- Group ----------
  const cWallGroup = new THREE.Group();
  cWallGroup.name = 'cWallWithFloor';
  cWallGroup.add(centerPanel, leftPanel, rightPanel, floorPanel);
  scene.add(cWallGroup);
};

export const addLShapeKitchenPlatform = (
  scene: THREE.Scene,
  counterTexture: THREE.Texture,
) => {
  // ---- Dimensions ----
  const platformHeight = 0.7; // 90 cm from floor
  const countertopThickness = 0.05; // 5 cm thick slab
  const depth = 0.74; // 60 cm countertop depth
  const lengthBack = 5; // same as wall length
  const lengthLeft = 3; // how far it runs along the left wall

  // ---- Material ----
  const counterMat = new THREE.MeshStandardMaterial({
    map: counterTexture,
    roughness: 0.4,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // ---- Back (center) run ----
  const backCounter = new THREE.Mesh(
    new THREE.BoxGeometry(lengthBack, countertopThickness, depth),
    counterMat,
  );
  backCounter.name = 'Back Counter';
  backCounter.castShadow = true;
  backCounter.receiveShadow = true;
  backCounter.position.set(
    0,
    platformHeight + countertopThickness / 2,
    depth / 2,
  );

  // ---- Left run ----
  const leftCounter = new THREE.Mesh(
    new THREE.BoxGeometry(depth, countertopThickness, lengthLeft),
    counterMat,
  );
  leftCounter.name = 'Left Counter';
  leftCounter.castShadow = true;
  leftCounter.receiveShadow = true;
  leftCounter.position.set(
    -lengthBack / 2 + depth / 1.8,
    platformHeight + countertopThickness / 2,
    lengthLeft / 2 + depth,
  );

  // ---- Group and add to scene ----
  const lKitchenGroup = new THREE.Group();
  lKitchenGroup.name = 'LShapeKitchenPlatform';
  lKitchenGroup.add(backCounter, leftCounter);
  scene.add(lKitchenGroup);
};

export const addSimpleCabinet = (scene: THREE.Scene) => {
  // Standard cabinet dimensions in meters
  const width = 1.5; // 600mm
  const height = 2; // 700mm
  const depth = 0.4; // 400mm
  const thickness = 0.018; // 18mm board

  // Base Y (floor)
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }

  // Find Center Wall to place cabinet against
  const centerWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  let placeX = 0;
  let placeZ = depth / 2 + 0.02; // fallback slightly away from origin
  if (centerWall) {
    const params = (centerWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    // Cabinet center Z so that its back sits just in front of the wall
    placeZ = centerWall.position.z + wallDepth / 2 + depth / 2 + 0.005;
  }

  // Texture
  const textureLoader = new THREE.TextureLoader();
  const woodTex = textureLoader.load('/textures/light_wood.jpg');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 1);

  const plankMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.6,
    metalness: 0.0,
  });

  // Create a parent Mesh container that represents the overall cabinet size
  // This gives us a single mesh with width/height/depth while keeping planks as children
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const cabinetContainer = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    invisibleMat,
  );
  cabinetContainer.name = 'SimpleCabinet';
  cabinetContainer.userData.isInvisibleBox = true; // treated as helper/invisible by utilities
  // Track base and last known dimensions for proportional rescaling later
  (cabinetContainer as any).userData = {
    ...(cabinetContainer as any).userData,
    baseDims: { width, height, depth },
    lastDims: { width, height, depth },
  };
  // Position container so bottom sits on floor
  cabinetContainer.position.set(placeX, floorY + height / 2, placeZ);

  // Left side panel (thickness x height x depth)
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, height, depth),
    plankMat,
  );
  left.castShadow = true;
  left.receiveShadow = true;
  left.name = 'LEFT_PLANK';
  left.position.set(-(width / 2 - thickness / 2), 0, 0);

  // Right side panel
  const right = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, height, depth),
    plankMat,
  );
  right.castShadow = true;
  right.receiveShadow = true;
  right.name = 'RIGHT_PLANK';
  right.position.set(width / 2 - thickness / 2, 0, 0);

  // Bottom panel (width - 2t x thickness x depth)
  const bottom = new THREE.Mesh(
    new THREE.BoxGeometry(width - thickness * 2, thickness, depth),
    plankMat,
  );
  bottom.castShadow = true;
  bottom.receiveShadow = true;
  bottom.name = 'BOTTOM_PLANK';
  bottom.position.set(0, -(height / 2 - thickness / 2), 0);

  // Top panel
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width - thickness * 2, thickness, depth),
    plankMat,
  );
  top.castShadow = true;
  top.receiveShadow = true;
  top.name = 'TOP_PLANK';
  top.position.set(0, height / 2 - thickness / 2, 0);

  // Back panel (width - 2t x height - 2t x thickness)
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(
      width - thickness * 2,
      height - thickness * 2,
      thickness,
    ),
    plankMat,
  );
  back.castShadow = true;
  back.receiveShadow = true;
  back.name = 'BACK_PLANK';
  back.position.set(0, 0, -(depth / 2 - thickness / 2));

  cabinetContainer.add(left, right, bottom, top, back);
  // Invisible volume inside cabinet carcass so vertical/horizontal planks can be added later
  const invisibleMatCab = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const invCab = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(width - thickness * 2, 0.02),
      Math.max(height - thickness * 2, 0.02),
      Math.max(depth - thickness * 2, 0.02),
    ),
    invisibleMatCab,
  );
  invCab.name = 'invisibleBox_cabinet';
  invCab.userData.isInvisibleBox = true;
  invCab.position.set(0, 0, 0);
  cabinetContainer.add(invCab);
  scene.add(cabinetContainer);
};

export const addSimpleTVUnit = (scene: THREE.Scene) => {
  // Dimensions (meters) approximating reference image
  const width = 1.6; // base span 1600mm
  const baseHeight = 0.26; // base box height
  const depth = 0.35; // 350mm
  const thickness = 0.018; // 18mm boards
  const gap = 0; // gap between base and vertical/shelves (set to 0 to connect the right vertical plank to the base top)
  const panelHeight = 1.0; // right vertical panel height
  const topShelfDepth = 0.25;
  const smallShelfDepth = 0.25;
  const smallShelfWidth = 0.35;
  const numCubbies = 4;

  // Base Y (floor)
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }

  // Place against Center Wall if available
  const centerWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  let placeX = 0;
  let placeZ = depth / 2 + 0.02;
  if (centerWall) {
    const params = (centerWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    placeZ = centerWall.position.z + wallDepth / 2 + depth / 2 + 0.005;
  }

  // Texture (reuse light wood)
  const textureLoader = new THREE.TextureLoader();
  const darkTex = textureLoader.load('/textures/wood_6.jpg');
  darkTex.wrapS = darkTex.wrapT = THREE.RepeatWrapping;
  darkTex.repeat.set(3, 1);
  const whiteTex = textureLoader.load('/textures/off_white.jpg');
  whiteTex.wrapS = whiteTex.wrapT = THREE.RepeatWrapping;
  whiteTex.repeat.set(1, 1);
  const darkMat = new THREE.MeshStandardMaterial({
    map: darkTex,
    roughness: 0.6,
    metalness: 0.0,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    map: whiteTex,
    roughness: 0.5,
    metalness: 0.0,
  });

  // Overall envelope
  const overallHeight = baseHeight + gap + panelHeight;
  const overallDepth = Math.max(depth, topShelfDepth);
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const container = new THREE.Mesh(
    new THREE.BoxGeometry(width, overallHeight, overallDepth),
    invisibleMat,
  );
  container.name = 'SimpleTVUnit';
  container.userData.isInvisibleBox = true;
  // Track base and last known dimensions for proportional rescaling later
  (container as any).userData = {
    ...(container as any).userData,
    baseDims: { width, height: overallHeight, depth: overallDepth },
    lastDims: { width, height: overallHeight, depth: overallDepth },
  };
  // Place so bottom touches floor (container is centered by geometry)
  container.position.set(placeX, floorY + overallHeight / 2, placeZ);
  // Children were authored around base center at y = floorY + baseHeight/2
  // Adjust all child local Y by this delta so their world Y stays the same
  const deltaY = floorY + baseHeight / 2 - container.position.y;

  // ===== Bottom unit: five-plank dark carcass with white top and 4 cubbies =====
  const bLeft = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, baseHeight, depth),
    darkMat,
  );
  bLeft.castShadow = true;
  bLeft.receiveShadow = true;
  bLeft.name = 'LEFT_PLANK';
  bLeft.position.set(-(width / 2 - thickness / 2), 0 + deltaY, 0);

  const bRight = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, baseHeight, depth),
    darkMat,
  );
  bRight.castShadow = true;
  bRight.receiveShadow = true;
  bRight.name = 'RIGHT_PLANK';
  bRight.position.set(width / 2 - thickness / 2, 0 + deltaY, 0);

  const bBottom = new THREE.Mesh(
    new THREE.BoxGeometry(width - thickness * 2, thickness, depth),
    darkMat,
  );
  bBottom.castShadow = true;
  bBottom.receiveShadow = true;
  bBottom.name = 'BOTTOM_PLANK';
  bBottom.position.set(0, -(baseHeight / 2 - thickness / 2) + deltaY, 0);

  // White top board on base
  const bTop = new THREE.Mesh(
    new THREE.BoxGeometry(width - thickness * 2, thickness, depth),
    whiteMat,
  );
  bTop.castShadow = true;
  bTop.receiveShadow = true;
  bTop.name = 'TOP_PLANK';
  bTop.position.set(0, baseHeight / 2 - thickness / 2 + deltaY, 0);

  // Internal dark dividers to create cubbies
  const cubbyWidth = (width - thickness * 2) / numCubbies;
  const dividers: THREE.Mesh[] = [];
  for (let i = 1; i < numCubbies; i++) {
    const x = -width / 2 + thickness + cubbyWidth * i;
    const div = new THREE.Mesh(
      new THREE.BoxGeometry(
        thickness,
        baseHeight - thickness * 2,
        depth - thickness * 2,
      ),
      darkMat,
    );
    div.castShadow = true;
    div.receiveShadow = true;
    div.name = `VERTICAL_PLANK_${i}`;
    div.position.set(x, 0 + deltaY, 0);
    dividers.push(div);
  }

  container.add(bLeft, bRight, bBottom, bTop, ...dividers);

  // ===== Upper C-type frame above the bottom unit =====
  // Right vertical dark panel (full depth)
  const vPanel = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, panelHeight, depth),
    darkMat,
  );
  vPanel.castShadow = true;
  vPanel.receiveShadow = true;
  vPanel.name = 'VERTICAL_PLANK_RIGHT_PANEL';
  vPanel.position.set(
    width / 2 - thickness / 2,
    baseHeight / 2 + gap + panelHeight / 2 + deltaY,
    0,
  );

  // Long white top shelf spanning across
  const tShelf = new THREE.Mesh(
    new THREE.BoxGeometry(width, thickness, topShelfDepth),
    whiteMat,
  );
  tShelf.castShadow = true;
  tShelf.receiveShadow = true;
  tShelf.name = 'HORIZONTAL_TOP_PLANK_SHELF';
  tShelf.position.set(
    0,
    baseHeight / 2 + gap + panelHeight - thickness / 2 + deltaY,
    depth / 2 - topShelfDepth / 2,
  );

  // Small white shelves on the right panel
  const smallShelvesY = [0.2, 0.45, 0.7]; // normalized along panel height
  const sShelves: THREE.Mesh[] = [];
  smallShelvesY.forEach((ratio, idx) => {
    const y = baseHeight / 2 + gap + ratio * panelHeight + deltaY;
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(smallShelfWidth, thickness, smallShelfDepth),
      whiteMat,
    );
    s.castShadow = true;
    s.receiveShadow = true;
    s.name = `HORIZONTAL_PLANK_SHELF_${idx}`;
    // mount to the left of the right panel
    s.position.set(
      width / 2 - thickness - smallShelfWidth / 2,
      y,
      depth / 2 - smallShelfDepth / 2,
    );
    sShelves.push(s);
  });

  container.add(vPanel, tShelf, ...sShelves);
  // Invisible compartments inside the TV base unit, aligned between dividers
  const invMatTV = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const innerDepthTV = Math.max(depth - thickness * 2, 0.02);
  const innerHeightTV = Math.max(baseHeight - thickness * 2, 0.02);
  for (let i = 0; i < numCubbies; i++) {
    const centerX = -width / 2 + thickness + cubbyWidth * (i + 0.5);
    const compWidth = Math.max(cubbyWidth - 0.02, 0.02);
    const invComp = new THREE.Mesh(
      new THREE.BoxGeometry(compWidth, innerHeightTV, innerDepthTV),
      invMatTV,
    );
    invComp.name = `invisibleBox_compartment_${i}_for_tvunit_base`;
    invComp.userData.isInvisibleBox = true;
    invComp.position.set(centerX, 0 + deltaY, 0);
    container.add(invComp);
  }
  scene.add(container);
};
export const addSimpleTable = (scene: THREE.Scene) => {
  // Simple rectangular dining/working table
  const topWidth = 1.5; // 1200mm
  const topDepth = 0.7; // 700mm
  const topThickness = 0.03; // 30mm slab
  const legThickness = 0.06; // 60mm square legs
  const height = 0.75; // 750mm table height

  // Base Y from floor
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }

  // Texture/material
  const textureLoader = new THREE.TextureLoader();
  const woodTex = textureLoader.load('/textures/light_wood.jpg');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 1);
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.55,
    metalness: 0.0,
  });

  // Invisible container Mesh with overall size
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const container = new THREE.Mesh(
    new THREE.BoxGeometry(topWidth, height, topDepth),
    invisibleMat,
  );
  container.name = 'SimpleTable';
  container.userData.isInvisibleBox = true;
  // Track base and last known dimensions for proportional rescaling later
  (container as any).userData = {
    ...(container as any).userData,
    baseDims: { width: topWidth, height, depth: topDepth },
    lastDims: { width: topWidth, height, depth: topDepth },
  };

  // Place roughly center of room, a bit in front of back wall
  const backWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  let centerZ = topDepth / 2 + 0.02; // fallback
  if (backWall) {
    const params = (backWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    centerZ = backWall.position.z + wallDepth / 2 + topDepth / 2 + 0.005;
  }
  // Place container so it encloses from floor to table top
  container.position.set(0, floorY + height / 2, centerZ);
  const deltaY = floorY - (container.position.y - height / 2); // shift from floor-origin authored children

  // Table top (container is centered; offset by height/2 so bottom touches floor)
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(topWidth, topThickness, topDepth),
    woodMat,
  );
  top.castShadow = true;
  top.receiveShadow = true;
  top.name = 'HORIZONTAL_TOP_PLANK';
  top.position.set(0, height / 2 - topThickness / 2 + deltaY, 0);

  // Legs positions
  const halfW = topWidth / 2 - legThickness / 2 - 0.02;
  const halfD = topDepth / 2 - legThickness / 2 - 0.02;
  const legPositions = [
    [-halfW, 0, -halfD],
    [halfW, 0, -halfD],
    [-halfW, 0, halfD],
    [halfW, 0, halfD],
  ];
  const legs: THREE.Mesh[] = [];
  legPositions.forEach((p, i) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(legThickness, height - topThickness, legThickness),
      woodMat,
    );
    leg.castShadow = true;
    leg.receiveShadow = true;
    leg.name = `VERTICAL_PLANK_${i}`;
    // Legs span from floor to underside of top => center at (-height/2) + (legHeight/2)
    leg.position.set(
      p[0],
      -height / 2 + (height - topThickness) / 2 + deltaY,
      p[2],
    );
    legs.push(leg);
  });

  container.add(top, ...legs);
  // Invisible volume to allow operations like adding planks inside the table footprint
  const invMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const invWidth = Math.max(topWidth - 0.02, 0.02);
  const invDepth = Math.max(topDepth - 0.02, 0.02);
  const invHeight = Math.max(height - topThickness, 0.02);
  const invisibleBoxTable = new THREE.Mesh(
    new THREE.BoxGeometry(invWidth, invHeight, invDepth),
    invMat,
  );
  invisibleBoxTable.name = 'invisibleBox_table';
  invisibleBoxTable.userData.isInvisibleBox = true;
  invisibleBoxTable.position.set(0, -height / 2 + invHeight / 2 + deltaY, 0);
  container.add(invisibleBoxTable);
  scene.add(container);
};

export const addComputerDesk = (scene: THREE.Scene) => {
  // Dimensions approximating the provided desk image (meters)
  const deskWidth = 1.4; // overall width
  const deskDepth = 0.55; // main top depth
  const deskHeight = 0.74; // top height
  const plank = 0.018; // 18mm
  const returnWidth = 0.5; // right return / storage width

  // Floor reference
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }

  // Textures/materials: walnut/dark for carcass, light/white for fronts
  const tl = new THREE.TextureLoader();
  const carcTex = tl.load('/textures/wood_6.jpg');
  carcTex.wrapS = carcTex.wrapT = THREE.RepeatWrapping;
  carcTex.repeat.set(2, 1);
  const frontTex = tl.load('/textures/off_white.jpg');
  frontTex.wrapS = frontTex.wrapT = THREE.RepeatWrapping;
  const carcMat = new THREE.MeshStandardMaterial({
    map: carcTex,
    roughness: 0.6,
  });
  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.45,
  });

  // Compute overall envelope
  const towerOuterH = deskHeight + 0.9;
  const overallHeight = Math.max(deskHeight, towerOuterH);
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const container = new THREE.Mesh(
    new THREE.BoxGeometry(deskWidth, overallHeight, deskDepth),
    invisibleMat,
  );
  container.name = 'ComputerDesk';
  container.userData.isInvisibleBox = true;
  // Track base and last known dimensions for proportional rescaling later
  (container as any).userData = {
    ...(container as any).userData,
    baseDims: { width: deskWidth, height: overallHeight, depth: deskDepth },
    lastDims: { width: deskWidth, height: overallHeight, depth: deskDepth },
  };

  // Place near back wall
  const backWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  let centerZ = deskDepth / 2 + 0.02; // fallback
  if (backWall) {
    const params = (backWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    centerZ = backWall.position.z + wallDepth / 2 + deskDepth / 2 + 0.005;
  }
  container.position.set(0, floorY + overallHeight / 2, centerZ);
  const deltaY = floorY - (container.position.y - overallHeight / 2);

  // Main desktop slab
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(deskWidth, plank * 2, deskDepth),
    carcMat,
  );
  top.castShadow = true;
  top.receiveShadow = true;
  top.name = 'HORIZONTAL_TOP_PLANK';
  top.position.set(0, -overallHeight / 2 + deskHeight - plank + deltaY, 0);

  // Left leg panel (open knee space)
  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(plank, deskHeight, deskDepth),
    carcMat,
  );
  leftLeg.position.set(
    -deskWidth / 2 + plank / 2,
    -overallHeight / 2 + deskHeight / 2 + deltaY,
    0,
  );
  leftLeg.name = 'VERTICAL_PLANK_LEFT';
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;

  // Right storage tower base footprint
  const towerOuterW = returnWidth;
  const towerOuterD = deskDepth;

  const towerLeft = new THREE.Mesh(
    new THREE.BoxGeometry(plank, towerOuterH, towerOuterD),
    carcMat,
  );
  const towerRight = new THREE.Mesh(
    new THREE.BoxGeometry(plank, towerOuterH, towerOuterD),
    carcMat,
  );
  const towerBack = new THREE.Mesh(
    new THREE.BoxGeometry(
      towerOuterW - plank * 2,
      towerOuterH - plank * 2,
      plank,
    ),
    carcMat,
  );
  const towerBottom = new THREE.Mesh(
    new THREE.BoxGeometry(towerOuterW - plank * 2, plank, towerOuterD),
    carcMat,
  );
  const towerTop = new THREE.Mesh(
    new THREE.BoxGeometry(towerOuterW - plank * 2, plank, towerOuterD),
    carcMat,
  );
  towerLeft.name = 'VERTICAL_PLANK_TOWER_LEFT';
  towerLeft.position.set(
    deskWidth / 2 - towerOuterW + plank / 2,
    -overallHeight / 2 + towerOuterH / 2 + deltaY,
    0,
  );
  towerRight.name = 'VERTICAL_PLANK_TOWER_RIGHT';
  towerRight.position.set(
    deskWidth / 2 - plank / 2,
    -overallHeight / 2 + towerOuterH / 2 + deltaY,
    0,
  );
  towerBack.name = 'BACK_PLANK_TOWER';
  towerBack.position.set(
    deskWidth / 2 - towerOuterW / 2,
    -overallHeight / 2 + towerOuterH / 2 + deltaY,
    -towerOuterD / 2 + plank / 2,
  );
  towerBottom.name = 'HORIZONTAL_PLANK_TOWER_BOTTOM';
  towerBottom.position.set(
    deskWidth / 2 - towerOuterW / 2,
    -overallHeight / 2 + plank / 2 + deltaY,
    0,
  );
  towerTop.name = 'HORIZONTAL_PLANK_TOWER_TOP';
  towerTop.position.set(
    deskWidth / 2 - towerOuterW / 2,
    -overallHeight / 2 + towerOuterH - plank / 2 + deltaY,
    0,
  );

  // Open shelf under top (binders area)
  const shelfClearH = 0.3; // normalized along panel height
  const midShelf = new THREE.Mesh(
    new THREE.BoxGeometry(towerOuterW - plank * 2, plank, towerOuterD),
    carcMat,
  );
  midShelf.name = 'HORIZONTAL_PLANK_TOWER_MID';
  midShelf.position.set(
    deskWidth / 2 - towerOuterW / 2,
    -overallHeight / 2 + deskHeight + shelfClearH - plank / 2 + deltaY,
    0,
  );

  // Top over tower (continuous desktop look)
  const retTop = new THREE.Mesh(
    new THREE.BoxGeometry(towerOuterW, plank * 2, deskDepth),
    carcMat,
  );
  retTop.name = 'HORIZONTAL_PLANK_TOWER_LOWER';
  retTop.position.set(
    deskWidth / 2 - towerOuterW / 2,
    -overallHeight / 2 + deskHeight - plank + deltaY,
    0,
  );

  container.add(
    top,
    leftLeg,
    towerLeft,
    towerRight,
    towerBack,
    towerBottom,
    towerTop,
    midShelf,
    retTop,
  );
  // Invisible volumes for desk: knee space and tower interior
  const invMatDesk = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  // Knee space under desktop
  const kneeWidth = Math.max(deskWidth - returnWidth - plank, 0.05);
  const kneeHeight = Math.max(deskHeight - plank, 0.05);
  const kneeDepth = Math.max(deskDepth - 0.02, 0.02);
  const kneeCenterX = -deskWidth / 2 + kneeWidth / 2;
  const invisibleBoxDeskKnee = new THREE.Mesh(
    new THREE.BoxGeometry(kneeWidth, kneeHeight, kneeDepth),
    invMatDesk,
  );
  invisibleBoxDeskKnee.name = 'invisibleBox_computerdesk_kneespace';
  invisibleBoxDeskKnee.userData.isInvisibleBox = true;
  invisibleBoxDeskKnee.position.set(
    kneeCenterX,
    -overallHeight / 2 + kneeHeight / 2 + deltaY,
    0,
  );
  container.add(invisibleBoxDeskKnee);

  // Tower interior compartments (between horizontal planks)
  const horizontalPlanks = [towerBottom, retTop, midShelf, towerTop];
  horizontalPlanks.sort((a, b) => a.position.y - b.position.y);
  for (let i = 0; i < horizontalPlanks.length - 1; i++) {
    const lower = horizontalPlanks[i];
    const upper = horizontalPlanks[i + 1];
    const lowerH = (lower.geometry as THREE.BoxGeometry).parameters.height;
    const upperH = (upper.geometry as THREE.BoxGeometry).parameters.height;
    const lowerTopY = lower.position.y + lowerH / 2;
    const upperBottomY = upper.position.y - upperH / 2;
    const compHeight = Math.max(upperBottomY - lowerTopY, 0.02);
    const compY = (lowerTopY + upperBottomY) / 2;
    const innerW = Math.max(returnWidth - plank * 2, 0.05);
    const innerD = Math.max(deskDepth - plank * 2, 0.05);
    const invComp = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, compHeight, innerD),
      invMatDesk,
    );
    invComp.name = `invisibleBox_compartment_${i}_for_computerdesk_tower`;
    invComp.userData.isInvisibleBox = true;
    invComp.userData.type = 'INVISIBLE_COMPARTMENT';
    invComp.userData.dimensions = {
      width: innerW,
      height: compHeight,
      depth: innerD,
    };
    invComp.position.set(deskWidth / 2 - returnWidth / 2, compY, 0);
    container.add(invComp);
  }
  scene.add(container);
};
export const addPlatformOnWall = (
  scene: THREE.Scene,
  wallMesh: THREE.Mesh,
  counterTexture: THREE.Texture,
) => {
  const platformHeight = 0.7;
  const countertopThickness = 0.05;
  const defaultProtrusion = 0.74; // Fixed protrusion depth/width for new platforms

  const counterMat = new THREE.MeshStandardMaterial({
    map: counterTexture,
    roughness: 0.4,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // Derive wall geometry params
  const params = (wallMesh.geometry as THREE.BoxGeometry).parameters as any;
  const wallW = params.width as number;
  const wallD = params.depth as number;

  // Create a group to hold the platform
  const platformGroup = new THREE.Group();
  platformGroup.name = `Platform_${wallMesh.name}`;

  // Compute floor Y from existing floor panel
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }

  if (wallMesh.name === 'Center Wall') {
    // Compute wall span along X
    const wallCenterX = wallMesh.position.x;
    const halfLengthX = wallW / 2;
    let leftStartX = wallCenterX - halfLengthX;
    let rightEndX = wallCenterX + halfLengthX;

    // Check for existing side platforms and adjust span
    const leftPlat = scene.getObjectByName('Counter_LeftWall') as
      | THREE.Mesh
      | undefined;
    if (leftPlat) {
      const leftPlatParams = (leftPlat.geometry as THREE.BoxGeometry)
        .parameters as any;
      const leftProtrusion = leftPlatParams.width as number;
      const leftInnerEndX = leftPlat.position.x + leftProtrusion / 2;
      leftStartX = Math.max(leftStartX, leftInnerEndX);
    }

    const rightPlat = scene.getObjectByName('Counter_RightWall') as
      | THREE.Mesh
      | undefined;
    if (rightPlat) {
      const rightPlatParams = (rightPlat.geometry as THREE.BoxGeometry)
        .parameters as any;
      const rightProtrusion = rightPlatParams.width as number;
      const rightInnerStartX = rightPlat.position.x - rightProtrusion / 2;
      rightEndX = Math.min(rightEndX, rightInnerStartX);
    }

    const lengthX = Math.max(rightEndX - leftStartX, 0.1);
    const centerX = (leftStartX + rightEndX) / 2;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(lengthX, countertopThickness, defaultProtrusion),
      counterMat,
    );
    top.castShadow = true;
    top.receiveShadow = true;
    top.name = 'Counter_CenterWall';
    top.position.set(
      centerX,
      platformHeight + countertopThickness / 2,
      wallMesh.position.z + wallD / 2 + defaultProtrusion / 2,
    );
    platformGroup.add(top);

    // Invisible box from underside to floor
    const ibHeight = top.position.y - countertopThickness / 2 - floorY;
    if (ibHeight > 0.001) {
      const invisibleMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const invisible = new THREE.Mesh(
        new THREE.BoxGeometry(lengthX, ibHeight, defaultProtrusion),
        invisibleMat,
      );
      invisible.name = 'invisibleBox_platform_center';
      invisible.position.set(
        top.position.x,
        floorY + ibHeight / 2,
        top.position.z,
      );
      platformGroup.add(invisible);
    }
  } else if (wallMesh.name === 'Left Wall' || wallMesh.name === 'Right Wall') {
    // Compute wall span along Z
    const wallCenterZ = wallMesh.position.z;
    const halfRunZ = wallD / 2; // wallD is params.depth for sides
    const minZ = wallCenterZ - halfRunZ;
    const maxZ = wallCenterZ + halfRunZ;

    // Check for existing back platform and adjust run
    const backPlat = scene.getObjectByName('Counter_CenterWall') as
      | THREE.Mesh
      | undefined;
    let startZ = minZ;
    if (backPlat) {
      const backPlatParams = (backPlat.geometry as THREE.BoxGeometry)
        .parameters as any;
      const backProtrusion = backPlatParams.depth as number;
      startZ = backPlat.position.z + backProtrusion / 2;
    }
    const effectiveRun = Math.max(maxZ - startZ, 0.1);
    const centerZ = startZ + effectiveRun / 2;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(
        defaultProtrusion,
        countertopThickness,
        effectiveRun,
      ),
      counterMat,
    );
    top.castShadow = true;
    top.receiveShadow = true;
    top.name = `Counter_${wallMesh.name.replace(' ', '')}`;
    const dir = wallMesh.name === 'Left Wall' ? +1 : -1;
    top.position.set(
      wallMesh.position.x + dir * (wallW / 2 + defaultProtrusion / 2),
      platformHeight + countertopThickness / 2,
      centerZ,
    );
    platformGroup.add(top);

    // Invisible box from underside to floor
    const ibHeight = top.position.y - countertopThickness / 2 - floorY;
    if (ibHeight > 0.001) {
      const invisibleMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const invisible = new THREE.Mesh(
        new THREE.BoxGeometry(defaultProtrusion, ibHeight, effectiveRun),
        invisibleMat,
      );
      const wallTag = wallMesh.name === 'Left Wall' ? 'leftwall' : 'rightwall';
      invisible.name = `invisibleBox_platform_${wallTag}`;
      invisible.position.set(
        top.position.x,
        floorY + ibHeight / 2,
        top.position.z,
      );
      platformGroup.add(invisible);
    }
  } else {
    // Fallback: ignore unknown wall
    return;
  }

  scene.add(platformGroup);
  store.dispatch(setobjectSelected(null));
  store.dispatch(setSelectedChildObject(null));
  store.dispatch(setHoverdMesh(null));
  removeExistingLines();
};

export const addVerticalPlanksInsideBox = (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (!boxMesh || count <= 0) return;
  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018; // 18mm
  const edgeClearance = Math.max(0.01, thickness); // keep away from corners

  // Detect orientation: for left/right wall platform boxes, distribute planks along Z (wall length)
  const isSideWallBox =
    boxMesh.name.includes('platform_leftwall') ||
    boxMesh.name.includes('platform_rightwall');

  // For center wall: divide along X (width). For side wall: divide along Z (depth)
  const span = isSideWallBox ? depth : width;
  const innerSpan = span - 2 * edgeClearance;
  if (innerSpan <= thickness) return;

  const interval = innerSpan / (count + 1);
  const parent = boxMesh.parent ?? scene;

  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xd9c7b8,
    roughness: 0.7,
  });

  // Remove the original container invisible box; we'll create compartment boxes instead
  if (boxMesh.parent) {
    boxMesh.parent.remove(boxMesh);
  } else {
    scene.remove(boxMesh);
  }

  // Store compartment config on parent for later refresh
  parent.userData.compartmentConfig = {
    isHorizontal: false,
    isSideWall: isSideWallBox,
    boundsMin: -span / 2 + edgeClearance,
    boundsMax: span / 2 - edgeClearance,
    height: height,
    perpSize: isSideWallBox ? width : depth,
    centerY: center.y,
    centerPerp: isSideWallBox ? center.x : center.z,
    thickness: thickness,
    groupName: boxMesh.name,
  };

  // Calculate height above skirting
  const skirtingHeight = 0.06;
  const heightAboveSkirting = height - skirtingHeight;
  const plankY =
    center.y - height / 2 + skirtingHeight + heightAboveSkirting / 2; // Adjusted to center planks above skirting

  for (let i = 1; i <= count; i++) {
    if (isSideWallBox) {
      // Side wall: divide along Z. Plank is thin in Z, full in X
      const zLocal = -depth / 2 + edgeClearance + interval * i;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(width, heightAboveSkirting, thickness),
        plankMat,
      );
      plank.castShadow = true;
      plank.receiveShadow = true;
      plank.name = `VERTICAL_PLANK_${i}_for_${boxMesh.name}`;
      // Add userData to help with dimension detection
      plank.userData.isVerticalPlank = true;
      plank.userData.isSideWall = isSideWallBox;
      plank.userData.dimensions = {
        width: width,
        height: heightAboveSkirting,
        depth: thickness,
      };
      // Attach API response per created plank (index-aligned) and selected item context
      if (apiResponseDataArray && apiResponseDataArray[i - 1]) {
        plank.userData.apiData = apiResponseDataArray[i - 1];
        // Also expose a flat objectId on userData (separate from apiData)
        const apiI = apiResponseDataArray[i - 1] as any;
        plank.userData.objectId =
          apiI?.id ??
          apiI?.objectId ??
          (apiI?.data && apiI.data.id) ??
          undefined;
        // Mirror api data to Redux store object if exists
        try {
          const objInStore = store
            .getState()
            .data.objects.find((o) => o.id === plank.userData.objectId);
          if (objInStore) {
            const rules = plank.userData?.apiData?.rules;
            const dims = plank.userData?.dimensions;
            store.dispatch(
              updateObject({
                ...objInStore,
                apiData: plank.userData.apiData,
                rules,
                ...(dims && {
                  width: dims.width,
                  height: dims.height,
                  depth: dims.depth,
                }),
                position: {
                  x: plank.position.x,
                  y: plank.position.y,
                  z: plank.position.z,
                },
              } as any),
            );
          }
        } catch {}
      }
      if (selectedCabinetItem) {
        plank.userData.cabinetItem = selectedCabinetItem;
      }
      // Position plank above skirting
      plank.position.set(center.x, plankY, center.z + zLocal);
      parent.add(plank);
    } else {
      // Center wall: divide along X (existing behavior)
      const xLocal = -width / 2 + edgeClearance + interval * i;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, heightAboveSkirting, depth),
        plankMat,
      );
      plank.castShadow = true;
      plank.receiveShadow = true;
      plank.name = `VERTICAL_PLANK_${i}_for_${boxMesh.name}`;
      // Add userData to help with dimension detection
      plank.userData.isVerticalPlank = true;
      plank.userData.isSideWall = isSideWallBox;
      plank.userData.dimensions = {
        width: thickness,
        height: heightAboveSkirting,
        depth: depth,
      };
      // Attach API response per created plank (index-aligned) and selected item context
      if (apiResponseDataArray && apiResponseDataArray[i - 1]) {
        plank.userData.apiData = apiResponseDataArray[i - 1];
        // Also expose a flat objectId on userData (separate from apiData)
        const apiI = apiResponseDataArray[i - 1] as any;
        plank.userData.objectId =
          apiI?.id ??
          apiI?.objectId ??
          (apiI?.data && apiI.data.id) ??
          undefined;
        // Mirror api data to Redux store object if exists
        try {
          const objInStore = store
            .getState()
            .data.objects.find((o) => o.id === plank.userData.objectId);
          if (objInStore) {
            const rules = plank.userData?.apiData?.rules;
            const dims = plank.userData?.dimensions;
            store.dispatch(
              updateObject({
                ...objInStore,
                apiData: plank.userData.apiData,
                rules,
                ...(dims && {
                  width: dims.width,
                  height: dims.height,
                  depth: dims.depth,
                }),
                position: {
                  x: plank.position.x,
                  y: plank.position.y,
                  z: plank.position.z,
                },
              } as any),
            );
          }
        } catch {}
      }
      if (selectedCabinetItem) {
        plank.userData.cabinetItem = selectedCabinetItem;
      }
      // Position plank above skirting
      plank.position.set(center.x + xLocal, plankY, center.z);
      parent.add(plank);
    }
  }

  // Add kitchen skirting (toe kick) along front at floor only if it's a platform box
  const isPlatform = boxMesh.name.includes('platform');
  if (isPlatform) {
    let floorY = 0;
    const cWallGroup = scene.getObjectByName(
      'cWallWithFloor',
    ) as THREE.Group | null;
    if (cWallGroup) {
      const floorObj = cWallGroup.children.find(
        (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
      ) as THREE.Mesh | undefined;
      if (floorObj) floorY = floorObj.position.y;
    }
    const skirtingDepth = depth; // full depth
    const skirtingMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
    });
    const skirting = new THREE.Mesh(
      new THREE.BoxGeometry(width, skirtingHeight, skirtingDepth),
      skirtingMat,
    );
    skirting.name = `Skirting_for_${boxMesh.name}`;
    skirting.castShadow = true;
    skirting.receiveShadow = true;
    skirting.position.set(center.x, floorY + skirtingHeight / 2, center.z);
    parent.add(skirting);
  }

  // Create invisible boxes for compartments between planks (and sides)
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  for (let i = 0; i <= count; i++) {
    if (isSideWallBox) {
      const nearLocal = -depth / 2 + edgeClearance + interval * i;
      const farLocal = nearLocal + interval;
      const compDepth = Math.max(interval - thickness, 0.02);
      const compCenterZ = (nearLocal + farLocal) / 2;
      const inv = new THREE.Mesh(
        new THREE.BoxGeometry(width, heightAboveSkirting, compDepth),
        invisibleMat,
      );
      inv.name = `invisibleBox_compartment_${i}_for_${boxMesh.name}`;
      // Tag compartment type for downstream selection/placement logic
      inv.userData.type = 'INVISIBLE_COMPARTMENT';
      inv.userData.dimensions = {
        width: width,
        height: heightAboveSkirting,
        depth: compDepth,
      };
      // Position compartment above skirting to match plank positioning
      inv.position.set(center.x, plankY, center.z + compCenterZ);
      parent.add(inv);
    } else {
      const leftEdgeLocal = -width / 2 + edgeClearance + interval * i;
      const rightEdgeLocal = leftEdgeLocal + interval;
      const compWidth = Math.max(interval - thickness, 0.02);
      const compCenterX = (leftEdgeLocal + rightEdgeLocal) / 2;
      const inv = new THREE.Mesh(
        new THREE.BoxGeometry(compWidth, heightAboveSkirting, depth),
        invisibleMat,
      );
      inv.name = `invisibleBox_compartment_${i}_for_${boxMesh.name}`;
      // Tag compartment type for downstream selection/placement logic
      inv.userData.type = 'INVISIBLE_COMPARTMENT';
      inv.userData.dimensions = {
        width: compWidth,
        height: heightAboveSkirting,
        depth: depth,
      };
      // Position compartment above skirting to match plank positioning
      inv.position.set(center.x + compCenterX, plankY, center.z);
      parent.add(inv);
    }
  }
};

export const addHorizontalPlanksInsideBox = (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (!boxMesh || count <= 0) return;

  // Get actual size of box, safer than relying on .parameters
  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);
  const innerHeight = height - 2 * edgeClearance;
  if (innerHeight <= thickness) return;

  const interval = innerHeight / (count + 1);
  const parent = boxMesh.parent ?? scene;

  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xd9c7b8,
    roughness: 0.7,
  });

  // Remove old invisible box
  if (boxMesh.parent) boxMesh.parent.remove(boxMesh);
  else scene.remove(boxMesh);

  for (let i = 1; i <= count; i++) {
    const yLocal = -height / 2 + edgeClearance + interval * i;
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      plankMat,
    );
    shelf.name = `HORIZONTAL_PLANK_${i}_for_${boxMesh.name}`;
    shelf.userData.isHorizontalPlank = true;
    shelf.userData.dimensions = {
      width: width,
      height: thickness,
      depth: depth,
    };
    // Attach API response per created shelf (index-aligned) and selected item context
    if (apiResponseDataArray && apiResponseDataArray[i - 1]) {
      shelf.userData.apiData = apiResponseDataArray[i - 1];
      // Also expose a flat objectId on userData (separate from apiData)
      const apiI = apiResponseDataArray[i - 1] as any;
      shelf.userData.objectId =
        apiI?.id ?? apiI?.objectId ?? (apiI?.data && apiI.data.id) ?? undefined;
      // Mirror api data to Redux store object if exists
      try {
        const objInStore = store
          .getState()
          .data.objects.find((o) => o.id === shelf.userData.objectId);
        if (objInStore) {
          const rules = shelf.userData?.apiData?.rules;
          const dims = shelf.userData?.dimensions;
          store.dispatch(
            updateObject({
              ...objInStore,
              apiData: shelf.userData.apiData,
              rules,
              ...(dims && {
                width: dims.width,
                height: dims.height,
                depth: dims.depth,
              }),
              position: {
                x: shelf.position.x,
                y: shelf.position.y,
                z: shelf.position.z,
              },
            } as any),
          );
        }
      } catch {}
    }
    if (selectedCabinetItem) {
      shelf.userData.cabinetItem = selectedCabinetItem;
    }

    shelf.castShadow = true;
    shelf.receiveShadow = true;

    // Place relative to box center
    shelf.position.set(center.x, center.y + yLocal, center.z);
    parent.add(shelf);
  }

  // 🔹 Create invisible boxes between shelves (like vertical planks do)
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  for (let i = 0; i <= count; i++) {
    const bottomY = -height / 2 + edgeClearance + interval * i;
    const topY = bottomY + interval;
    const compHeight = Math.max(interval - thickness, 0.02);
    const compCenterY = (bottomY + topY) / 2;

    const inv = new THREE.Mesh(
      new THREE.BoxGeometry(width, compHeight, depth),
      invisibleMat,
    );
    inv.name = `invisibleBox_compartment_${i}_for_${boxMesh.name}`;
    inv.position.set(center.x, center.y + compCenterY, center.z);
    parent.add(inv);
  }

  refreshInvisibleBoxesForPlank(scene, boxMesh);
};

export const addVerticalPlanksToBox = (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (!boxMesh || count <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const worldCenter = new THREE.Vector3();
  bbox.getCenter(worldCenter);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);
  const span = Math.max(width, depth);
  const innerSpan = span - 2 * edgeClearance;
  if (innerSpan <= thickness) return;

  const interval = innerSpan / (count + 1);
  const parent = boxMesh.parent ?? scene;

  const localCenter = parent.worldToLocal(worldCenter.clone());

  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xd9c7b8,
    roughness: 0.7,
  });

  // Remove the original container invisible box
  if (boxMesh.parent) {
    boxMesh.parent.remove(boxMesh);
  } else {
    scene.remove(boxMesh);
  }

  // Determine division direction: along larger horizontal dimension (X or Z)
  const divideAlongX = width > depth;
  const isSideWallBox = !divideAlongX; // If dividing along Z, treat as side wall

  // Store compartment config on parent for later refresh (using local coordinates)
  parent.userData.compartmentConfig = {
    isHorizontal: false,
    isSideWall: isSideWallBox,
    isPlatform: false,
    skirtingHeight: 0,
    boundsMin: -innerSpan / 2,
    boundsMax: innerSpan / 2,
    height: height,
    perpSize: isSideWallBox ? width : depth,
    centerY: localCenter.y,
    centerPerp: localCenter[isSideWallBox ? 'x' : 'z'],
    thickness: thickness,
    groupName: boxMesh.name,
  };

  for (let i = 1; i <= count; i++) {
    const localPos = -innerSpan / 2 + interval * i;
    let plank;
    if (divideAlongX) {
      plank = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, depth),
        plankMat,
      );
    } else {
      plank = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, thickness),
        plankMat,
      );
    }
    plank.castShadow = true;
    plank.receiveShadow = true;
    plank.name = `VERTICAL_PLANK_${i}_for_${boxMesh.name}`;
    plank.userData.isVerticalPlank = true;
    plank.userData.dimensions = {
      width: divideAlongX ? thickness : width,
      height: height,
      depth: divideAlongX ? depth : thickness,
    };

    // Attach API response per created plank (index-aligned) and selected item context
    if (apiResponseDataArray && apiResponseDataArray[i - 1]) {
      plank.userData.apiData = apiResponseDataArray[i - 1];
      const apiI = apiResponseDataArray[i - 1] as any;
      plank.userData.objectId =
        apiI?.id ?? apiI?.objectId ?? (apiI?.data && apiI.data.id) ?? undefined;
      // Mirror api data to Redux store object if exists
      try {
        const objInStore = store
          .getState()
          .data.objects.find((o) => o.id === plank.userData.objectId);
        if (objInStore) {
          const rules = plank.userData?.apiData?.rules;
          const dims = plank.userData?.dimensions;
          store.dispatch(
            updateObject({
              ...objInStore,
              apiData: plank.userData.apiData,
              rules,
              ...(dims && {
                width: dims.width,
                height: dims.height,
                depth: dims.depth,
              }),
              position: {
                x: plank.position.x,
                y: plank.position.y,
                z: plank.position.z,
              },
            } as any),
          );
        }
      } catch {}
    }
    if (selectedCabinetItem) {
      plank.userData.cabinetItem = selectedCabinetItem;
    }

    // Set position in world, then convert to local
    const worldPos = worldCenter.clone();
    if (divideAlongX) {
      worldPos.x += localPos;
    } else {
      worldPos.z += localPos;
    }
    parent.add(plank);
    plank.position.copy(parent.worldToLocal(worldPos));
  }

  // Create invisible compartments between planks (and sides)
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  for (let i = 0; i <= count; i++) {
    const nearLocal = -innerSpan / 2 + interval * i;
    const farLocal = nearLocal + interval;
    const compSpan = Math.max(interval - thickness, 0.02);
    const compCenter = (nearLocal + farLocal) / 2;

    let inv;
    if (divideAlongX) {
      inv = new THREE.Mesh(
        new THREE.BoxGeometry(compSpan, height, depth),
        invisibleMat,
      );
    } else {
      inv = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, compSpan),
        invisibleMat,
      );
    }
    inv.name = `invisibleBox_compartment_${i}_for_${boxMesh.name}`;
    // Tag compartment type for downstream selection/placement logic
    inv.userData.type = 'INVISIBLE_COMPARTMENT';
    inv.userData.dimensions = {
      width: divideAlongX ? compSpan : width,
      height: height,
      depth: divideAlongX ? depth : compSpan,
    };

    // Set position in world, then convert to local
    const worldPos = worldCenter.clone();
    if (divideAlongX) {
      worldPos.x += compCenter;
    } else {
      worldPos.z += compCenter;
    }
    parent.add(inv);
    inv.position.copy(parent.worldToLocal(worldPos));
  }
};
export const addHorizontalPlanksToBox = (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (!boxMesh || count <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const worldCenter = new THREE.Vector3();
  bbox.getCenter(worldCenter);

  const width = size.x;
  const height = size.y;
  const depth = size.z;

  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);
  const innerHeight = height - 2 * edgeClearance;
  if (innerHeight <= thickness) return;

  const interval = innerHeight / (count + 1);
  const parent = boxMesh.parent ?? scene;

  const localCenter = parent.worldToLocal(worldCenter.clone());

  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xd9c7b8,
    roughness: 0.7,
  });

  // Remove old invisible box
  if (boxMesh.parent) boxMesh.parent.remove(boxMesh);
  else scene.remove(boxMesh);

  // Store config for refresh
  parent.userData.compartmentConfig = {
    isHorizontal: true,
    isPlatform: false,
    skirtingHeight: 0,
    boundsMin: -innerHeight / 2,
    boundsMax: innerHeight / 2,
    perpSizeX: width,
    perpSizeZ: depth,
    centerX: localCenter.x,
    centerZ: localCenter.z,
    thickness: thickness,
    groupName: boxMesh.name,
  };

  for (let i = 1; i <= count; i++) {
    const yLocal = -innerHeight / 2 + interval * i;
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      plankMat,
    );
    shelf.name = `HORIZONTAL_PLANK_${i}_for_${boxMesh.name}`;
    shelf.userData.isHorizontalPlank = true;
    shelf.userData.dimensions = {
      width: width,
      height: thickness,
      depth: depth,
    };
    if (apiResponseDataArray && apiResponseDataArray[i - 1]) {
      shelf.userData.apiData = apiResponseDataArray[i - 1];
      const apiI = apiResponseDataArray[i - 1] as any;
      shelf.userData.objectId =
        apiI?.id ?? apiI?.objectId ?? (apiI?.data && apiI.data.id) ?? undefined;
      try {
        const objInStore = store
          .getState()
          .data.objects.find((o) => o.id === shelf.userData.objectId);
        if (objInStore) {
          const rules = shelf.userData?.apiData?.rules;
          const dims = shelf.userData?.dimensions;
          store.dispatch(
            updateObject({
              ...objInStore,
              apiData: shelf.userData.apiData,
              rules,
              ...(dims && {
                width: dims.width,
                height: dims.height,
                depth: dims.depth,
              }),
              position: {
                x: shelf.position.x,
                y: shelf.position.y,
                z: shelf.position.z,
              },
            } as any),
          );
        }
      } catch {}
    }
    if (selectedCabinetItem) {
      shelf.userData.cabinetItem = selectedCabinetItem;
    }

    shelf.castShadow = true;
    shelf.receiveShadow = true;

    // Place relative to box center in world, then convert to local
    const worldPos = worldCenter.clone();
    worldPos.y += yLocal;
    parent.add(shelf);
    shelf.position.copy(parent.worldToLocal(worldPos));
  }

  // Create invisible boxes for compartments between planks (and top/bottom)
  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  for (let i = 0; i <= count; i++) {
    const bottomY = -innerHeight / 2 + interval * i;
    const topY = bottomY + interval;
    const compHeight = Math.max(interval - thickness, 0.02);
    const compCenterY = (bottomY + topY) / 2;

    const inv = new THREE.Mesh(
      new THREE.BoxGeometry(width, compHeight, depth),
      invisibleMat,
    );
    inv.name = `invisibleBox_compartment_${i}_for_${boxMesh.name}`;
    // Tag compartment type for downstream selection/placement logic
    inv.userData.type = 'INVISIBLE_COMPARTMENT';
    inv.userData.dimensions = {
      width: width,
      height: compHeight,
      depth: depth,
    };

    const worldPos = worldCenter.clone();
    worldPos.y += compCenterY;
    parent.add(inv);
    inv.position.copy(parent.worldToLocal(worldPos));
  }

  refreshInvisibleBoxesForPlank(scene, boxMesh);
};

const refreshInvisibleBoxesForGroup = (
  parent: THREE.Object3D,
  groupName: string,
) => {
  if (!parent.userData.compartmentConfig) return;

  const config = parent.userData.compartmentConfig;
  if (config.groupName !== groupName) return;

  // Remove existing invisible boxes for this group
  const toRemove: THREE.Object3D[] = [];
  parent.traverse((o) => {
    if (
      o.name.includes(`invisibleBox_compartment_`) &&
      o.name.includes(`_for_${groupName}`)
    ) {
      toRemove.push(o);
    }
  });
  toRemove.forEach((o) => parent.remove(o));

  // Collect and sort planks
  const siblings: THREE.Mesh[] = [];
  const plankKey = config.isHorizontal
    ? 'HORIZONTAL_PLANK_'
    : 'VERTICAL_PLANK_';
  parent.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.name.includes(plankKey) &&
      o.name.includes(`_for_${groupName}`)
    ) {
      siblings.push(o);
    }
  });

  if (siblings.length === 0) return;

  const axis = config.isHorizontal ? 'y' : config.isSideWall ? 'z' : 'x';
  const plankPoss = siblings.map((p) => p.position[axis]);
  plankPoss.sort((a, b) => a - b);

  // Calculate compartment starts and ends
  const plankMins = plankPoss.map((p) => p - config.thickness / 2);
  const plankMaxs = plankPoss.map((p) => p + config.thickness / 2);

  const starts = [config.boundsMin, ...plankMaxs];
  const ends = [...plankMins, config.boundsMax];

  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Calculate height above skirting (exclude skirting area)
  const skirtingHeight = 0.06;
  const heightAboveSkirting = config.height - skirtingHeight;
  const plankY = config.centerY + skirtingHeight / 2; // Position above skirting

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends[i];
    const compSize = Math.max(end - start, 0.02);
    if (compSize <= 0.01) continue;
    const centerAlong = (start + end) / 2;

    let invGeo;
    if (config.isHorizontal) {
      invGeo = new THREE.BoxGeometry(
        config.perpSizeX,
        compSize,
        config.perpSizeZ,
      );
    } else {
      invGeo = new THREE.BoxGeometry(
        config.isSideWall ? config.perpSize : compSize,
        heightAboveSkirting, // Use height above skirting instead of full height
        config.isSideWall ? compSize : config.perpSize,
      );
    }
    const inv = new THREE.Mesh(invGeo, invisibleMat);
    inv.name = `invisibleBox_compartment_${i}_for_${groupName}`;

    if (config.isHorizontal) {
      inv.position.set(config.centerX, centerAlong, config.centerZ);
    } else {
      inv.position.set(
        config.isSideWall ? config.centerPerp : centerAlong,
        plankY, // Position above skirting
        config.isSideWall ? centerAlong : config.centerPerp,
      );
    }
    parent.add(inv);
  }
};

// New function to refresh after plank move
export function refreshInvisibleBoxesForPlank(
  scene: THREE.Scene,
  plank: THREE.Mesh,
) {
  const name = plank.name;
  if (!name.includes('_for_')) return;
  const groupName = name.split('_for_')[1];
  if (!groupName) return;
  if (!plank.parent) return;
  refreshInvisibleBoxesForGroup(plank.parent, groupName);
}

// Proportionally rescale and reposition children of a container when its geometry changes
export function rescaleChildrenForContainer(container: THREE.Mesh) {
  const params = (container.geometry as THREE.BoxGeometry).parameters as any;
  const newDims = {
    width: params.width as number,
    height: params.height as number,
    depth: params.depth as number,
  };
  const userData: any = (container as any).userData || {};
  const last = userData.lastDims || newDims;
  const sx = (newDims.width || 1) / (last.width || 1);
  const sy = (newDims.height || 1) / (last.height || 1);
  const sz = (newDims.depth || 1) / (last.depth || 1);

  if (
    Math.abs(sx - 1) < 1e-6 &&
    Math.abs(sy - 1) < 1e-6 &&
    Math.abs(sz - 1) < 1e-6
  ) {
    return;
  }

  container.children.forEach((child) => {
    // Only scale real meshes; skip invisible helper boxes so they can be rebuilt precisely
    const isMesh = (child as any).isMesh || child instanceof THREE.Mesh;
    if (!isMesh) return;
    const name = (child.name || '').toLowerCase();
    if (name.startsWith('invisiblebox')) return;

    // Scale local position
    child.position.set(
      child.position.x * sx,
      child.position.y * sy,
      child.position.z * sz,
    );
    // Scale mesh uniformly per axis (relative to previous scale)
    const m = child as THREE.Mesh;
    m.scale.set(m.scale.x * sx, m.scale.y * sy, m.scale.z * sz);
  });

  // Update lastDims to current
  (container as any).userData = {
    ...userData,
    lastDims: { ...newDims },
  };
}

// Find container by objectId and rescale its children proportionally
export function rescaleByObjectId(scene: THREE.Scene, objectId: string) {
  let container: THREE.Mesh | null = null;
  scene.traverse((o: any) => {
    if (container) return;
    if (o && o.isMesh && o.userData && o.userData.objectId === objectId) {
      const n = (o.name || '').toLowerCase();
      if (
        n === 'simplecabinet'.toLowerCase() ||
        n === 'simpletvunit'.toLowerCase() ||
        n === 'simpletable'.toLowerCase() ||
        n === 'computerdesk'.toLowerCase()
      ) {
        container = o as THREE.Mesh;
      }
    }
  });
  if (!container) return;
  rescaleChildrenForContainer(container);
}

export const ensureHandleLoaded = async () => {
  if (cachedHandleModel) return;
  const loader = new GLTFLoader();
  await new Promise<void>((resolve) => {
    loader.load(
      '/door_handle.glb',
      (g) => {
        const model = g.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetLen = 0.12;
        const s = targetLen / (Math.max(size.x, size.y, size.z) || 1);
        model.scale.setScalar(s);
        const box2 = new THREE.Box3().setFromObject(model);
        const c = new THREE.Vector3();
        box2.getCenter(c);
        model.position.sub(c);
        model.traverse((n: any) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
        cachedHandleModel = model;
        resolve();
      },
      undefined,
      () => resolve(),
    );
  });
};
const EPSILON_OFFSET = 0.001; // Small offset to avoid Z-fighting

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number = 1,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const worldCenter = new THREE.Vector3();
  bbox.getCenter(worldCenter);

  const w = size.x;
  const h = size.y;
  const d = size.z;

  const parent = boxMesh.parent ?? scene;

  const isSide =
    boxMesh.name.includes('platform_leftwall') ||
    boxMesh.name.includes('platform_rightwall');
  const dir = boxMesh.name.includes('platform_leftwall')
    ? 1
    : boxMesh.name.includes('platform_rightwall')
      ? -1
      : 0;
  const textureLoader = new THREE.TextureLoader();
  const doorTexture = textureLoader.load('/Texture0004.jpg');
  doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
  doorTexture.repeat.set(2, 1);
  const face = new THREE.Mesh(
    isSide
      ? new THREE.BoxGeometry(0.02, h - 0.01, d - 0.01)
      : new THREE.BoxGeometry(w - 0.01, h - 0.01, 0.02),
    new THREE.MeshStandardMaterial({
      map: doorTexture,
      side: THREE.DoubleSide,
    }),
  );
  face.name = `Door_for_${boxMesh.name}`;
  face.castShadow = true;
  face.userData.openDirection = 'right';

  // Group door
  const doorGroup = new THREE.Group();
  doorGroup.name = `DoorGroup_for_${boxMesh.name}`;
  (doorGroup as any).userData = {
    ...(doorGroup as any).userData,
    type: 'DOOR',
    upward: false,
    ...(apiResponseDataArray[0] && { apiData: apiResponseDataArray[0] }),
    ...(selectedCabinetItem && { cabinetItem: selectedCabinetItem }),
  };
  // Store dimensions for easy access on the group (face geometry dimensions)
  (doorGroup as any).userData.dimensions = isSide
    ? { width: 0.02, height: h - 0.01, depth: d - 0.01 }
    : { width: w - 0.01, height: h - 0.01, depth: 0.02 };
  // Also expose a flat objectId on userData (separate from apiData)
  if (apiResponseDataArray && apiResponseDataArray[0]) {
    const api0 = apiResponseDataArray[0] as any;
    (doorGroup as any).userData.objectId =
      api0?.id ?? api0?.objectId ?? (api0?.data && api0.data.id) ?? undefined;
  }
  // Dispatch apiData to Redux store object if available
  try {
    const objId = (doorGroup as any).userData.objectId;
    if (objId) {
      const objInStore = store
        .getState()
        .data.objects.find((o) => o.id === objId);
      if (objInStore) {
        const rules = (doorGroup as any).userData?.apiData?.rules;
        const dims = (doorGroup as any).userData?.dimensions;
        store.dispatch(
          updateObject({
            ...objInStore,
            apiData: (doorGroup as any).userData.apiData,
            rules,
            ...(dims && {
              width: dims.width,
              height: dims.height,
              depth: dims.depth,
            }),
            position: {
              x: doorGroup.position.x,
              y: doorGroup.position.y,
              z: doorGroup.position.z,
            },
          } as any),
        );
      }
    }
  } catch (e) {
    // no-op
  }

  // Add doorGroup to parent
  parent.add(doorGroup);

  // Set face position in world, then attach and convert to local
  let worldFacePos = worldCenter.clone();
  if (isSide) {
    worldFacePos.x += dir * (w / 2 + toAvoidOverlap);
  } else {
    worldFacePos.z += d / 2 + toAvoidOverlap;
  }
  parent.add(face);
  face.position.copy(parent.worldToLocal(worldFacePos));
  doorGroup.attach(face);

  await ensureHandleLoaded();
  if (cachedHandleModel) {
    const handle = cachedHandleModel.clone(true);

    // Compute door’s own bounding box
    const doorBox = new THREE.Box3().setFromObject(face);
    const doorSize = new THREE.Vector3();
    doorBox.getSize(doorSize);
    const doorCenter = new THREE.Vector3();
    doorBox.getCenter(doorCenter);

    // Decide margin for handle from edge
    const marginX = 0.04; // 40mm
    const marginY = 0.1; // 100mm from bottom for tall doors
    const offsetZ = doorSize.z / 2 + toAvoidOverlap;

    let worldHandlePos = new THREE.Vector3();

    if (isSide) {
      // Left / right wall doors → handle on vertical edge
      if (dir > 0) {
        // left wall → handle on right edge
        worldHandlePos.set(
          doorCenter.x + doorSize.x / 2 - marginX,
          doorCenter.y,
          doorCenter.z + offsetZ,
        );
      } else {
        // right wall → handle on left edge
        worldHandlePos.set(
          doorCenter.x - doorSize.x / 2 + marginX,
          doorCenter.y,
          doorCenter.z + offsetZ,
        );
      }
      // rotate handle horizontal
      handle.rotation.set(0, Math.PI / 2, Math.PI / 2);
    } else {
      // Center/front doors → handle on side edge
      worldHandlePos.set(
        doorCenter.x - doorSize.x / 2 + marginX,
        doorCenter.y,
        doorCenter.z + offsetZ,
      );
      // rotate handle vertical
      handle.rotation.set(0, Math.PI / 2, 0);
    }

    handle.name = `Handle_for_${boxMesh.name}`;
    parent.add(handle);
    handle.position.copy(parent.worldToLocal(worldHandlePos));
    doorGroup.attach(handle);
  }
};

export const addDrawersOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  drawers: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (drawers <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const w = size.x;
  const h = size.y;
  const d = size.z;

  const isSide =
    boxMesh.name.includes('platform_leftwall') ||
    boxMesh.name.includes('platform_rightwall');
  const dir = boxMesh.name.includes('platform_leftwall')
    ? 1
    : boxMesh.name.includes('platform_rightwall')
      ? -1
      : 0;
  const eachH = h / drawers;
  // const drawerType = (boxMesh.userData && (boxMesh.userData as any).drawerType) || 'basket';
  const drawerType = 'fivePlank';
  const thickness = 0.018;
  await ensureHandleLoaded();
  for (let i = 0; i < drawers; i++) {
    const yCenter = center.y - h / 2 + eachH * (i + 0.5);
    // Drawer group root
    const drawerGroup = new THREE.Group();
    drawerGroup.name = `Drawer_${i}_for_${boxMesh.name}`;
    (drawerGroup as any).userData = {
      ...(drawerGroup as any).userData,
      type: 'DRAWER',
      ...(apiResponseDataArray[i] && { apiData: apiResponseDataArray[i] }),
      ...(selectedCabinetItem && { cabinetItem: selectedCabinetItem }),
    };
    // Face dimensions stored on group for convenience
    (drawerGroup as any).userData.dimensions = isSide
      ? { width: 0.02, height: eachH - 0.005, depth: d - 0.01 }
      : { width: w - 0.01, height: eachH - 0.005, depth: 0.02 };
    // Also expose a flat objectId on userData (separate from apiData)
    if (apiResponseDataArray && apiResponseDataArray[i]) {
      const apiI = apiResponseDataArray[i] as any;
      (drawerGroup as any).userData.objectId =
        apiI?.id ?? apiI?.objectId ?? (apiI?.data && apiI.data.id) ?? undefined;
    }
    // Dispatch apiData to Redux store object if available
    try {
      const objId = (drawerGroup as any).userData.objectId;
      if (objId) {
        const objInStore = store
          .getState()
          .data.objects.find((o) => o.id === objId);
        if (objInStore) {
          const rules = (drawerGroup as any).userData?.apiData?.rules;
          const dims = (drawerGroup as any).userData?.dimensions;
          store.dispatch(
            updateObject({
              ...objInStore,
              apiData: (drawerGroup as any).userData.apiData,
              rules,
              ...(dims && {
                width: dims.width,
                height: dims.height,
                depth: dims.depth,
              }),
              position: {
                x: drawerGroup.position.x,
                y: drawerGroup.position.y,
                z: drawerGroup.position.z,
              },
            } as any),
          );
        }
      }
    } catch {}
    scene.add(drawerGroup);

    const textureLoader = new THREE.TextureLoader();
    const drawerTexture = textureLoader.load('/Texture0004.jpg');
    drawerTexture.wrapS = drawerTexture.wrapT = THREE.RepeatWrapping;
    drawerTexture.repeat.set(2, 1);

    // Drawer face
    const face = new THREE.Mesh(
      isSide
        ? new THREE.BoxGeometry(0.02, eachH - 0.005, d - 0.01)
        : new THREE.BoxGeometry(w - 0.01, eachH - 0.005, 0.02),
      new THREE.MeshStandardMaterial({
        map: drawerTexture,
        side: THREE.DoubleSide,
      }),
    );
    face.name = `DrawerFace_${i}_for_${boxMesh.name}`;
    if (isSide) {
      const frontX = center.x + dir * (w / 2 + 0.01);
      face.position.set(frontX, yCenter, center.z);
    } else {
      const frontZ = center.z + d / 2 + 0.01;
      face.position.set(center.x, yCenter, frontZ);
    }
    scene.add(face);
    drawerGroup.attach(face);
    if (cachedHandleModel) {
      const handle = cachedHandleModel.clone(true);
      handle.traverse((n: any) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });

      handle.position.set(0, 0, 0);

      if (isSide) {
        const normalAxis = 'x';
        const normalSign = dir;
        handle.rotation.set(0, 0, 0);
        handle.rotation.z = Math.PI / 2;
        handle.rotation.y = Math.PI / 2;

        handle.updateMatrixWorld(true);
        const handleBox = new THREE.Box3().setFromObject(handle);

        const baseOffset = normalSign > 0 ? handleBox.min.x : -handleBox.max.x;

        const frontX = face.position.x;
        const doorFrontX = frontX + (thickness / 2) * dir;

        handle.position.set(
          doorFrontX - baseOffset + EPSILON_OFFSET * normalSign,
          face.position.y,
          face.position.z,
        );
      } else {
        const normalAxis = 'z';
        const normalSign = dir; // 1 for +Z
        handle.rotation.set(0, 0, 0);
        handle.rotation.z = Math.PI / 2;
        handle.rotation.x = -(Math.PI / 2);

        handle.updateMatrixWorld(true);
        const handleBox = new THREE.Box3().setFromObject(handle);

        const baseOffset = handleBox.min.z;

        const frontZ = face.position.z;
        const doorFrontZ = frontZ + thickness / 2;

        handle.position.set(
          face.position.x,
          face.position.y,
          doorFrontZ - baseOffset + EPSILON_OFFSET,
        );
      }

      handle.name = `Handle_Drawer_${i}_for_${boxMesh.name}`;
      scene.add(handle);
      drawerGroup.attach(handle);
    }
    if (drawerType === 'fivePlank') {
      // Build five-plank drawer box (left, right, back, front inner panel, bottom)
      const innerW = Math.max(w - 2 * thickness - 0.02, 0.1);
      const innerD = Math.max(d - 0.06, 0.2);
      const innerH = Math.max(eachH - 0.06, 0.12);
      const baseY = yCenter;
      // Left/Right sides (thickness x innerH x innerD)
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0xd9c7b8,
        roughness: 0.7,
      });
      const leftSide = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, innerH, innerD),
        sideMat,
      );
      const rightSide = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, innerH, innerD),
        sideMat,
      );
      leftSide.position.set(center.x - innerW / 2, baseY, center.z);
      rightSide.position.set(center.x + innerW / 2, baseY, center.z);
      leftSide.name = `DrawerSide_L_${i}_for_${boxMesh.name}`;
      rightSide.name = `DrawerSide_R_${i}_for_${boxMesh.name}`;
      scene.add(leftSide);
      drawerGroup.attach(leftSide);
      scene.add(rightSide);
      drawerGroup.attach(rightSide);
      // Back panel (innerW x innerH x thickness)
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, innerH, thickness),
        sideMat,
      );
      back.position.set(center.x, baseY, center.z - innerD / 2);
      back.name = `DrawerBack_${i}_for_${boxMesh.name}`;
      scene.add(back);
      drawerGroup.attach(back);
      // Front inner panel (inside behind face)
      const frontInner = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, innerH, thickness),
        sideMat,
      );
      frontInner.position.set(
        center.x,
        baseY,
        center.z + innerD / 2 - thickness,
      );
      frontInner.name = `DrawerFrontInner_${i}_for_${boxMesh.name}`;
      scene.add(frontInner);
      drawerGroup.attach(frontInner);
      // Bottom (innerW x thickness x innerD)
      const bottom = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, thickness, innerD),
        sideMat,
      );
      bottom.position.set(
        center.x,
        baseY - innerH / 2 + thickness / 2,
        center.z,
      );
      bottom.name = `DrawerBottom_${i}_for_${boxMesh.name}`;
      scene.add(bottom);
      drawerGroup.attach(bottom);
    } else {
      // Wire basket inside (legacy type)
      const basketGeom = new THREE.BoxGeometry(
        w - 0.06,
        eachH - 0.06,
        d - 0.08,
      );
      const edges = new THREE.EdgesGeometry(basketGeom);
      const basket = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff }),
      );
      basket.name = `WireBasket_${i}_for_${boxMesh.name}`;
      basket.position.set(center.x, yCenter, center.z);
      scene.add(basket);
      drawerGroup.attach(basket);
    }
    // Drawer channels (left/right rails)
    const railH = 0.02;
    const railT = 0.005;
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.6,
      roughness: 0.3,
    });
    if (isSide) {
      // Rails run along X on side walls, mounted at Z sides
      const railLenX = Math.max(w - 0.06, 0.2);
      const nearZ = center.z - d / 2 + railT / 2 + 0.01;
      const farZ = center.z + d / 2 - railT / 2 - 0.01;
      const nearRail = new THREE.Mesh(
        new THREE.BoxGeometry(railLenX, railH, railT),
        railMat,
      );
      const farRail = new THREE.Mesh(
        new THREE.BoxGeometry(railLenX, railH, railT),
        railMat,
      );
      nearRail.name = `DrawerRail_N_${i}_for_${boxMesh.name}`;
      farRail.name = `DrawerRail_F_${i}_for_${boxMesh.name}`;
      nearRail.position.set(center.x, yCenter, nearZ);
      farRail.position.set(center.x, yCenter, farZ);
      scene.add(nearRail);
      scene.add(farRail);
      drawerGroup.attach(nearRail);
      drawerGroup.attach(farRail);
    } else {
      const railLen = Math.max(d - 0.06, 0.2);
      const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(railT, railH, railLen),
        railMat,
      );
      const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(railT, railH, railLen),
        railMat,
      );
      leftRail.name = `DrawerRail_L_${i}_for_${boxMesh.name}`;
      rightRail.name = `DrawerRail_R_${i}_for_${boxMesh.name}`;
      leftRail.position.set(
        center.x - w / 2 + railT / 2 + 0.01,
        yCenter,
        center.z,
      );
      rightRail.position.set(
        center.x + w / 2 - railT / 2 - 0.01,
        yCenter,
        center.z,
      );
      scene.add(leftRail);
      scene.add(rightRail);
    }
  }
};

export const addUpperCabinetsAbovePlatform = async (
  scene: THREE.Scene,
  platformMesh: THREE.Mesh,
  count: number,
  doorType: 'single' | 'double' = 'single',
) => {
  if (count <= 0) return;

  const params = (platformMesh.geometry as THREE.BoxGeometry).parameters as any;
  const platformW = params.width as number;
  const platformH = params.height as number;
  const platformD = params.depth as number;
  const platformTopY = platformMesh.position.y + platformH / 2;

  // Upper cabinet dimensions
  const upperHeight = 0.7; // 700mm tall
  const upperDepth = 0.35; // 350mm deep
  const upperBottomY = platformTopY + 0.55; // 550mm above platform

  // Determine platform orientation and cabinet placement
  const isSidePlatform =
    platformMesh.name.includes('LeftWall') ||
    platformMesh.name.includes('RightWall');
  const isLeftWall = platformMesh.name.includes('LeftWall');
  const isRightWall = platformMesh.name.includes('RightWall');

  // Find the corresponding wall to position cabinets against
  let targetWall: THREE.Mesh | null = null;
  if (isSidePlatform) {
    if (isLeftWall) {
      targetWall = scene.getObjectByName('Left Wall') as THREE.Mesh | null;
    } else if (isRightWall) {
      targetWall = scene.getObjectByName('Right Wall') as THREE.Mesh | null;
    }
  } else {
    targetWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  }

  if (!targetWall) {
    console.warn('Could not find target wall for upper cabinets');
    return;
  }

  // Calculate cabinet dimensions and spacing
  let cabinetWidth, cabinetSpacing;

  if (isSidePlatform) {
    // Side platform: cabinets run along Z (wall length)
    cabinetWidth = platformD; // Use platform depth as cabinet width
    cabinetSpacing = cabinetWidth / count;
  } else {
    // Center platform: cabinets run along X (wall width)
    cabinetWidth = platformW;
    cabinetSpacing = cabinetWidth / count;
  }

  await ensureHandleLoaded();

  // Create upper cabinets group
  const upperGroup = new THREE.Group();
  upperGroup.name = `UpperCabinets_${platformMesh.name}`;
  scene.add(upperGroup);

  const invisibleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  for (let i = 0; i < count; i++) {
    // Cabinet carcass (five-plank construction)
    const carcassMat = new THREE.MeshStandardMaterial({
      color: 0xd9c7b8,
      roughness: 0.7,
    });
    const thickness = 0.018; // 18mm
    const epsilon = 0.001; // Minimal epsilon to avoid z-fighting/overlap

    const cabinetGroup = new THREE.Group();
    cabinetGroup.name = `UpperCabinet_${i}_for_${platformMesh.name}`;
    (cabinetGroup as any).userData = {
      ...(cabinetGroup as any).userData,
      type: 'UPPER_CABINET',
    };

    // Calculate cabinet position for this iteration
    let cabinetX: number, cabinetZ: number;

    if (isSidePlatform) {
      // For side platforms, position cabinets against the side wall
      if (isLeftWall) {
        // Position against left wall - cabinet back touches wall
        const wallParams = (targetWall.geometry as THREE.BoxGeometry)
          .parameters as any;
        const wallThickness = wallParams.width as number; // For side walls, thickness is along X axis
        cabinetX = targetWall.position.x + wallThickness / 2 + upperDepth / 2;
        // Position cabinets along the platform's Z-axis (wall length)
        cabinetZ =
          platformMesh.position.z + (i - (count - 1) / 2) * cabinetSpacing;
      } else if (isRightWall) {
        // Position against right wall - cabinet back touches wall
        const wallParams = (targetWall.geometry as THREE.BoxGeometry)
          .parameters as any;
        const wallThickness = wallParams.width as number; // For side walls, thickness is along X axis
        cabinetX = targetWall.position.x - wallThickness / 2 - upperDepth / 2;
        // Position cabinets along the platform's Z-axis (wall length)
        cabinetZ =
          platformMesh.position.z + (i - (count - 1) / 2) * cabinetSpacing;
      } else {
        // Fallback for side platform
        cabinetX = platformMesh.position.x;
        cabinetZ = platformMesh.position.z;
      }
    } else {
      // For center platform, position cabinets against the center wall
      const wallParams = (targetWall.geometry as THREE.BoxGeometry)
        .parameters as any;
      const wallThickness = wallParams.depth as number;
      cabinetX =
        platformMesh.position.x - platformW / 2 + cabinetSpacing * (i + 0.5);
      cabinetZ = targetWall.position.z + wallThickness / 2 + upperDepth / 2;
    }

    // Five-plank carcass construction
    const actualCabinetWidth = cabinetSpacing - 0.02; // small gap between cabinets

    // Calculate plank positions based on cabinet orientation
    let leftPlankX, rightPlankX, bottomPlankX, topPlankX, backPlankX;
    let leftPlankZ, rightPlankZ, bottomPlankZ, topPlankZ, backPlankZ;

    if (isSidePlatform) {
      // For side platforms, planks are oriented along Z axis
      leftPlankX = cabinetX;
      rightPlankX = cabinetX;
      bottomPlankX = cabinetX;
      topPlankX = cabinetX;
      backPlankX = cabinetX;

      leftPlankZ = cabinetZ - actualCabinetWidth / 2 + thickness / 2;
      rightPlankZ = cabinetZ + actualCabinetWidth / 2 - thickness / 2;
      bottomPlankZ = cabinetZ;
      topPlankZ = cabinetZ;
      backPlankZ = cabinetZ;
    } else {
      // For center platform, planks are oriented along X axis
      leftPlankX = cabinetX - actualCabinetWidth / 2 + thickness / 2;
      rightPlankX = cabinetX + actualCabinetWidth / 2 - thickness / 2;
      bottomPlankX = cabinetX;
      topPlankX = cabinetX;
      backPlankX = cabinetX;

      leftPlankZ = cabinetZ;
      rightPlankZ = cabinetZ;
      bottomPlankZ = cabinetZ;
      topPlankZ = cabinetZ;
      backPlankZ = cabinetZ;
    }

    // Left plank
    const leftPlank = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, upperHeight, upperDepth),
      carcassMat,
    );
    leftPlank.position.set(
      leftPlankX,
      upperBottomY + upperHeight / 2,
      leftPlankZ,
    );
    if (isSidePlatform) {
      leftPlank.rotation.y = Math.PI / 2;
    }
    leftPlank.castShadow = true;
    leftPlank.receiveShadow = true;
    leftPlank.name = `UpperLeftPlank_${i}`;

    // Right plank
    const rightPlank = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, upperHeight, upperDepth),
      carcassMat,
    );
    rightPlank.position.set(
      rightPlankX,
      upperBottomY + upperHeight / 2,
      rightPlankZ,
    );
    if (isSidePlatform) {
      rightPlank.rotation.y = Math.PI / 2;
    }
    rightPlank.castShadow = true;
    rightPlank.receiveShadow = true;
    rightPlank.name = `UpperRightPlank_${i}`;

    // Bottom plank
    const bottomPlank = new THREE.Mesh(
      new THREE.BoxGeometry(
        actualCabinetWidth - thickness * 2,
        thickness,
        upperDepth,
      ),
      carcassMat,
    );
    bottomPlank.position.set(
      bottomPlankX,
      upperBottomY + thickness / 2,
      bottomPlankZ,
    );
    if (isSidePlatform) {
      bottomPlank.rotation.y = Math.PI / 2;
    }
    bottomPlank.castShadow = true;
    bottomPlank.receiveShadow = true;
    bottomPlank.name = `UpperBottomPlank_${i}`;

    // Top plank
    const topPlank = new THREE.Mesh(
      new THREE.BoxGeometry(
        actualCabinetWidth - thickness * 2,
        thickness,
        upperDepth,
      ),
      carcassMat,
    );
    topPlank.position.set(
      topPlankX,
      upperBottomY + upperHeight - thickness / 2,
      topPlankZ,
    );
    if (isSidePlatform) {
      topPlank.rotation.y = Math.PI / 2;
    }
    topPlank.castShadow = true;
    topPlank.receiveShadow = true;
    topPlank.name = `UpperTopPlank_${i}`;

    // Back plank - positioned to touch the wall
    const backPlank = new THREE.Mesh(
      new THREE.BoxGeometry(
        actualCabinetWidth - thickness * 2,
        upperHeight - thickness * 2,
        thickness,
      ),
      carcassMat,
    );

    if (isSidePlatform) {
      // For side platforms, back plank touches the side wall
      if (isLeftWall) {
        backPlankX =
          targetWall.position.x +
          (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 +
          thickness / 2;
      } else {
        backPlankX =
          targetWall.position.x -
          (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 -
          thickness / 2;
      }
      backPlankZ = cabinetZ;
    } else {
      // For center platform, back plank touches the center wall
      backPlankX = cabinetX;
      backPlankZ =
        targetWall.position.z +
        (targetWall.geometry as THREE.BoxGeometry).parameters.depth / 2 +
        thickness / 2;
    }

    backPlank.position.set(
      backPlankX,
      upperBottomY + upperHeight / 2,
      backPlankZ,
    );
    if (isSidePlatform) {
      backPlank.rotation.y = Math.PI / 2;
    }
    backPlank.castShadow = true;
    backPlank.receiveShadow = true;
    backPlank.name = `UpperBackPlank_${i}`;

    // Add planks to cabinet group
    cabinetGroup.add(leftPlank, rightPlank, bottomPlank, topPlank, backPlank);
    // Add invisible box inside the cabinet
    const innerW = actualCabinetWidth - 2 * thickness;
    const innerH = upperHeight - 2 * thickness;
    const innerD = upperDepth - 2 * thickness;
    let inv: THREE.Mesh;
    if (isSidePlatform) {
      inv = new THREE.Mesh(
        new THREE.BoxGeometry(innerD, innerH, innerW),
        invisibleMat,
      );
    } else {
      inv = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, innerH, innerD),
        invisibleMat,
      );
    }
    inv.name = `invisibleBox_uppercabinet_${i}`;
    inv.userData.isInvisibleBox = true;
    inv.userData.type = 'INVISIBLE_COMPARTMENT';
    inv.userData.dimensions = {
      width: isSidePlatform ? innerD : innerW,
      height: innerH,
      depth: isSidePlatform ? innerW : innerD,
    };
    inv.position.set(cabinetX, upperBottomY + upperHeight / 2, cabinetZ);
    cabinetGroup.add(inv);

    // Create door(s) based on door type
    const doorHeight = upperHeight - thickness * 2 - epsilon; // Perfect fit with minimal epsilon
    const doorThickness = 0.02;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('/Texture0004.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 1);

    const doorMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      side: THREE.DoubleSide,
    });

    // Cabinet front position (for flush door placement)
    let cabinetFrontX: number,
      cabinetFrontZ: number,
      normalAxis: 'x' | 'z',
      normalSign: 1 | -1;

    if (isSidePlatform) {
      normalAxis = 'x';
      if (isLeftWall) {
        cabinetFrontX = cabinetX + upperDepth / 2;
        normalSign = 1; // Positive X
      } else {
        cabinetFrontX = cabinetX - upperDepth / 2;
        normalSign = -1; // Negative X
      }
      cabinetFrontZ = cabinetZ;
    } else {
      normalAxis = 'z';
      cabinetFrontZ = cabinetZ + upperDepth / 2;
      normalSign = 1; // Positive Z
      cabinetFrontX = cabinetX;
    }

    if (doorType === 'double') {
      // Create two doors for double door cabinet
      const doorWidth = (actualCabinetWidth - thickness * 2 - epsilon) / 2; // No extra gap

      // Left door
      const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(
          isSidePlatform ? doorHeight : doorWidth,
          isSidePlatform ? doorWidth : doorHeight,
          doorThickness,
        ),
        doorMat,
      );

      // Right door
      const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(
          isSidePlatform ? doorHeight : doorWidth,
          isSidePlatform ? doorWidth : doorHeight,
          doorThickness,
        ),
        doorMat,
      );

      if (isSidePlatform) {
        // For side walls, doors face into the room
        leftDoor.rotation.y = Math.PI / 2;
        rightDoor.rotation.y = Math.PI / 2;

        // Position along Z for left/right doors
        const doorOffsetZ = doorWidth / 2;

        leftDoor.position.set(
          cabinetFrontX + (doorThickness / 2) * normalSign,
          upperBottomY + upperHeight / 2,
          cabinetZ - doorOffsetZ,
        );
        rightDoor.position.set(
          cabinetFrontX + (doorThickness / 2) * normalSign,
          upperBottomY + upperHeight / 2,
          cabinetZ + doorOffsetZ,
        );
      } else {
        // For center wall, no rotation needed
        const doorOffsetX = doorWidth / 2;

        leftDoor.position.set(
          cabinetX - doorOffsetX,
          upperBottomY + upperHeight / 2,
          cabinetFrontZ + (doorThickness / 2) * normalSign,
        );
        rightDoor.position.set(
          cabinetX + doorOffsetX,
          upperBottomY + upperHeight / 2,
          cabinetFrontZ + (doorThickness / 2) * normalSign,
        );
      }

      leftDoor.castShadow = true;
      leftDoor.receiveShadow = true;
      leftDoor.name = `UpperLeftDoor_${i}`;
      leftDoor.userData.openDirection = 'left';

      rightDoor.castShadow = true;
      rightDoor.receiveShadow = true;
      rightDoor.name = `UpperRightDoor_${i}`;
      rightDoor.userData.openDirection = 'right';

      // Add doors to cabinet group
      cabinetGroup.add(leftDoor, rightDoor);

      // Add handles with bounding box positioning
      if (cachedHandleModel) {
        const leftHandle = cachedHandleModel.clone(true);
        const rightHandle = cachedHandleModel.clone(true);

        [leftHandle, rightHandle].forEach((handle) => {
          handle.traverse((n: any) => {
            if (n.isMesh) {
              n.castShadow = true;
              n.receiveShadow = true;
            }
          });
        });

        const handleY = upperBottomY + thickness + 0.1; // Near bottom of door, consistent with original
        const epsilonOffset = 0.0001; // Small offset to avoid z-fighting

        if (isSidePlatform) {
          // Side walls: handles on front face, horizontal
          leftHandle.rotation.set(0, 0, Math.PI / 2);
          rightHandle.rotation.set(0, 0, Math.PI / 2);

          leftHandle.updateMatrixWorld(true);
          rightHandle.updateMatrixWorld(true);

          const leftHandleBox = new THREE.Box3().setFromObject(leftHandle);
          const rightHandleBox = new THREE.Box3().setFromObject(rightHandle);

          const baseOffsetLeft =
            normalSign > 0 ? leftHandleBox.min.x : -leftHandleBox.max.x;
          const baseOffsetRight =
            normalSign > 0 ? rightHandleBox.min.x : -rightHandleBox.max.x;

          const doorFrontX = cabinetFrontX + (doorThickness / 2) * normalSign;

          leftHandle.position.set(
            doorFrontX - baseOffsetLeft + epsilonOffset * normalSign,
            handleY,
            cabinetZ - (actualCabinetWidth - thickness * 2 - epsilon) / 4,
          );
          rightHandle.position.set(
            doorFrontX - baseOffsetRight + epsilonOffset * normalSign,
            handleY,
            cabinetZ + (actualCabinetWidth - thickness * 2 - epsilon) / 4,
          );
        } else {
          // Center wall: handles on front face, adjusted rotation
          leftHandle.rotation.set(-(Math.PI / 2), 0, Math.PI / 2);
          rightHandle.rotation.set(-(Math.PI / 2), 0, Math.PI / 2);

          leftHandle.updateMatrixWorld(true);
          rightHandle.updateMatrixWorld(true);

          const leftHandleBox = new THREE.Box3().setFromObject(leftHandle);
          const rightHandleBox = new THREE.Box3().setFromObject(rightHandle);

          const baseOffsetLeft =
            normalSign > 0 ? leftHandleBox.min.z : -leftHandleBox.max.z;
          const baseOffsetRight =
            normalSign > 0 ? rightHandleBox.min.z : -rightHandleBox.max.z;

          const doorFrontZ = cabinetFrontZ + (doorThickness / 2) * normalSign;

          leftHandle.position.set(
            cabinetX - (actualCabinetWidth - thickness * 2 - epsilon) / 4,
            handleY,
            doorFrontZ - baseOffsetLeft + epsilonOffset * normalSign,
          );
          rightHandle.position.set(
            cabinetX + (actualCabinetWidth - thickness * 2 - epsilon) / 4,
            handleY,
            doorFrontZ - baseOffsetRight + epsilonOffset * normalSign,
          );
        }

        leftHandle.name = `UpperLeftHandle_${i}`;
        rightHandle.name = `UpperRightHandle_${i}`;
        cabinetGroup.add(leftHandle, rightHandle);
      }
    } else {
      // Single door
      const doorWidth = actualCabinetWidth - thickness * 2 - epsilon; // Perfect fit with minimal epsilon
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(
          isSidePlatform ? doorHeight : doorWidth,
          isSidePlatform ? doorWidth : doorHeight,
          doorThickness,
        ),
        doorMat,
      );

      if (isSidePlatform) {
        door.rotation.y = Math.PI / 2;
        door.position.set(
          cabinetFrontX + (doorThickness / 2) * normalSign,
          upperBottomY + upperHeight / 2,
          cabinetZ,
        );
      } else {
        door.position.set(
          cabinetX,
          upperBottomY + upperHeight / 2,
          cabinetFrontZ + (doorThickness / 2) * normalSign,
        );
      }

      door.castShadow = true;
      door.receiveShadow = true;
      door.name = `UpperDoor_${i}`;
      door.userData.openDirection = 'top';

      // Add door to cabinet group
      cabinetGroup.add(door);

      // Add handle with bounding box positioning
      if (cachedHandleModel) {
        const handle = cachedHandleModel.clone(true);
        handle.traverse((n: any) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });

        const handleY = upperBottomY + thickness + 0.1; // Near bottom
        const epsilonOffset = 0.0001;

        if (isSidePlatform) {
          handle.rotation.set(0, 0, Math.PI / 2);

          handle.updateMatrixWorld(true);
          const handleBox = new THREE.Box3().setFromObject(handle);

          const baseOffset =
            normalSign > 0 ? handleBox.min.x : -handleBox.max.x;
          const doorFrontX = cabinetFrontX + (doorThickness / 2) * normalSign;

          handle.position.set(
            doorFrontX - baseOffset + epsilonOffset * normalSign,
            handleY,
            cabinetZ,
          );
        } else {
          handle.rotation.set(-(Math.PI / 2), 0, Math.PI / 2);

          handle.updateMatrixWorld(true);
          const handleBox = new THREE.Box3().setFromObject(handle);

          const baseOffset =
            normalSign > 0 ? handleBox.min.z : -handleBox.max.z;
          const doorFrontZ = cabinetFrontZ + (doorThickness / 2) * normalSign;

          handle.position.set(
            cabinetX,
            handleY,
            doorFrontZ - baseOffset + epsilonOffset * normalSign,
          );
        }

        handle.name = `UpperHandle_${i}`;
        cabinetGroup.add(handle);
      }
    }

    // Add cabinet to upper group
    upperGroup.add(cabinetGroup);
  }
};
export const addDoubleDoorUpperCabinetsAbovePlatform = async (
  scene: THREE.Scene,
  platformMesh: THREE.Mesh,
  count: number,
) => {
  return addUpperCabinetsAbovePlatform(scene, platformMesh, count, 'double');
};

function createTextSprite(label: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 1024;
  canvas.height = 256;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 160px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.24, 0.06, 1); // scene scale
  return sprite;
}

function addTick(
  group: THREE.Group,
  a: THREE.Vector3,
  dir: THREE.Vector3,
  size = 0.02,
) {
  const p1 = a.clone().addScaledVector(dir, size / 2);
  const p2 = a.clone().addScaledVector(dir, -size / 2);
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x222222,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
}

function addDimLine(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  viewOffsetDir: THREE.Vector3,
  label: string,
  meta?: {
    axis: 'x' | 'y' | 'z';
    side: 'min' | 'max';
    ref: number; // world position reference plane in meters
    targetUuid: string;
  },
) {
  // Offset the dimension away from surface for readability
  const offset = 0.03;
  const s = start.clone().addScaledVector(viewOffsetDir, offset);
  const e = end.clone().addScaledVector(viewOffsetDir, offset);
  const geo = new THREE.BufferGeometry().setFromPoints([s, e]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x111111,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
  // Extension ticks at ends
  const axis = e.clone().sub(s).normalize();
  const tickDir = new THREE.Vector3().crossVectors(
    axis,
    new THREE.Vector3(0, 1, 0),
  );
  if (tickDir.lengthSq() < 1e-6) {
    // if parallel to Y, use X for cross
    tickDir.set(1, 0, 0);
  }
  tickDir.normalize();
  addTick(group, s, tickDir);
  addTick(group, e, tickDir);

  // Label sprite at mid
  const mid = s.clone().lerp(e, 0.5);
  const sprite = createTextSprite(label);
  sprite.name =
    DIM_LABEL_PREFIX + (meta?.side || '') + '_' + (meta?.axis || '');
  if (meta) sprite.userData.dimMeta = meta;
  sprite.position.copy(mid);
  group.add(sprite);
  return sprite;
}

const EPS = 1e-6;

function getAABB(obj: THREE.Object3D) {
  // ensure world matrices are up-to-date before computing the box
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  box.setFromObject(obj);
  return box;
}
function isHelperOrInvisible(o: THREE.Object3D) {
  // skip anything not visible in the scene graph
  if (!o.visible) return true;

  // userData markers (set these when creating helpers/invisible boxes)
  if (o.userData?.isInvisibleBox || o.userData?.isHelper || o.userData?.helper)
    return true;

  // name-based checks (case-insensitive)
  if (
    o.name &&
    /invisible|helper|ghost|outline|dimension|skirting/i.test(o.name)
  )
    return true;

  // material-based checks (handles fully transparent helper meshes)
  // support both single material and material arrays
  const mats = (o as any).material
    ? Array.isArray((o as any).material)
      ? (o as any).material
      : [(o as any).material]
    : [];
  if (mats.length) {
    const allHidden = mats.every(
      (m: any) =>
        (m && m.visible === false) ||
        (m &&
          m.transparent &&
          typeof m.opacity === 'number' &&
          m.opacity <= 0.01),
    );
    if (allHidden) return true;
  }

  return false;
}
function overlapsOnAxes(
  a: THREE.Box3,
  b: THREE.Box3,
  axes: Array<'x' | 'y' | 'z'>,
): boolean {
  for (const axis of axes) {
    if (axis === 'x' && (a.max.x < b.min.x || a.min.x > b.max.x)) return false;
    if (axis === 'y' && (a.max.y < b.min.y || a.min.y > b.max.y)) return false;
    if (axis === 'z' && (a.max.z < b.min.z || a.min.z > b.max.z)) return false;
  }
  return true;
}

function findNearestAlongAxis(
  scene: THREE.Scene,
  self: THREE.Object3D,
  selfBox: THREE.Box3,
  axis: 'x' | 'y' | 'z',
  overlapAxes: Array<'x' | 'y' | 'z'>,
  debug = false,
) {
  // make sure whole scene has correct matrices
  scene.updateMatrixWorld(true);

  let minPos: number | null = null;
  let maxPos: number | null = null;
  let minBox: THREE.Box3 | null = null;
  let maxBox: THREE.Box3 | null = null;

  let minWallPos: number | null = null;
  let maxWallPos: number | null = null;

  const selfMin = selfBox.min[axis];
  const selfMax = selfBox.max[axis];

  // compute world center of self to detect side walls robustly
  const selfCenter = new THREE.Vector3();
  selfBox.getCenter(selfCenter);

  // heuristics for side-wall behaviour (use world center)
  const isSideWallPlank =
    self.name.toLowerCase().includes('platform_leftwall') ||
    self.name.toLowerCase().includes('platform_rightwall') ||
    self.userData?.isSideWall === true ||
    (axis === 'z' && Math.abs(selfCenter.x) > 0.5); // far from center (world units)

  // helper to test axis-overlap
  const overlapsOnAxesLocal = (
    a: THREE.Box3,
    b: THREE.Box3,
    axes: Array<'x' | 'y' | 'z'>,
  ) => {
    for (const ax of axes) {
      if (ax === 'x' && (a.max.x <= b.min.x + EPS || a.min.x >= b.max.x - EPS))
        return false;
      if (ax === 'y' && (a.max.y <= b.min.y + EPS || a.min.y >= b.max.y - EPS))
        return false;
      if (ax === 'z' && (a.max.z <= b.min.z + EPS || a.min.z >= b.max.z - EPS))
        return false;
    }
    return true;
  };

  // Check if object is a wall (highest priority)
  const isWallObject = (o: THREE.Object3D): boolean => {
    const name = (o.name || '').toLowerCase();
    return (
      name.includes('wall') ||
      name.includes('cwall') ||
      name.includes('back wall') ||
      name.includes('left wall') ||
      name.includes('right wall') ||
      name.includes('center wall')
    );
  };

  // Check if object is a plank (lower priority than walls)
  const isPlankObject = (o: THREE.Object3D): boolean => {
    const name = (o.name || '').toLowerCase();
    return (
      name.includes('plank') ||
      name.includes('VERTICAL_PLANK') ||
      name.includes('HORIZONTAL_PLANK')
    );
  };

  // walk scene and look for potential reference objects
  scene.traverse((o) => {
    if (o === self) return;
    if (!(o instanceof THREE.Mesh || (o as any).isMesh)) return;

    // robustly ignore helpers / invisible boxes
    if (isHelperOrInvisible(o)) return;

    const b = getAABB(o);
    const isWall = isWallObject(o);
    const isPlank = isPlankObject(o);

    // must project-overlap on the specified axes
    if (!overlapsOnAxesLocal(selfBox, b, overlapAxes)) return;

    // negative direction candidate (object entirely on the negative side)
    if (b.max[axis] <= selfMin - EPS) {
      // WALLS have highest priority
      if (isWall) {
        if (minWallPos === null || b.max[axis] > minWallPos) {
          minWallPos = b.max[axis];
        }
      }
      // Only consider planks if no wall found yet
      else if (isPlank && minWallPos === null) {
        if (minPos === null || b.max[axis] > minPos) {
          minPos = b.max[axis];
          minBox = b;
        }
      }
      // Other objects (counters, platforms, etc.) have lowest priority
      else if (!isPlank && minWallPos === null && minPos === null) {
        if (minPos === null || b.max[axis] > minPos) {
          minPos = b.max[axis];
          minBox = b;
        }
      }
    }

    // positive direction candidate
    if (b.min[axis] >= selfMax + EPS) {
      // WALLS have highest priority
      if (isWall) {
        if (maxWallPos === null || b.min[axis] < maxWallPos) {
          maxWallPos = b.min[axis];
        }
      }
      // Only consider planks if no wall found yet
      else if (isPlank && maxWallPos === null) {
        if (maxPos === null || b.min[axis] < maxPos) {
          maxPos = b.min[axis];
          maxBox = b;
        }
      }
      // Other objects have lowest priority
      else if (!isPlank && maxWallPos === null && maxPos === null) {
        if (maxPos === null || b.min[axis] < maxPos) {
          maxPos = b.min[axis];
          maxBox = b;
        }
      }
    }

    if (debug) {
      console.log(
        'candidate',
        o.name,
        'isWall:',
        isWall,
        'isPlank:',
        isPlank,
        'b.min',
        b.min[axis],
        'b.max',
        b.max[axis],
      );
    }
  });

  // Return wall positions if found, otherwise plank positions, otherwise other positions
  return {
    minPos: minWallPos !== null ? minWallPos : minPos !== null ? minPos : null,
    maxPos: maxWallPos !== null ? maxWallPos : maxPos !== null ? maxPos : null,
    minBox: minWallPos !== null ? null : minBox, // Don't return box for walls
    maxBox: maxWallPos !== null ? null : maxBox, // Don't return box for walls
  };
}

export function clearPlankDimensions(scene: THREE.Scene, mesh: THREE.Object3D) {
  const name = DIMENSION_GROUP_PREFIX + mesh.uuid;
  const existing = scene.getObjectByName(name) as THREE.Group | null;
  if (existing) {
    scene.remove(existing);
    existing.traverse((n: any) => {
      if (n.geometry) n.geometry.dispose?.();
      if (n.material) {
        if (Array.isArray(n.material))
          n.material.forEach((m: any) => m.dispose?.());
        else n.material.dispose?.();
      }
      if (n.material?.map) n.material.map.dispose?.();
    });
  }
}

export function clearAllPlankDimensions(scene: THREE.Scene) {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name && o.name.startsWith(DIMENSION_GROUP_PREFIX)) {
      toRemove.push(o);
    }
  });
  toRemove.forEach((g) => {
    scene.remove(g);
    g.traverse?.((n: any) => {
      if (n.geometry) n.geometry.dispose?.();
      if (n.material) {
        if (Array.isArray(n.material))
          n.material.forEach((m: any) => m.dispose?.());
        else n.material.dispose?.();
      }
      if (n.material?.map) n.material.map.dispose?.();
    });
  });
}

export function showPlankDimensions(scene: THREE.Scene, mesh: THREE.Mesh) {
  // Clear previous for this mesh
  clearPlankDimensions(scene, mesh);
  const group = new THREE.Group();
  group.name = DIMENSION_GROUP_PREFIX + mesh.uuid;

  const box = getAABB(mesh);
  // Determine orientation by thickness axis
  const params = (mesh.geometry as any).parameters || {};
  const w = params.width as number | undefined;
  const h = params.height as number | undefined;
  const d = params.depth as number | undefined;
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Fallback if geometry parameters missing
  const size = new THREE.Vector3();
  box.getSize(size);
  const width = w ?? size.x;
  const height = h ?? size.y;
  const depth = d ?? size.z;

  // Determine plank orientation and wall type
  const isHorizontal = height < width && height < depth;
  const isThinX = width <= depth && !isHorizontal;
  const isThinZ = depth < width && !isHorizontal;

  const isSideWallPlank =
    mesh.name.toLowerCase().includes('platform_leftwall') ||
    mesh.name.toLowerCase().includes('platform_rightwall') ||
    mesh.userData?.isSideWall === true ||
    (isThinZ && Math.abs(center.x) > 0.5);

  if (isHorizontal) {
    // Measure to bottom/top along Y where X and Z projections overlap
    const { minPos, maxPos } = findNearestAlongAxis(scene, mesh, box, 'y', [
      'x',
      'z',
    ]);
    if (minPos !== null) {
      const dist = mm(box.min.y - (minPos as number));
      const s = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        minPos as number,
        (box.min.z + box.max.z) / 2,
      );
      const e = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.min.y,
        (box.min.z + box.max.z) / 2,
      );
      addDimLine(
        group,
        s,
        e,
        new THREE.Vector3(1, 0, 0),
        `${dist.toFixed(1)} mm`,
        {
          axis: 'y',
          side: 'min',
          ref: minPos as number,
          targetUuid: mesh.uuid,
        },
      );
    }
    if (maxPos !== null) {
      const dist = mm((maxPos as number) - box.max.y);
      const s = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.max.y,
        (box.min.z + box.max.z) / 2,
      );
      const e = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        maxPos as number,
        (box.min.z + box.max.z) / 2,
      );
      addDimLine(
        group,
        s,
        e,
        new THREE.Vector3(1, 0, 0),
        `${dist.toFixed(1)} mm`,
        {
          axis: 'y',
          side: 'max',
          ref: maxPos as number,
          targetUuid: mesh.uuid,
        },
      );
    }
  } else if (isThinX) {
    // Vertical plank with thickness in X -> measure left/right along X with Y,Z overlap
    const { minPos, maxPos } = findNearestAlongAxis(scene, mesh, box, 'x', [
      'y',
      'z',
    ]);
    if (minPos !== null) {
      const dist = mm(box.min.x - (minPos as number));
      const s = new THREE.Vector3(
        minPos as number,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2,
      );
      const e = new THREE.Vector3(
        box.min.x,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2,
      );
      addDimLine(
        group,
        s,
        e,
        new THREE.Vector3(0, 1, 0),
        `${dist.toFixed(1)} mm`,
        {
          axis: 'x',
          side: 'min',
          ref: minPos as number,
          targetUuid: mesh.uuid,
        },
      );
    }
    if (maxPos !== null) {
      const dist = mm((maxPos as number) - box.max.x);
      const s = new THREE.Vector3(
        box.max.x,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2,
      );
      const e = new THREE.Vector3(
        maxPos as number,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2,
      );
      addDimLine(
        group,
        s,
        e,
        new THREE.Vector3(0, 1, 0),
        `${dist.toFixed(1)} mm`,
        {
          axis: 'x',
          side: 'max',
          ref: maxPos as number,
          targetUuid: mesh.uuid,
        },
      );
    }
  } else if (isThinZ) {
    // Vertical plank with thickness in Z -> measure near/far along Z with X,Y overlap
    // For side walls, we need to find reference points differently
    const { minPos, maxPos } = findNearestAlongAxis(scene, mesh, box, 'z', [
      'x',
      'y',
    ]);

    // Determine view offset direction based on wall position
    let viewOffsetDir: THREE.Vector3;
    if (isSideWallPlank) {
      // For side walls, offset perpendicular to the wall (along X axis)
      const offsetSign = mesh.position.x < 0 ? -1 : 1; // Left wall: offset left, Right wall: offset right
      viewOffsetDir = new THREE.Vector3(offsetSign, 0, 0);
    } else {
      // For back wall, offset along Z axis
      viewOffsetDir = new THREE.Vector3(0, 0, 1);
    }

    if (minPos !== null) {
      const dist = mm(box.min.z - (minPos as number));
      const s = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        minPos as number,
      );
      const e = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        box.min.z,
      );
      addDimLine(group, s, e, viewOffsetDir, `${dist.toFixed(1)} mm`, {
        axis: 'z',
        side: 'min',
        ref: minPos as number,
        targetUuid: mesh.uuid,
      });
    }
    if (maxPos !== null) {
      const dist = mm((maxPos as number) - box.max.z);
      const s = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        box.max.z,
      );
      const e = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        maxPos as number,
      );
      addDimLine(group, s, e, viewOffsetDir, `${dist.toFixed(1)} mm`, {
        axis: 'z',
        side: 'max',
        ref: maxPos as number,
        targetUuid: mesh.uuid,
      });
    }
  }

  if (group.children.length > 0) {
    scene.add(group);
  }
}
export function enablePlankDimensionEditing(view: ThreeDView) {
  const onClick = (event: MouseEvent) => {
    const rect = view.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, view.camera);
    // Only sprites
    const sprites: THREE.Object3D[] = [];
    view.scene.traverse((o) => {
      if (o instanceof THREE.Sprite && o.name.startsWith(DIM_LABEL_PREFIX)) {
        sprites.push(o);
      }
    });
    const hits = ray.intersectObjects(sprites, true);
    if (!hits.length) return;
    const sprite = hits[0].object as THREE.Sprite & { userData: any };
    const meta = sprite.userData?.dimMeta as
      | {
          axis: 'x' | 'y' | 'z';
          side: 'min' | 'max';
          ref: number;
          targetUuid: string;
        }
      | undefined;
    if (!meta) return;

    const target = view.scene.getObjectByProperty(
      'uuid',
      meta.targetUuid,
    ) as THREE.Mesh | null;
    if (!target) return;
    const box = new THREE.Box3().setFromObject(target);
    const currentDistanceM = ((): number => {
      if (meta.axis === 'x')
        return meta.side === 'min'
          ? box.min.x - meta.ref
          : meta.ref - box.max.x;
      if (meta.axis === 'y')
        return meta.side === 'min'
          ? box.min.y - meta.ref
          : meta.ref - box.max.y;
      return meta.side === 'min' ? box.min.z - meta.ref : meta.ref - box.max.z;
    })();
    const currentMm = Math.max(0, currentDistanceM * 1000);
    const input = prompt('Enter new distance (mm):', currentMm.toFixed(1));
    if (!input) return;
    const newMm = parseFloat(input);
    if (!Number.isFinite(newMm) || newMm < 0) return;
    const newM = newMm / 1000;

    // Compute required delta translation along axis so that that new distance is achieved
    const desiredFace = meta.ref + (meta.side === 'min' ? newM : -newM);
    const currentFace = ((): number => {
      if (meta.axis === 'x') return meta.side === 'min' ? box.min.x : box.max.x;
      if (meta.axis === 'y') return meta.side === 'min' ? box.min.y : box.max.y;
      return meta.side === 'min' ? box.min.z : box.max.z;
    })();
    const delta = desiredFace - currentFace;

    if (meta.axis === 'x') target.position.x += delta;
    else if (meta.axis === 'y') target.position.y += delta;
    else target.position.z += delta;

    // Refresh dimensions for the moved plank
    showPlankDimensions(view.scene, target);

    // Refresh invisible boxes for the affected group
    refreshInvisibleBoxesForPlank(view.scene, target);

    view.renderer.render(view.scene, view.camera);
  };

  view.renderer.domElement.addEventListener('dblclick', onClick);
}
function dispatch(arg0: { payload: string | null; type: "data/setobjectSelected"; }) {
  throw new Error('Function not implemented.');
}

