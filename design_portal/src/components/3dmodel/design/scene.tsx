import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { removeExistingLines } from '.';
import { TEXTURES_URLS } from '../constants';
import { addItemtoDatabase, generateCompartmentsFromMesh, initializeMoveHandler } from '../handler/items';
import { store } from '../store';
import {
  setHoverdMesh,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
} from '../store/dataSlice';
import { createGrid } from './grid-creator';
import { ThreeDView } from './interface';
import { createRealisticMaterial } from './loadRealisticScene';
import { v4 as uuidv4 } from 'uuid';

let cachedHandleModel: THREE.Object3D | null = null;

// Constants
const EPSILON_OFFSET = 0.001; // Small offset to avoid Z-fighting
const EPS = 1e-6;
const DIM_LABEL_PREFIX = 'dim_label_';
const DIMENSION_GROUP_PREFIX = 'dim_group_';
const mm = (meters: number): number => meters * 1000;

const toAvoidOverlap = 0.01; // 1mm offset to avoid overlap z-fighting // so floor sits just up y=0.01 to avoid overlap grid

export const init3DDesign = async (
  mount: HTMLDivElement,
): Promise<ThreeDView> => {
  const scene = new THREE.Scene();
  const perspectiveCamera = new THREE.PerspectiveCamera(
    50,
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

  const { daySky, nightSky, stars } = createSkySet();

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMappingExposure = 1;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  initializeMoveHandler({ scene, camera, renderer });

  // Grid
  const gridSize = 1000;
  const gridDivisions = 1000;
  const grid = createGrid(gridSize, gridDivisions);
  scene.add(grid);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  ambientLight.intensity = 0.8;
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(10, 15, 10);
  directionalLight.intensity = 0.8;
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.target.set(0, 0, 0);

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.size = 0.3;
  transformControls.space = 'world';
  controls.target.set(0, 0, 0);

  // State
  let isDay = true;
  let isZoomMode = false;
  let startPoint: THREE.Vector2 | null = null;
  let overlayCanvas: HTMLCanvasElement | null = null;
  let overlayContext: CanvasRenderingContext2D | null = null;

  scene.add(daySky);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemiLight);

  const toggleSky = () => {
    if (isDay) {
      scene.remove(daySky);
      scene.add(nightSky);
      scene.add(stars);
    } else {
      scene.remove(nightSky);
      scene.remove(stars);
      scene.add(daySky);
    }
    isDay = !isDay;
  };

  // Walls will be added after design objects load to ensure correct ordering

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
        const box2 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        model.position.sub(center);
        model.position.x = mesh.position.x - 2;
        model.position.y = 0.52;
        model.position.z = mesh.position.z;
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
        obj.visible &&
        !(obj instanceof THREE.GridHelper) &&
        !(obj instanceof Sky) &&
        obj.name !== 'stars',
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

        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
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
      const width = max.x - min.x;
      const height = max.z - min.z;
      const aspect = window.innerWidth / window.innerHeight;
      const maxDimension = Math.max(width, height);
      const newZoom = Math.min(
        window.innerWidth / maxDimension,
        window.innerHeight / (maxDimension / aspect),
      );

      camera.zoom = newZoom * 0.8;
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

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,
    0.1,
    0.1,
  );
  composer.addPass(bloomPass);

  const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
  composer.addPass(smaaPass);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    composer.render();
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
    addComputerDesk: () => addComputerDesk(scene),
    loadSinkModel,
    addUpperCabinetsAbovePlatform,
    addDoubleDoorUpperCabinetsAbovePlatform,
  };
};
const createSkySet = (): {
  daySky: Sky;
  nightSky: Sky;
  stars: THREE.Points;
} => {
  // --- DaySky ---
  const daySky = new Sky();
  daySky.scale.setScalar(450000);
  const sunDay = new THREE.Vector3();
  sunDay.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(70),
    THREE.MathUtils.degToRad(0),
  );
  daySky.name = 'daysky';
  daySky.material.uniforms['sunPosition'].value.copy(sunDay);
  daySky.material.uniforms['rayleigh'].value = 2;
  daySky.material.uniforms['turbidity'].value = 2;
  daySky.material.uniforms['mieCoefficient'].value = 0.0001;

  // night
  const nightSky = new Sky();
  nightSky.scale.setScalar(450000);
  const sunNight = new THREE.Vector3();
  sunNight.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(190),
    THREE.MathUtils.degToRad(180),
  );
  nightSky.name = 'nightsky';
  nightSky.material.uniforms['sunPosition'].value.copy(sunNight);
  nightSky.material.uniforms['rayleigh'].value = 0.1;
  nightSky.material.uniforms['turbidity'].value = 0.1;
  nightSky.material.uniforms['mieCoefficient'].value = 0.005;
  nightSky.material.uniforms['mieDirectionalG'].value = 0.8;

  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  for (let i = 0; i < 5000; i++) {
    starVertices.push(
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000,
    );
  }
  starGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices, 3),
  );
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'stars';

  return { daySky, nightSky, stars };
};

function getFloorY(scene: THREE.Scene): number {
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
  return floorY;
}

function getPlacementZAgainstCenterWall(
  scene: THREE.Scene,
  depth: number,
): number {
  let placeZ = depth / 2 + 0.02;
  const centerWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  if (centerWall) {
    const params = (centerWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    placeZ = centerWall.position.z + wallDepth / 2 + depth / 2 + 0.005;
  }
  return placeZ;
}

// Helper function to create invisible material
function createInvisibleMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
}

// Helper function to create invisible box mesh
export function createInvisibleBox(
  dimensions: { width: number; height: number; depth: number },
  position: { x: number; y: number; z: number },
  name: string,
  userData: any = {},
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(
    dimensions.width,
    dimensions.height,
    dimensions.depth,
  );
  const material = createInvisibleMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position.x, position.y, position.z);
  mesh.userData = { ...userData, objectId: uuidv4(), isInvisibleBox: true };
  return mesh;
}
export function createMeshObject(
  part: any,
  setShadows: boolean = true,
  userData: any = {},
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(
    part.dimensions.width,
    part.dimensions.height,
    part.dimensions.depth,
  );

  const materialProps = part.material;
  const material = new THREE.MeshStandardMaterial(materialProps);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.name || 'unnamed_plank';

  if (part.position) {
    mesh.position.set(
      part.position.x || 0,
      part.position.y || 0,
      part.position.z || 0,
    );
  }
  if (part.rotation) {
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.rotation.x || 0),
      THREE.MathUtils.degToRad(part.rotation.y || 0),
      THREE.MathUtils.degToRad(part.rotation.z || 0),
    );
  }
  if (setShadows) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  mesh.userData = { ...mesh.userData, ...userData };
  return mesh;
}
export const addCTypeWallWithFloor = async (scene: THREE.Scene) => {
  const wallHeight = 3;
  const wallThickness = 0.05;
  const wallLength = 5;
  const wallMaterial = await createRealisticMaterial(scene, {
    textures: TEXTURES_URLS.WALL,
    repeatX: 4,
    repeatY: 4,
  });

  const floorMaterial = await createRealisticMaterial(scene, {
    textures: TEXTURES_URLS.FLOOR,
    repeatX: 5,
    repeatY: 4,
  });
  // ---------- Panels ----------
  // Back wall
  const centerWallPart = {
    name: 'Center Wall',
    dimensions: {
      width: wallLength - 2 * wallThickness,
      height: wallHeight,
      depth: wallThickness,
    },
    position: { x: 0, y: wallHeight / 2, z: 0 },
    material: wallMaterial,
    userData: { objectId: window.crypto.randomUUID(), type: 'wall' },
  };
  const centerPanel = createMeshObject(
    centerWallPart,
    false,
    centerWallPart.userData,
  );

  // Left wall part
  const leftWallPart = {
    name: 'Left Wall',
    dimensions: { width: wallThickness, height: wallHeight, depth: wallLength },
    position: {
      x: -wallLength / 2 + wallThickness / 2,
      y: wallHeight / 2,
      z: wallLength / 2 - wallThickness / 2,
    },
    material: wallMaterial,
    userData: { objectId: window.crypto.randomUUID(), type: 'wall' },
  };
  const leftwall = createMeshObject(leftWallPart, false, leftWallPart.userData);

  // Right wall part
  const rightwallPart = {
    name: 'Right Wall',
    dimensions: { width: wallThickness, height: wallHeight, depth: wallLength },
    position: {
      x: wallLength / 2 - wallThickness / 2,
      y: wallHeight / 2,
      z: wallLength / 2 - wallThickness / 2,
    },
    material: wallMaterial,
    userData: { objectId: window.crypto.randomUUID(), type: 'wall' },
  };
  const rightwall = createMeshObject(
    rightwallPart,
    false,
    rightwallPart.userData,
  );

  // Floor (using PlaneGeometry)
  const floorPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(wallLength, wallLength), // square floor
    floorMaterial,
  );
  floorPanel.rotation.x = -Math.PI / 2;
  floorPanel.castShadow = true;
  floorPanel.receiveShadow = true;
  floorPanel.position.set(
    0,
    toAvoidOverlap,
    wallLength / 2 - wallThickness / 2,
  );

  const cWallGroup = new THREE.Group();
  cWallGroup.name = 'cWallWithFloor';
  cWallGroup.add(centerPanel, leftwall, rightwall, floorPanel);
  scene.add(cWallGroup);
};
export const addSimpleCabinet = (scene: THREE.Scene) => {
  const width = 1.5;
  const height = 2;
  const depth = 0.4;
  const thickness = 0.018;

  const floorY = getFloorY(scene);
  const placeZ = getPlacementZAgainstCenterWall(scene, depth);
  const placeX = 0;

  const textureLoader = new THREE.TextureLoader();
  const woodTex = textureLoader.load('/textures/light_wood.jpg');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 1);

  const plankMaterialProps = { map: woodTex, roughness: 0.6, metalness: 0 };

  const cabinetContainer = createInvisibleBox(
    { width, height, depth },
    { x: placeX, y: floorY + height / 2, z: placeZ },
    'SimpleCabinet',
    { baseDims: { width, height, depth }, lastDims: { width, height, depth } },
  );

  const leftPart = {
    name: 'LEFT_PLANK',
    dimensions: { width: thickness, height: height, depth: depth },
    position: { x: -(width / 2 - thickness / 2), y: 0, z: 0 },
    material: plankMaterialProps,
  };
  const left = createMeshObject(leftPart, false, { type: 'Plank' });

  const rightPart = {
    name: 'RIGHT_PLANK',
    dimensions: { width: thickness, height: height, depth: depth },
    position: { x: width / 2 - thickness / 2, y: 0, z: 0 },
    material: plankMaterialProps,
  };
  const right = createMeshObject(rightPart, false, { type: 'Plank' });

  const bottomPart = {
    name: 'BOTTOM_PLANK',
    dimensions: {
      width: width - thickness * 2,
      height: thickness,
      depth: depth,
    },
    position: { x: 0, y: -(height / 2 - thickness / 2), z: 0 },
    material: plankMaterialProps,
  };
  const bottom = createMeshObject(bottomPart, false, { type: 'Plank' });

  const topPart = {
    name: 'TOP_PLANK',
    dimensions: {
      width: width - thickness * 2,
      height: thickness,
      depth: depth,
    },
    position: { x: 0, y: height / 2 - thickness / 2, z: 0 },
    material: plankMaterialProps,
  };
  const top = createMeshObject(topPart, false, { type: 'Plank' });

  const backPart = {
    name: 'BACK_PLANK',
    dimensions: {
      width: width - thickness * 2,
      height: height - thickness * 2,
      depth: thickness,
    },
    position: { x: 0, y: 0, z: -(depth / 2 - thickness / 2) },
    material: plankMaterialProps,
  };
  const back = createMeshObject(backPart);

  cabinetContainer.add(left, right, bottom, top, back);
  cabinetContainer.userData.objectId = `${uuidv4()}`;

  generateCompartmentsFromMesh(cabinetContainer);
  cabinetContainer.userData.isMain = true;
  cabinetContainer.userData.objectId = uuidv4();
  scene.add(cabinetContainer);
};

export const addSimpleTVUnit = (scene: THREE.Scene) => {
  const width = 1.6;
  const baseHeight = 0.26;
  const depth = 0.35;
  const thickness = 0.018;
  const gap = 0;
  const panelHeight = 1.0;
  const topShelfDepth = 0.25;
  const smallShelfDepth = 0.25;
  const smallShelfWidth = 0.35;
  const numCubbies = 4;

  const floorY = getFloorY(scene);
  const placeZ = getPlacementZAgainstCenterWall(scene, depth);
  const placeX = 0;

  const textureLoader = new THREE.TextureLoader();
  const darkTex = textureLoader.load('/textures/wood_6.jpg');
  darkTex.wrapS = darkTex.wrapT = THREE.RepeatWrapping;
  darkTex.repeat.set(3, 1);
  const whiteTex = textureLoader.load('/textures/off_white.jpg');
  whiteTex.wrapS = whiteTex.wrapT = THREE.RepeatWrapping;
  whiteTex.repeat.set(1, 1);

  const darkMatProps = { map: darkTex, roughness: 0.6, metalness: 0.0 };
  const whiteMatProps = { map: whiteTex, roughness: 0.5, metalness: 0.0 };

  const overallHeight = baseHeight + gap + panelHeight;
  const overallDepth = Math.max(depth, topShelfDepth);

  const container = createInvisibleBox(
    { width, height: overallHeight, depth: overallDepth },
    { x: placeX, y: floorY + overallHeight / 2, z: 0 },
    'SimpleTVUnit',
    {
      baseDims: { width, height: overallHeight, depth: overallDepth },
      lastDims: { width, height: overallHeight, depth: overallDepth },
    },
  );

  const deltaY = floorY + baseHeight / 2 - container.position.y;

  // Bottom parts
  const baseLeftPart = {
    name: 'LEFT_PLANK',
    dimensions: { width: thickness, height: baseHeight, depth: depth },
    position: { x: -(width / 2 - thickness / 2), y: 0 + deltaY, z: 0 },
    material: darkMatProps,
  };
  const baseLeft = createMeshObject(baseLeftPart, false, { type: 'Plank' });

  const baseRightPart = {
    name: 'RIGHT_PLANK',
    dimensions: { width: thickness, height: baseHeight, depth: depth },
    position: { x: width / 2 - thickness / 2, y: 0 + deltaY, z: 0 },
    material: darkMatProps,
  };
  const baseRight = createMeshObject(baseRightPart, false, { type: 'Plank' });

  const baseBottomPart = {
    name: 'BOTTOM_PLANK',
    dimensions: {
      width: width - thickness * 2,
      height: thickness,
      depth: depth,
    },
    position: { x: 0, y: -(baseHeight / 2 - thickness / 2) + deltaY, z: 0 },
    material: darkMatProps,
  };
  const baseBottom = createMeshObject(baseBottomPart, false, { type: 'Plank' });

  const baseTopPart = {
    name: 'TOP_PLANK',
    dimensions: {
      width: width - thickness * 2,
      height: thickness,
      depth: depth,
    },
    position: { x: 0, y: baseHeight / 2 - thickness / 2 + deltaY, z: 0 },
    material: whiteMatProps,
  };
  const baseTop = createMeshObject(baseTopPart, false, { type: 'Plank' });

  const dividers: THREE.Mesh[] = [];
  const cubbyWidth = (width - thickness * 2) / numCubbies;
  for (let i = 1; i < numCubbies; i++) {
    const x = -width / 2 + thickness + cubbyWidth * i;
    const divPart = {
      name: `VERTICAL_PLANK_${i}`,
      dimensions: {
        width: thickness,
        height: baseHeight - thickness * 2,
        depth: depth - thickness * 2,
      },
      position: { x, y: 0 + deltaY, z: 0 },
      material: darkMatProps,
    };
    const div = createMeshObject(divPart, false, { type: 'Plank' });
    dividers.push(div);
  }

  container.add(baseLeft, baseRight, baseBottom, baseTop, ...dividers);

  // Upper parts
  const verticalPlankPart = {
    name: 'VERTICAL_PLANK_RIGHT_PANEL',
    dimensions: { width: thickness, height: panelHeight, depth: depth },
    position: {
      x: width / 2 - thickness / 2,
      y: baseHeight / 2 + gap + panelHeight / 2 + deltaY,
      z: 0,
    },
    material: darkMatProps,
  };
  const verticalPanel = createMeshObject(verticalPlankPart, false, {
    type: 'Plank',
  });

  const topHorizontalShelfPart = {
    name: 'HORIZONTAL_PLANK_TOP_SHELF',
    dimensions: { width: width, height: thickness, depth: topShelfDepth },
    position: {
      x: 0,
      y: baseHeight / 2 + gap + panelHeight - thickness / 2 + deltaY,
      z: depth / 2 - topShelfDepth / 2,
    },
    material: whiteMatProps,
  };
  const topHorizontalShelf = createMeshObject(topHorizontalShelfPart, false, {
    type: 'Plank',
  });

  const smallShelvesY = [0.2, 0.45, 0.7];
  const sShelves: THREE.Mesh[] = [];
  smallShelvesY.forEach((ratio, idx) => {
    const y = baseHeight / 2 + gap + ratio * panelHeight + deltaY;
    const shelfPart = {
      name: `HORIZONTAL_PLANK_SHELF_${idx}`,
      dimensions: {
        width: smallShelfWidth,
        height: thickness,
        depth: smallShelfDepth,
      },
      position: {
        x: width / 2 - thickness - smallShelfWidth / 2,
        y,
        z: depth / 2 - smallShelfDepth / 2,
      },
      material: whiteMatProps,
    };
    const s = createMeshObject(shelfPart, false, { type: 'Plank' });
    sShelves.push(s);
  });

  container.add(verticalPanel, topHorizontalShelf, ...sShelves);

  generateCompartmentsFromMesh(container);
  container.userData.isMain = true;
  container.userData.objectId = uuidv4();
  scene.add(container);
};

export const addComputerDesk = (scene: THREE.Scene) => {
  const deskWidth = 1.4;
  const deskDepth = 0.55;
  const deskHeight = 0.74;
  const plank = 0.018;
  const returnWidth = 0.5;

  const floorY = getFloorY(scene);
  const centerZ = getPlacementZAgainstCenterWall(scene, deskDepth);

  const textureLoader = new THREE.TextureLoader();
  const carcTex = textureLoader.load('/textures/wood_6.jpg');
  carcTex.wrapS = carcTex.wrapT = THREE.RepeatWrapping;
  carcTex.repeat.set(2, 1);
  const frontTex = textureLoader.load('/textures/off_white.jpg');
  frontTex.wrapS = frontTex.wrapT = THREE.RepeatWrapping;

  const carcMatProps = { map: carcTex, roughness: 0.6 };

  const towerOuterH = deskHeight + 0.9;
  const overallHeight = Math.max(deskHeight, towerOuterH);

  const container = createInvisibleBox(
    { width: deskWidth, height: overallHeight, depth: deskDepth },
    { x: 0, y: floorY + overallHeight / 2, z: centerZ },
    'ComputerDesk',
    {
      baseDims: { width: deskWidth, height: overallHeight, depth: deskDepth },
      lastDims: { width: deskWidth, height: overallHeight, depth: deskDepth },
    },
  );

  const deltaY = floorY - (container.position.y - overallHeight / 2);

  // Main desktop slab
  const topPart = {
    name: 'HORIZONTAL_TOP_PLANK',
    dimensions: { width: deskWidth, height: plank * 2, depth: deskDepth },
    position: {
      x: 0,
      y: -overallHeight / 2 + deskHeight - plank + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const top = createMeshObject(topPart, false, { type: 'Plank' });

  // Left leg panel
  const leftLegPart = {
    name: 'VERTICAL_PLANK_LEFT',
    dimensions: { width: plank, height: deskHeight, depth: deskDepth },
    position: {
      x: -deskWidth / 2 + plank / 2,
      y: -overallHeight / 2 + deskHeight / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const leftLeg = createMeshObject(leftLegPart, false, { type: 'Plank' });

  // Tower parts
  const towerOuterW = returnWidth;
  const towerOuterD = deskDepth;

  const towerLeftPart = {
    name: 'VERTICAL_PLANK_TOWER_LEFT',
    dimensions: { width: plank, height: towerOuterH, depth: towerOuterD },
    position: {
      x: deskWidth / 2 - towerOuterW + plank / 2,
      y: -overallHeight / 2 + towerOuterH / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const towerLeftPlank = createMeshObject(towerLeftPart, false, { type: 'Plank' });

  const towerRightPart = {
    name: 'VERTICAL_PLANK_TOWER_RIGHT',
    dimensions: { width: plank, height: towerOuterH, depth: towerOuterD },
    position: {
      x: deskWidth / 2 - plank / 2,
      y: -overallHeight / 2 + towerOuterH / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const towerRightPlank = createMeshObject(towerRightPart, false, { type: 'Plank' });

  const towerBackPart = {
    name: 'BACK_PLANK_TOWER',
    dimensions: {
      width: towerOuterW - plank * 2,
      height: towerOuterH - plank * 2,
      depth: plank,
    },
    position: {
      x: deskWidth / 2 - towerOuterW / 2,
      y: -overallHeight / 2 + towerOuterH / 2 + deltaY,
      z: -towerOuterD / 2 + plank / 2,
    },
    material: carcMatProps,
  };
  const towerBackPlank = createMeshObject(towerBackPart, false, { type: 'Plank' });

  const towerBottomPart = {
    name: 'HORIZONTAL_PLANK_TOWER_BOTTOM',
    dimensions: {
      width: towerOuterW - plank * 2,
      height: plank,
      depth: towerOuterD,
    },
    position: {
      x: deskWidth / 2 - towerOuterW / 2,
      y: -overallHeight / 2 + plank / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const towerBottomPlank = createMeshObject(towerBottomPart, false, { type: 'Plank' });

  const towerTopPart = {
    name: 'HORIZONTAL_PLANK_TOWER_TOP',
    dimensions: {
      width: towerOuterW - plank * 2,
      height: plank,
      depth: towerOuterD,
    },
    position: {
      x: deskWidth / 2 - towerOuterW / 2,
      y: -overallHeight / 2 + towerOuterH - plank / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const towerTopPlank = createMeshObject(towerTopPart, false, { type: 'Plank' });

  const shelfClearH = 0.3;
  const midShelfPart = {
    name: 'HORIZONTAL_PLANK_TOWER_MID',
    dimensions: {
      width: towerOuterW - plank * 2,
      height: plank,
      depth: towerOuterD,
    },
    position: {
      x: deskWidth / 2 - towerOuterW / 2,
      y: -overallHeight / 2 + deskHeight + shelfClearH - plank / 2 + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const midShelf = createMeshObject(midShelfPart, false, { type: 'Plank' });

  const retTopPart = {
    name: 'HORIZONTAL_PLANK_TOWER_LOWER',
    dimensions: { width: towerOuterW, height: plank * 2, depth: deskDepth },
    position: {
      x: deskWidth / 2 - towerOuterW / 2,
      y: -overallHeight / 2 + deskHeight - plank + deltaY,
      z: 0,
    },
    material: carcMatProps,
  };
  const retTop = createMeshObject(retTopPart, false, { type: 'Plank' });

  container.add(
    top,
    leftLeg,
    towerBackPlank,
    towerLeftPlank,
    towerRightPlank,
    towerBottomPlank,
    towerTopPlank,
    midShelf,
    retTop,
  );

  generateCompartmentsFromMesh(container);
  container.userData.isMain = true;
  container.userData.objectId = uuidv4();
  scene.add(container);
};

export const addPlatformOnWall = async (
  scene: THREE.Scene,
  wallMesh: THREE.Mesh | null,
  counterTexture: THREE.Texture,
) => {
  if (!counterTexture) {
    const textureLoader = new THREE.TextureLoader();
    counterTexture = textureLoader.load('/img14_64.jpg');
    counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
    counterTexture.repeat.set(10, 1);
  }
  const platformHeight = 0.7;
  const countertopThickness = 0.05;
  const defaultProtrusion = 0.74;

  const params = (wallMesh?.geometry as THREE.BoxGeometry).parameters as any;
  const wallW = params.width as number;
  const wallD = params.depth as number;

  const platformGroup = new THREE.Group();
  platformGroup.name = `Platform_${wallMesh?.name}`;

  const floorY = getFloorY(scene);

  const addedMeshes: Array<{
    name: string;
    width: number;
    height: number;
    depth: number;
    position: { x: number; y: number; z: number };
    data: { rotation: { x: number; y: number; z: number }; wall: string };
  }> = [];

  const counterMaterial = await createRealisticMaterial(scene, {
    textures: TEXTURES_URLS.PLATFORM,
    repeatX: 10,
    repeatY: 1,
    rotation:
      wallMesh?.name === 'Left Wall' || wallMesh?.name === 'Right Wall'
        ? Math.PI / 2
        : null,
  });

  function addStaticInvisibleBoxforPlatform(
    platformGroup: THREE.Group,
    topMesh: THREE.Mesh,
    floorY: number,
    countertopThickness: number,
    dimensions: { width: number; depth: number },
    nameSuffix: string,
  ) {
    const invisibleBoxHeight =
      topMesh.position.y - countertopThickness / 2 - floorY;
    if (invisibleBoxHeight <= 0.001) return;

    const invisible = createInvisibleBox(
      {
        width: dimensions.width,
        height: invisibleBoxHeight,
        depth: dimensions.depth,
      },
      {
        x: topMesh.position.x,
        y: floorY + invisibleBoxHeight / 2,
        z: topMesh.position.z,
      },
      `invisibleBox_platform_${nameSuffix}`,
      {
        objectId: `invisibleBox_platform_${nameSuffix}`,
        type: 'INVISIBLE_COMPARTMENT',
        dimensions: {
          width: dimensions.width,
          height: invisibleBoxHeight,
          depth: dimensions.depth,
        },
      },
    );

    invisible.userData.objectId = uuidv4();
    invisible.userData.isMain = true;
    platformGroup.add(invisible);
  }

  function addAboveInvisibleBoxForPlatform(
    platformGroup: THREE.Group,
    topMesh: THREE.Mesh,
    wallMesh: THREE.Mesh,
    countertopThickness: number,
    dimensions: { width: number; depth: number },
    nameSuffix: string,
  ) {
    const wallParams = (wallMesh.geometry as THREE.BoxGeometry)
      .parameters as any;
    const wallHeight = Number(wallParams.height || 0);
    const topY = topMesh.position.y + countertopThickness / 2;
    const computedHeight = Math.max(wallHeight - topY, 0.02);
    const invHeight = computedHeight;
    const centerY =
      topMesh.position.y + countertopThickness / 2 + invHeight / 2;
    const invisible = createInvisibleBox(
      { width: dimensions.width, height: invHeight, depth: dimensions.depth },
      { x: topMesh.position.x, y: centerY, z: topMesh.position.z },
      `invisibleBox_platform_above_${nameSuffix}`,
      {
        objectId: `invisibleBox_platform_above_${nameSuffix}`,
        type: 'INVISIBLE_COMPARTMENT',
        dimensions: {
          width: dimensions.width,
          height: invHeight,
          depth: dimensions.depth,
        },
      },
    );

    invisible.userData.objectId = uuidv4();
    invisible.userData.isMain = true;
    platformGroup.add(invisible);
  }

  if (wallMesh?.name === 'Center Wall') {
    const wallCenterX = wallMesh.position.x;
    const halfLengthX = wallW / 2;
    let leftStartX = wallCenterX - halfLengthX;
    let rightEndX = wallCenterX + halfLengthX;

    const leftPlat = scene.getObjectByName('Counter_LeftWall') as
      | THREE.Mesh
      | undefined;
    if (leftPlat) {
      const leftProtrusion = (leftPlat.geometry as THREE.BoxGeometry).parameters
        .width as number;
      leftStartX = Math.max(
        leftStartX,
        leftPlat.position.x + leftProtrusion / 2,
      );
    }

    const rightPlat = scene.getObjectByName('Counter_RightWall') as
      | THREE.Mesh
      | undefined;
    if (rightPlat) {
      const rightProtrusion = (rightPlat.geometry as THREE.BoxGeometry)
        .parameters.width as number;
      rightEndX = Math.min(
        rightEndX,
        rightPlat.position.x - rightProtrusion / 2,
      );
    }

    const lengthX = Math.max(rightEndX - leftStartX, 0.1);
    const centerX = (leftStartX + rightEndX) / 2;

    const topPart = {
      name: 'Counter_CenterWall',
      dimensions: {
        width: lengthX,
        height: countertopThickness,
        depth: defaultProtrusion,
      },
      position: {
        x: centerX,
        y: platformHeight + countertopThickness / 2,
        z: wallMesh.position.z + wallD / 2 + defaultProtrusion / 2,
      },
      material: counterMaterial,
    };
    const topMesh = createMeshObject(topPart);

    platformGroup.add(topMesh);

    const { width, height, depth } = topPart.dimensions;
    addedMeshes.push({
      name: topPart.name,
      width,
      height,
      depth,
      position: topMesh.position as any,
      data: {
        rotation: topMesh.rotation as any,
        wall: wallMesh?.name || '',
      },
    });

    addStaticInvisibleBoxforPlatform(
      platformGroup,
      topMesh,
      floorY,
      countertopThickness,
      { width: lengthX, depth: defaultProtrusion },
      'center',
    );

    // Add above-counter invisible box
    addAboveInvisibleBoxForPlatform(
      platformGroup,
      topMesh,
      wallMesh as THREE.Mesh,
      countertopThickness,
      { width: lengthX, depth: defaultProtrusion },
      'center',
    );
  } else if (
    wallMesh?.name === 'Left Wall' ||
    wallMesh?.name === 'Right Wall'
  ) {
    const wallCenterZ = wallMesh.position.z;
    const halfRunZ = wallD / 2;
    const minZ = wallCenterZ - halfRunZ;
    const maxZ = wallCenterZ + halfRunZ;

    const backPlat = scene.getObjectByName('Counter_CenterWall') as
      | THREE.Mesh
      | undefined;
    let startZ = minZ;
    if (backPlat) {
      startZ =
        backPlat.position.z +
        ((backPlat.geometry as THREE.BoxGeometry).parameters.depth) /
        2;
    }
    const effectiveRun = Math.max(maxZ - startZ, 0.1);
    const centerZ = startZ + effectiveRun / 2;

    const dir = wallMesh.name === 'Left Wall' ? +1 : -1;

    const topPart = {
      name: `Counter_${wallMesh.name.replace(' ', '')}`,
      dimensions: {
        width: defaultProtrusion,
        height: countertopThickness,
        depth: effectiveRun,
      },
      position: {
        x: wallMesh.position.x + dir * (wallW / 2 + defaultProtrusion / 2),
        y: platformHeight + countertopThickness / 2,
        z: centerZ,
      },
      material: counterMaterial,
    };
    const topMesh = createMeshObject(topPart);

    platformGroup.add(topMesh);

    const { width, height, depth } = topPart.dimensions;
    addedMeshes.push({
      name: topPart.name,
      width,
      height,
      depth,
      position: topMesh.position as any,
      data: {
        rotation: topMesh.rotation as any,
        wall: wallMesh?.name || '',
      },
    });
    const wallTag = wallMesh.name === 'Left Wall' ? 'leftwall' : 'rightwall';
    addStaticInvisibleBoxforPlatform(
      platformGroup,
      topMesh,
      floorY,
      countertopThickness,
      { width: defaultProtrusion, depth: effectiveRun },
      wallTag,
    );

    // Add above-counter invisible box
    addAboveInvisibleBoxForPlatform(
      platformGroup,
      topMesh,
      wallMesh as THREE.Mesh,
      countertopThickness,
      { width: defaultProtrusion, depth: effectiveRun },
      wallTag,
    );
  } else {
    return [];
  }

  scene.add(platformGroup);
  store.dispatch(setobjectSelected(null));
  store.dispatch(setSelectedChildObject(null));
  store.dispatch(setHoverdMesh(null));
  removeExistingLines();
  return addedMeshes;
};

export const addVerticalPlanksToBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  itemData: any = null,
) => {
  if (!boxMesh || count <= 0) return;

  const bbox = new THREE.Box3().setFromObject(boxMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  let parent: THREE.Mesh;
  if (!(boxMesh.parent?.userData.isMain)) {
    parent = boxMesh;
  } else {
    parent = boxMesh.parent as THREE.Mesh;
  }

  const width = size.x;
  const height = size.y;
  const depth = size.z;
  const thickness = 0.018;
  const edgeClearance = Math.max(0.01, thickness);
  const skirtingHeight = 0.06;

  const isPlatform = boxMesh.name.includes('platform');
  const isSideWallBox =
    boxMesh.name.includes('platform_leftwall') ||
    boxMesh.name.includes('platform_rightwall');

  const divideAlongX = !isSideWallBox;
  const span = divideAlongX ? width : depth;
  const innerSpan = span - 2 * edgeClearance;
  if (innerSpan <= thickness) return;

  const interval = innerSpan / (count + 1);
  // Remove original invisible container mesh
  // if (boxMesh.parent) boxMesh.parent.remove(boxMesh);
  // else scene.remove(boxMesh);

  const plankMatProps = { color: 0xd9c7b8, roughness: 0.7 };
  const effectiveHeight = isPlatform ? height - skirtingHeight : height; const plankY = isPlatform ? center.y - height / 2 + skirtingHeight + effectiveHeight / 2 : center.y;

  for (let i = 1; i <= count; i++) {
    const plankPart = divideAlongX
      ? {
        name: `VERTICAL_PLANK_${i}`,
        dimensions: { width: thickness, height: effectiveHeight, depth },
        material: plankMatProps,
      }
      : {
        name: `VERTICAL_PLANK_${i}`,
        dimensions: { width, height: effectiveHeight, depth: thickness },
        material: plankMatProps,
      };

    const plank = createMeshObject(plankPart, true, {
      isVerticalPlank: true,
      isPlatform,
      isSideWall: isSideWallBox,
      cabinetItem: selectedCabinetItem,
      dimensions: plankPart.dimensions,
    });

    // Calculate local position like horizontal shelves
    const localPos = new THREE.Vector3(
      divideAlongX ? -width / 2 + edgeClearance + interval * i : 0,
      isPlatform
        ? -height / 2 + skirtingHeight + effectiveHeight / 2
        : 0,
      divideAlongX ? 0 : -depth / 2 + edgeClearance + interval * i
    );

    plank.position.copy(localPos);

    const data = {
      ...itemData,
      width: (plank.geometry as THREE.BoxGeometry).parameters.width,
      height: (plank.geometry as THREE.BoxGeometry).parameters.height,
      depth: (plank.geometry as THREE.BoxGeometry).parameters.depth,
      position: plank.position,
      additional_data: {
        isPlatform: isPlatform,
        isSideWallBox: isSideWallBox,
      }
    };

    const apiResponse = await addItemtoDatabase(data);
    plank.userData.objectId = apiResponse.id;
    plank.userData.type = 'Plank';
    plank.userData.apiData = apiResponse;
    parent.add(plank);

    if (plank.userData.objectId) {
      const objInStore = store
        .getState()
        .data.objects.find((o) => o.id === plank.userData.objectId);
      if (objInStore) {
        store.dispatch(
          updateObject({
            ...objInStore,
            apiData: apiResponse,
            width: plankPart.dimensions.width,
            height: plankPart.dimensions.height,
            depth: plankPart.dimensions.depth,
            position: plank.position,
          } as any),
        );
      }
    }
  }

  if (isPlatform) {
    const floorY = center.y - height / 2;
    const skirtingWorldPos = new THREE.Vector3(
      center.x,
      floorY + skirtingHeight / 2,
      center.z
    );
    const skirtingLocalPos = boxMesh.worldToLocal(skirtingWorldPos.clone());

    const skirtingPart = {
      name: `Skirting`,
      dimensions: { width, height: skirtingHeight, depth },
      position: skirtingLocalPos,
      material: { color: 0x555555, roughness: 0.8 },
    };

    const skirting = createMeshObject(skirtingPart);
    boxMesh.add(skirting);
  }

  generateCompartmentsFromMesh(parent);
};

export const addHorizontalPlanksInsideBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem = null,
  itemData: any = null,
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

  const thickness = 0.018;
  const innerHeight = height;
  const innerWidth = width;

  if (innerHeight <= thickness) return;

  const interval = innerHeight / (count + 1);
  let parent: THREE.Mesh;
  if (!(boxMesh.parent?.userData.isMain)) {
    parent = boxMesh;
  } else {
    parent = boxMesh.parent as THREE.Mesh;
  }
  const localCenter = parent.worldToLocal(center.clone());

  const plankMatProps = { color: 0xd9c7b8, roughness: 0.7 };

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
    divisionAxis: 'y',
    localCenter: { x: localCenter.x, y: localCenter.y, z: localCenter.z },
    span: height,
    perpDims: { x: width, z: depth },
    suffix: boxMesh.name,
  };

  for (let i = 1; i <= count; i++) {
    const yLocal = -innerHeight / 2 + interval * i;

    const shelfPart = {
      name: `HORIZONTAL_PLANK_${i}`,
      dimensions: { width: innerWidth, height: thickness, depth },
      material: plankMatProps,
    };

    const shelf = createMeshObject(shelfPart, true, {
      isHorizontalPlank: true,
      dimensions: shelfPart.dimensions,
      cabinetItem: selectedCabinetItem,
    });

    const worldPos = center.clone();
    worldPos.y += yLocal;
    shelf.position.copy(parent.worldToLocal(worldPos));

    const data = {
      ...itemData,
      width: (shelf.geometry as THREE.BoxGeometry).parameters.width,
      height: (shelf.geometry as THREE.BoxGeometry).parameters.height,
      depth: (shelf.geometry as THREE.BoxGeometry).parameters.depth,
      position: shelf.position,
    };

    const apiResponse = await addItemtoDatabase(data);
    shelf.userData.objectId = apiResponse.id;
    shelf.userData.type = apiResponse.type;
    shelf.userData.apiData = apiResponse;
    parent.add(shelf);

    // Sync with store
    if (shelf.userData.objectId) {
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
            position: { ...shelf.position },
          } as any),
        );
      }
    }
  }

  generateCompartmentsFromMesh(parent as THREE.Mesh);
};

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
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

  const doorMatProps = { map: doorTexture, side: THREE.DoubleSide };

  const facePart = isSide
    ? {
      name: `Door_for_${boxMesh.name}`,
      dimensions: { width: 0.02, height: h - 0.01, depth: d - 0.01 },
      position: { x: 0, y: 0, z: 0 },
      material: doorMatProps,
    }
    : {
      name: `Door_for_${boxMesh.name}`,
      dimensions: { width: w - 0.01, height: h - 0.01, depth: 0.02 },
      position: { x: 0, y: 0, z: 0 },
      material: doorMatProps,
    };

  const face = createMeshObject(facePart, true, { openDirection: 'right' });

  // Group door
  const doorGroup = new THREE.Group();
  doorGroup.name = `DoorGroup_for_${boxMesh.name}`;
  doorGroup.userData = {
    type: 'DOOR',
    upward: false,
    apiData: apiResponseDataArray[0],
    cabinetItem: selectedCabinetItem,
    dimensions: facePart.dimensions,
    objectId:
      apiResponseDataArray[0]?.id ??
      apiResponseDataArray[0]?.objectId ??
      apiResponseDataArray[0]?.data?.id ??
      undefined,
  };

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

  // Update store if needed
  if (doorGroup.userData.objectId) {
    const objInStore = store
      .getState()
      .data.objects.find((o) => o.id === doorGroup.userData.objectId);
    if (objInStore) {
      const rules = doorGroup.userData?.apiData?.rules;
      const dims = doorGroup.userData?.dimensions;
      store.dispatch(
        updateObject({
          ...objInStore,
          apiData: doorGroup.userData.apiData,
          rules,
          ...(dims && {
            width: dims.width,
            height: dims.height,
            depth: dims.depth,
          }),
          position: { ...doorGroup.position },
        } as any),
      );
    }
  }

  await ensureHandleLoaded();
  if (cachedHandleModel) {
    const handle = cachedHandleModel.clone(true);

    const doorBox = new THREE.Box3().setFromObject(face);
    const doorSize = new THREE.Vector3();
    doorBox.getSize(doorSize);
    const doorCenter = new THREE.Vector3();
    doorBox.getCenter(doorCenter);

    const marginX = 0.04;
    const offsetZ = doorSize.z / 2 + toAvoidOverlap;

    let worldHandlePos = new THREE.Vector3();

    if (isSide) {
      if (dir > 0) {
        worldHandlePos.set(
          doorCenter.x + doorSize.x / 2 - marginX,
          doorCenter.y,
          doorCenter.z + offsetZ,
        );
      } else {
        worldHandlePos.set(
          doorCenter.x - doorSize.x / 2 + marginX,
          doorCenter.y,
          doorCenter.z + offsetZ,
        );
      }
      handle.rotation.set(0, Math.PI / 2, Math.PI / 2);
    } else {
      worldHandlePos.set(
        doorCenter.x - doorSize.x / 2 + marginX,
        doorCenter.y,
        doorCenter.z + offsetZ,
      );
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
  const drawerType = 'fivePlank';
  const thickness = 0.018;

  await ensureHandleLoaded();

  const textureLoader = new THREE.TextureLoader();
  const drawerTexture = textureLoader.load('/Texture0004.jpg');
  drawerTexture.wrapS = drawerTexture.wrapT = THREE.RepeatWrapping;
  drawerTexture.repeat.set(2, 1);

  const drawerMatProps = { map: drawerTexture, side: THREE.DoubleSide };
  const sideMatProps = { color: 0xd9c7b8, roughness: 0.7 };
  const railMatProps = { color: 0x999999, metalness: 0.6, roughness: 0.3 };

  for (let i = 0; i < drawers; i++) {
    const yCenter = center.y - h / 2 + eachH * (i + 0.5);

    const drawerGroup = new THREE.Group();
    drawerGroup.name = `Drawer_${i}_for_${boxMesh.name}`;
    drawerGroup.userData = {
      type: 'DRAWER',
      apiData: apiResponseDataArray[i],
      cabinetItem: selectedCabinetItem,
      dimensions: isSide
        ? { width: 0.02, height: eachH - 0.005, depth: d - 0.01 }
        : { width: w - 0.01, height: eachH - 0.005, depth: 0.02 },
      objectId:
        apiResponseDataArray[i]?.id ??
        apiResponseDataArray[i]?.objectId ??
        apiResponseDataArray[i]?.data?.id ??
        undefined,
    };
    scene.add(drawerGroup);

    // Drawer face
    const facePart = isSide
      ? {
        name: `DrawerFace_${i}_for_${boxMesh.name}`,
        dimensions: { width: 0.02, height: eachH - 0.005, depth: d - 0.01 },
        position: {
          x: center.x + dir * (w / 2 + 0.01),
          y: yCenter,
          z: center.z,
        },
        material: drawerMatProps,
      }
      : {
        name: `DrawerFace_${i}_for_${boxMesh.name}`,
        dimensions: { width: w - 0.01, height: eachH - 0.005, depth: 0.02 },
        position: { x: center.x, y: yCenter, z: center.z + d / 2 + 0.01 },
        material: drawerMatProps,
      };
    const face = createMeshObject(facePart);
    scene.add(face);
    drawerGroup.attach(face);

    // Handle
    if (cachedHandleModel) {
      const handle = cachedHandleModel.clone(true);
      handle.traverse((n: any) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });

      if (isSide) {
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

    // Drawer body
    if (drawerType === 'fivePlank') {
      const innerW = Math.max(w - 2 * thickness - 0.02, 0.1);
      const innerD = Math.max(d - 0.06, 0.2);
      const innerH = Math.max(eachH - 0.06, 0.12);
      const baseY = yCenter;

      const leftSidePart = {
        name: `DrawerSide_L_${i}_for_${boxMesh.name}`,
        dimensions: { width: thickness, height: innerH, depth: innerD },
        position: { x: center.x - innerW / 2, y: baseY, z: center.z },
        material: sideMatProps,
      };
      const leftSide = createMeshObject(leftSidePart);
      scene.add(leftSide);
      drawerGroup.attach(leftSide);

      const rightSidePart = {
        name: `DrawerSide_R_${i}_for_${boxMesh.name}`,
        dimensions: { width: thickness, height: innerH, depth: innerD },
        position: { x: center.x + innerW / 2, y: baseY, z: center.z },
        material: sideMatProps,
      };
      const rightSide = createMeshObject(rightSidePart);
      scene.add(rightSide);
      drawerGroup.attach(rightSide);

      const backPart = {
        name: `DrawerBack_${i}_for_${boxMesh.name}`,
        dimensions: { width: innerW, height: innerH, depth: thickness },
        position: { x: center.x, y: baseY, z: center.z - innerD / 2 },
        material: sideMatProps,
      };
      const back = createMeshObject(backPart);
      scene.add(back);
      drawerGroup.attach(back);

      const frontInnerPart = {
        name: `DrawerFrontInner_${i}_for_${boxMesh.name}`,
        dimensions: { width: innerW, height: innerH, depth: thickness },
        position: {
          x: center.x,
          y: baseY,
          z: center.z + innerD / 2 - thickness,
        },
        material: sideMatProps,
      };
      const frontInner = createMeshObject(frontInnerPart);
      scene.add(frontInner);
      drawerGroup.attach(frontInner);

      const bottomPart = {
        name: `DrawerBottom_${i}_for_${boxMesh.name}`,
        dimensions: { width: innerW, height: thickness, depth: innerD },
        position: {
          x: center.x,
          y: baseY - innerH / 2 + thickness / 2,
          z: center.z,
        },
        material: sideMatProps,
      };
      const bottom = createMeshObject(bottomPart);
      scene.add(bottom);
      drawerGroup.attach(bottom);
    }
    // Drawer channels
    const railH = 0.02;
    const railT = 0.005;
    if (isSide) {
      const railLenX = Math.max(w - 0.06, 0.2);
      const nearZ = center.z - d / 2 + railT / 2 + 0.01;
      const farZ = center.z + d / 2 - railT / 2 - 0.01;

      const nearRailPart = {
        name: `DrawerRail_N_${i}_for_${boxMesh.name}`,
        dimensions: { width: railLenX, height: railH, depth: railT },
        position: { x: center.x, y: yCenter, z: nearZ },
        material: railMatProps,
      };
      const nearRail = createMeshObject(nearRailPart);
      scene.add(nearRail);
      drawerGroup.attach(nearRail);

      const farRailPart = {
        name: `DrawerRail_F_${i}_for_${boxMesh.name}`,
        dimensions: { width: railLenX, height: railH, depth: railT },
        position: { x: center.x, y: yCenter, z: farZ },
        material: railMatProps,
      };
      const farRail = createMeshObject(farRailPart);
      scene.add(farRail);
      drawerGroup.attach(farRail);
    } else {
      const railLen = Math.max(d - 0.06, 0.2);

      const leftRailPart = {
        name: `DrawerRail_L_${i}_for_${boxMesh.name}`,
        dimensions: { width: railT, height: railH, depth: railLen },
        position: {
          x: center.x - w / 2 + railT / 2 + 0.01,
          y: yCenter,
          z: center.z,
        },
        material: railMatProps,
      };
      const leftRail = createMeshObject(leftRailPart);
      scene.add(leftRail);
      drawerGroup.attach(leftRail);

      const rightRailPart = {
        name: `DrawerRail_R_${i}_for_${boxMesh.name}`,
        dimensions: { width: railT, height: railH, depth: railLen },
        position: {
          x: center.x + w / 2 - railT / 2 - 0.01,
          y: yCenter,
          z: center.z,
        },
        material: railMatProps,
      };
      const rightRail = createMeshObject(rightRailPart);
      scene.add(rightRail);
      drawerGroup.attach(rightRail);
    }

    // Update store if needed
    if (drawerGroup.userData.objectId) {
      const objInStore = store
        .getState()
        .data.objects.find((o) => o.id === drawerGroup.userData.objectId);
      if (objInStore) {
        const rules = drawerGroup.userData?.apiData?.rules;
        const dims = drawerGroup.userData?.dimensions;
        store.dispatch(
          updateObject({
            ...objInStore,
            apiData: drawerGroup.userData.apiData,
            rules,
            ...(dims && {
              width: dims.width,
              height: dims.height,
              depth: dims.depth,
            }),
            position: { ...drawerGroup.position },
          } as any),
        );
      }
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

  const upperHeight = 0.7;
  const upperDepth = 0.35;
  const upperBottomY = platformTopY + 0.55;

  const isSidePlatform =
    platformMesh.name.includes('LeftWall') ||
    platformMesh.name.includes('RightWall');
  const isLeftWall = platformMesh.name.includes('LeftWall');
  const isRightWall = platformMesh.name.includes('RightWall');

  let targetWall: THREE.Mesh | null = null;
  if (isSidePlatform) {
    targetWall = scene.getObjectByName(
      isLeftWall ? 'Left Wall' : 'Right Wall',
    ) as THREE.Mesh | null;
  } else {
    targetWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  }

  if (!targetWall) return;

  let cabinetWidth = isSidePlatform ? platformD : platformW;
  let cabinetSpacing = cabinetWidth / count;

  await ensureHandleLoaded();

  const upperGroup = new THREE.Group();
  upperGroup.name = `UpperCabinets_${platformMesh.name}`;
  scene.add(upperGroup);

  const carcassMatProps = { color: 0xd9c7b8, roughness: 0.7 };
  const thickness = 0.018;
  const epsilon = 0.001;

  const textureLoader = new THREE.TextureLoader();
  const wallTexture = textureLoader.load('/Texture0004.jpg');
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(2, 1);

  const doorMatProps = { map: wallTexture, side: THREE.DoubleSide };

  for (let i = 0; i < count; i++) {
    const cabinetGroup = new THREE.Group();
    cabinetGroup.name = `UpperCabinet_${i}_for_${platformMesh.name}`;
    cabinetGroup.userData = { type: 'UPPER_CABINET' };

    let cabinetX: number, cabinetZ: number;

    if (isSidePlatform) {
      if (isLeftWall) {
        cabinetX =
          targetWall.position.x +
          (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 +
          upperDepth / 2;
        cabinetZ =
          platformMesh.position.z + (i - (count - 1) / 2) * cabinetSpacing;
      } else if (isRightWall) {
        cabinetX =
          targetWall.position.x -
          (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 -
          upperDepth / 2;
        cabinetZ =
          platformMesh.position.z + (i - (count - 1) / 2) * cabinetSpacing;
      } else {
        cabinetX = platformMesh.position.x;
        cabinetZ = platformMesh.position.z;
      }
    } else {
      cabinetX =
        platformMesh.position.x - platformW / 2 + cabinetSpacing * (i + 0.5);
      cabinetZ =
        targetWall.position.z +
        (targetWall.geometry as THREE.BoxGeometry).parameters.depth / 2 +
        upperDepth / 2;
    }

    const actualCabinetWidth = cabinetSpacing - 0.02;

    let leftPlankPart,
      rightPlankPart,
      bottomPlankPart,
      topPlankPart,
      backPlankPart;

    if (isSidePlatform) {
      leftPlankPart = {
        name: `UpperLeftPlank_${i}`,
        dimensions: {
          width: thickness,
          height: upperHeight,
          depth: upperDepth,
        },
        position: {
          x: cabinetX,
          y: upperBottomY + upperHeight / 2,
          z: cabinetZ - actualCabinetWidth / 2 + thickness / 2,
        },
        material: carcassMatProps,
        rotation: { x: 0, y: 90, z: 0 },
      };
      rightPlankPart = {
        name: `UpperRightPlank_${i}`,
        dimensions: {
          width: thickness,
          height: upperHeight,
          depth: upperDepth,
        },
        position: {
          x: cabinetX,
          y: upperBottomY + upperHeight / 2,
          z: cabinetZ + actualCabinetWidth / 2 - thickness / 2,
        },
        material: carcassMatProps,
        rotation: { x: 0, y: 90, z: 0 },
      };
      bottomPlankPart = {
        name: `UpperBottomPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: thickness,
          depth: upperDepth,
        },
        position: { x: cabinetX, y: upperBottomY + thickness / 2, z: cabinetZ },
        material: carcassMatProps,
        rotation: { x: 0, y: 90, z: 0 },
      };
      topPlankPart = {
        name: `UpperTopPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: thickness,
          depth: upperDepth,
        },
        position: {
          x: cabinetX,
          y: upperBottomY + upperHeight - thickness / 2,
          z: cabinetZ,
        },
        material: carcassMatProps,
        rotation: { x: 0, y: 90, z: 0 },
      };
      backPlankPart = {
        name: `UpperBackPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: upperHeight - thickness * 2,
          depth: thickness,
        },
        position: {
          x: isLeftWall
            ? targetWall.position.x +
            (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 +
            thickness / 2
            : targetWall.position.x -
            (targetWall.geometry as THREE.BoxGeometry).parameters.width / 2 -
            thickness / 2,
          y: upperBottomY + upperHeight / 2,
          z: cabinetZ,
        },
        material: carcassMatProps,
        rotation: { x: 0, y: 90, z: 0 },
      };
    } else {
      leftPlankPart = {
        name: `UpperLeftPlank_${i}`,
        dimensions: {
          width: thickness,
          height: upperHeight,
          depth: upperDepth,
        },
        position: {
          x: cabinetX - actualCabinetWidth / 2 + thickness / 2,
          y: upperBottomY + upperHeight / 2,
          z: cabinetZ,
        },
        material: carcassMatProps,
      };
      rightPlankPart = {
        name: `UpperRightPlank_${i}`,
        dimensions: {
          width: thickness,
          height: upperHeight,
          depth: upperDepth,
        },
        position: {
          x: cabinetX + actualCabinetWidth / 2 - thickness / 2,
          y: upperBottomY + upperHeight / 2,
          z: cabinetZ,
        },
        material: carcassMatProps,
      };
      bottomPlankPart = {
        name: `UpperBottomPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: thickness,
          depth: upperDepth,
        },
        position: { x: cabinetX, y: upperBottomY + thickness / 2, z: cabinetZ },
        material: carcassMatProps,
      };
      topPlankPart = {
        name: `UpperTopPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: thickness,
          depth: upperDepth,
        },
        position: {
          x: cabinetX,
          y: upperBottomY + upperHeight - thickness / 2,
          z: cabinetZ,
        },
        material: carcassMatProps,
      };
      backPlankPart = {
        name: `UpperBackPlank_${i}`,
        dimensions: {
          width: actualCabinetWidth - thickness * 2,
          height: upperHeight - thickness * 2,
          depth: thickness,
        },
        position: {
          x: cabinetX,
          y: upperBottomY + upperHeight / 2,
          z:
            targetWall.position.z +
            (targetWall.geometry as THREE.BoxGeometry).parameters.depth / 2 +
            thickness / 2,
        },
        material: carcassMatProps,
      };
    }

    const leftPlank = createMeshObject(leftPlankPart);
    const rightPlank = createMeshObject(rightPlankPart);
    const bottomPlank = createMeshObject(bottomPlankPart);
    const topPlank = createMeshObject(topPlankPart);
    const backPlank = createMeshObject(backPlankPart);

    cabinetGroup.add(leftPlank, rightPlank, bottomPlank, topPlank, backPlank);

    // Invisible box inside
    const innerW = actualCabinetWidth - 2 * thickness;
    const innerH = upperHeight - 2 * thickness;
    const innerD = upperDepth - 2 * thickness;
    const invDimensions = isSidePlatform
      ? { width: innerD, height: innerH, depth: innerW }
      : { width: innerW, height: innerH, depth: innerD };
    const inv = createInvisibleBox(
      invDimensions,
      { x: cabinetX, y: upperBottomY + upperHeight / 2, z: cabinetZ },
      `invisibleBox_uppercabinet_${i}`,
      { type: 'INVISIBLE_COMPARTMENT', dimensions: invDimensions },
    );
    cabinetGroup.add(inv);

    // Doors
    const doorHeight = upperHeight - thickness * 2 - epsilon;
    const doorThickness = 0.02;

    let cabinetFrontX: number,
      cabinetFrontZ: number,
      normalAxis: 'x' | 'z',
      normalSign: 1 | -1;

    if (isSidePlatform) {
      normalAxis = 'x';
      cabinetFrontX = isLeftWall
        ? cabinetX + upperDepth / 2
        : cabinetX - upperDepth / 2;
      normalSign = isLeftWall ? 1 : -1;
      cabinetFrontZ = cabinetZ;
    } else {
      normalAxis = 'z';
      cabinetFrontZ = cabinetZ + upperDepth / 2;
      normalSign = 1;
      cabinetFrontX = cabinetX;
    }

    if (doorType === 'double') {
      const doorWidth = (actualCabinetWidth - thickness * 2 - epsilon) / 2;

      const leftDoorPart = isSidePlatform
        ? {
          name: `UpperLeftDoor_${i}`,
          dimensions: {
            width: doorHeight,
            height: doorWidth,
            depth: doorThickness,
          },
          position: {
            x: cabinetFrontX + (doorThickness / 2) * normalSign,
            y: upperBottomY + upperHeight / 2,
            z: cabinetZ - doorWidth / 2,
          },
          material: doorMatProps,
          rotation: { x: 0, y: 90, z: 0 },
        }
        : {
          name: `UpperLeftDoor_${i}`,
          dimensions: {
            width: doorWidth,
            height: doorHeight,
            depth: doorThickness,
          },
          position: {
            x: cabinetX - doorWidth / 2,
            y: upperBottomY + upperHeight / 2,
            z: cabinetFrontZ + (doorThickness / 2) * normalSign,
          },
          material: doorMatProps,
        };
      const leftDoor = createMeshObject(leftDoorPart, true, {
        openDirection: 'left',
      });

      const rightDoorPart = isSidePlatform
        ? {
          name: `UpperRightDoor_${i}`,
          dimensions: {
            width: doorHeight,
            height: doorWidth,
            depth: doorThickness,
          },
          position: {
            x: cabinetFrontX + (doorThickness / 2) * normalSign,
            y: upperBottomY + upperHeight / 2,
            z: cabinetZ + doorWidth / 2,
          },
          material: doorMatProps,
          rotation: { x: 0, y: 90, z: 0 },
        }
        : {
          name: `UpperRightDoor_${i}`,
          dimensions: {
            width: doorWidth,
            height: doorHeight,
            depth: doorThickness,
          },
          position: {
            x: cabinetX + doorWidth / 2,
            y: upperBottomY + upperHeight / 2,
            z: cabinetFrontZ + (doorThickness / 2) * normalSign,
          },
          material: doorMatProps,
        };
      const rightDoor = createMeshObject(rightDoorPart, true, {
        openDirection: 'right',
      });

      cabinetGroup.add(leftDoor, rightDoor);

      // Handles for double doors
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

        const handleY = upperBottomY + thickness + 0.1;
        const epsilonOffset = 0.0001;

        if (isSidePlatform) {
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
      const doorWidth = actualCabinetWidth - thickness * 2 - epsilon;

      const doorPart = isSidePlatform
        ? {
          name: `UpperDoor_${i}`,
          dimensions: {
            width: doorHeight,
            height: doorWidth,
            depth: doorThickness,
          },
          position: {
            x: cabinetFrontX + (doorThickness / 2) * normalSign,
            y: upperBottomY + upperHeight / 2,
            z: cabinetZ,
          },
          material: doorMatProps,
          rotation: { x: 0, y: 90, z: 0 },
        }
        : {
          name: `UpperDoor_${i}`,
          dimensions: {
            width: doorWidth,
            height: doorHeight,
            depth: doorThickness,
          },
          position: {
            x: cabinetX,
            y: upperBottomY + upperHeight / 2,
            z: cabinetFrontZ + (doorThickness / 2) * normalSign,
          },
          material: doorMatProps,
        };
      const door = createMeshObject(doorPart, true, { openDirection: 'top' });

      cabinetGroup.add(door);

      // Handle for single door
      if (cachedHandleModel) {
        const handle = cachedHandleModel.clone(true);
        handle.traverse((n: any) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });

        const handleY = upperBottomY + thickness + 0.1;
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

export const ensureHandleLoaded = async () => {
  if (cachedHandleModel) return;
  const loader = new GLTFLoader();
  await new Promise<void>((resolve) => {
    loader.load(
      '/door_handle.glb',
      (glb) => {
        const model = glb.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetLen = 0.12;
        const sizeRatio = targetLen / (Math.max(size.x, size.y, size.z) || 1);
        model.scale.setScalar(sizeRatio);
        const box2 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        model.position.sub(center);
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
  sprite.scale.set(0.24, 0.06, 1);

  return sprite;
}

function addTick(
  group: THREE.Group,
  point: THREE.Vector3,
  direction: THREE.Vector3,
  size = 0.02,
) {
  const point1 = point.clone().addScaledVector(direction, size / 2);
  const point2 = point.clone().addScaledVector(direction, -size / 2);
  const geo = new THREE.BufferGeometry().setFromPoints([point1, point2]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x222222,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
}

function getAABB(obj: THREE.Object3D): THREE.Box3 {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  box.setFromObject(obj);
  return box;
}

function getBoxCenter(box: THREE.Box3): THREE.Vector3 {
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

function getBoxSize(box: THREE.Box3): THREE.Vector3 {
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}
function isWallObject(obj: THREE.Object3D): boolean {
  const name = (obj.name || '').toLowerCase();
  return name.includes('wall') || name.includes('cwall');
}
function isPlankObject(obj: THREE.Object3D): boolean {
  const name = (obj.name || '').toLowerCase();
  return (
    name.includes('plank') ||
    name.includes('vertical_plank') ||
    name.includes('horizontal_plank')
  );
}
function isSideWallPlank(mesh: THREE.Mesh, box: THREE.Box3): boolean {
  const center = getBoxCenter(box);
  const name = mesh.name.toLowerCase();
  return (
    name.includes('platform_leftwall') ||
    name.includes('platform_rightwall') ||
    mesh.userData?.isSideWall === true ||
    Math.abs(center.x) > 0.5
  );
}

// Geometry analyz
function analyzePlankGeometry(mesh: THREE.Mesh, box: THREE.Box3) {
  const params = (mesh.geometry as any).parameters || {};
  const size = getBoxSize(box);

  const width = params.width ?? size.x;
  const height = params.height ?? size.y;
  const depth = params.depth ?? size.z;

  const isHorizontal = height < width && height < depth;
  const isThinX = width <= depth && !isHorizontal;
  const isThinZ = depth < width && !isHorizontal;

  return { width, height, depth, isHorizontal, isThinX, isThinZ };
}

// Dimension line creation
function createDimensionLine(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  viewOffsetDir: THREE.Vector3,
  label: string,
  meta?: {
    axis: 'x' | 'y' | 'z';
    side: 'min' | 'max';
    ref: number;
    targetUuid: string;
  },
) {
  const offset = 0.03;
  const startOffset = start.clone().addScaledVector(viewOffsetDir, offset);
  const endOffset = end.clone().addScaledVector(viewOffsetDir, offset);

  // Main dimension line
  const geo = new THREE.BufferGeometry().setFromPoints([
    startOffset,
    endOffset,
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x111111,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);

  // Extension ticks
  const axis = endOffset.clone().sub(startOffset).normalize();
  let tickDir = new THREE.Vector3().crossVectors(
    axis,
    new THREE.Vector3(0, 1, 0),
  );
  if (tickDir.lengthSq() < 1e-6) tickDir.set(1, 0, 0);
  tickDir.normalize();

  addTick(group, startOffset, tickDir);
  addTick(group, endOffset, tickDir);

  // Label
  const mid = startOffset.clone().lerp(endOffset, 0.5);
  const sprite = createTextSprite(label);
  sprite.name =
    DIM_LABEL_PREFIX + (meta?.side || '') + '_' + (meta?.axis || '');
  if (meta) sprite.userData.dimMeta = meta;
  sprite.position.copy(mid);
  group.add(sprite);

  return sprite;
}

// Overlap checking
function overlapsOnAxes(
  a: THREE.Box3,
  b: THREE.Box3,
  axes: Array<'x' | 'y' | 'z'>,
): boolean {
  for (const axis of axes) {
    if (axis === 'x' && (a.max.x <= b.min.x + EPS || a.min.x >= b.max.x - EPS))
      return false;
    if (axis === 'y' && (a.max.y <= b.min.y + EPS || a.min.y >= b.max.y - EPS))
      return false;
    if (axis === 'z' && (a.max.z <= b.min.z + EPS || a.min.z >= b.max.z - EPS))
      return false;
  }
  return true;
}

function findNearestReferences(
  scene: THREE.Scene,
  self: THREE.Object3D,
  selfBox: THREE.Box3,
  axis: 'x' | 'y' | 'z',
  overlapAxes: Array<'x' | 'y' | 'z'>,
) {
  scene.updateMatrixWorld(true);

  let minPlankPos: number | null = null;
  let maxPlankPos: number | null = null;
  let minBox: THREE.Box3 | null = null;
  let maxBox: THREE.Box3 | null = null;
  let minWallPos: number | null = null;
  let maxWallPos: number | null = null;
  let minSkirtingPos: number | null = null;
  let maxSkirtingPos: number | null = null;

  const selfMin = selfBox.min[axis];
  const selfMax = selfBox.max[axis];

  scene.traverse((obj) => {
    if (obj === self || !(obj instanceof THREE.Mesh)) return;

    const box = getAABB(obj);
    const isWall = isWallObject(obj);
    const isPlank = isPlankObject(obj);
    const isSkirting = (obj.name || '').toLowerCase().includes('skirting');

    if (!overlapsOnAxes(selfBox, box, overlapAxes)) return;

    // Check negative direction
    if (box.max[axis] <= selfMin - EPS) {
      if (isPlank) {
        if (minPlankPos === null || box.max[axis] > minPlankPos) {
          minPlankPos = box.max[axis];
          minBox = box;
        }
      } else if (isSkirting) {
        if (minSkirtingPos === null || box.max[axis] > minSkirtingPos) {
          minSkirtingPos = box.max[axis];
        }
      } else if (isWall) {
        if (minWallPos === null || box.max[axis] > minWallPos) {
          minWallPos = box.max[axis];
        }
      }
    }

    // Check positive direction
    if (box.min[axis] >= selfMax + EPS) {
      if (isPlank) {
        if (maxPlankPos === null || box.min[axis] < maxPlankPos) {
          maxPlankPos = box.min[axis];
          maxBox = box;
        }
      } else if (isSkirting) {
        if (maxSkirtingPos === null || box.min[axis] < maxSkirtingPos) {
          maxSkirtingPos = box.min[axis];
        }
      } else if (isWall) {
        if (maxWallPos === null || box.min[axis] < maxWallPos) {
          maxWallPos = box.min[axis];
        }
      }
    }
  });

  return {
    minPos: minPlankPos ?? minSkirtingPos ?? minWallPos,
    maxPos: maxPlankPos ?? maxSkirtingPos ?? maxWallPos,
    minBox: minPlankPos !== null ? minBox : null,
    maxBox: maxPlankPos !== null ? maxBox : null,
  };
}
function createDimensionForAxis({
  group,
  mesh,
  box,
  scene,
  mainAxis,
  secondaryAxes,
  offsetDirFn,
}: {
  group: any;
  mesh: any;
  box: any;
  scene: any;
  mainAxis: any;
  secondaryAxes: any;
  offsetDirFn: any;
}): void {
  const { minPos, maxPos } = findNearestReferences(
    scene,
    mesh,
    box,
    mainAxis,
    secondaryAxes,
  );

  const offsetDir = offsetDirFn(mesh, box);

  const getAxisCoord = (axis: 'x' | 'y' | 'z') =>
    axis === mainAxis ? null : (box.min[axis] + box.max[axis]) / 2;

  const fixedX = getAxisCoord('x');
  const fixedY = getAxisCoord('y');
  const fixedZ = getAxisCoord('z');

  // min side
  if (minPos !== null) {
    const dist = mm(box.min[mainAxis] - minPos);
    const point1 = new THREE.Vector3(
      fixedX ?? minPos,
      fixedY ?? minPos,
      fixedZ ?? minPos,
    );
    const point2 = new THREE.Vector3(
      fixedX ?? box.min[mainAxis],
      fixedY ?? box.min[mainAxis],
      fixedZ ?? box.min[mainAxis],
    );
    createDimensionLine(
      group,
      point1,
      point2,
      offsetDir,
      `${dist.toFixed(1)} mm`,
      { axis: mainAxis, side: 'min', ref: minPos, targetUuid: mesh.uuid },
    );
  }

  // max side
  if (maxPos !== null) {
    const dist = mm(maxPos - box.max[mainAxis]);
    const point1 = new THREE.Vector3(
      fixedX ?? box.max[mainAxis],
      fixedY ?? box.max[mainAxis],
      fixedZ ?? box.max[mainAxis],
    );
    const point2 = new THREE.Vector3(
      fixedX ?? maxPos,
      fixedY ?? maxPos,
      fixedZ ?? maxPos,
    );
    createDimensionLine(
      group,
      point1,
      point2,
      offsetDir,
      `${dist.toFixed(1)} mm`,
      { axis: mainAxis, side: 'max', ref: maxPos, targetUuid: mesh.uuid },
    );
  }
}
function createHorizontalDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene,
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'y',
    secondaryAxes: ['x', 'z'],
    offsetDirFn: () => new THREE.Vector3(1, 0, 0),
  });
}
function createVerticalXDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene,
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'x',
    secondaryAxes: ['y', 'z'],
    offsetDirFn: () => new THREE.Vector3(0, 1, 0),
  });
}
function createVerticalZDimensions(
  group: THREE.Group,
  mesh: THREE.Mesh,
  box: THREE.Box3,
  scene: THREE.Scene,
) {
  createDimensionForAxis({
    group,
    mesh,
    box,
    scene,
    mainAxis: 'z',
    secondaryAxes: ['x', 'y'],
    offsetDirFn: (mesh: THREE.Mesh, box: THREE.Box3) => {
      const isSideWall = isSideWallPlank(mesh, box);
      return isSideWall
        ? new THREE.Vector3(mesh.position.x < 0 ? -1 : 1, 0, 0)
        : new THREE.Vector3(0, 0, 1);
    },
  });
}
// Cleanup functions
function disposeObjectResources(obj: THREE.Object3D) {
  obj.traverse((node: any) => {
    if (node.geometry) node.geometry.dispose?.();
    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach((mat: any) => mat.dispose?.());
      } else {
        node.material.dispose?.();
      }
    }
    if (node.material?.map) node.material.map.dispose?.();
  });
}

export function clearPlankDimensions(scene: THREE.Scene, mesh: THREE.Object3D) {
  const name = DIMENSION_GROUP_PREFIX + mesh.uuid;
  const existing = scene.getObjectByName(name) as THREE.Group | null;
  if (existing) {
    scene.remove(existing);
    disposeObjectResources(existing);
  }
}

export function clearAllPlankDimensions(scene: THREE.Scene) {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name && obj.name.startsWith(DIMENSION_GROUP_PREFIX)) {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((group) => {
    scene.remove(group);
    disposeObjectResources(group);
  });
}

// Main dimension display function
export function showPlankDimensions(scene: THREE.Scene, mesh: THREE.Mesh) {
  clearPlankDimensions(scene, mesh);

  const group = new THREE.Group();
  group.name = DIMENSION_GROUP_PREFIX + mesh.uuid;

  const box = getAABB(mesh);
  const geometryInfo = analyzePlankGeometry(mesh, box);

  if (geometryInfo.isHorizontal) {
    createHorizontalDimensions(group, mesh, box, scene);
  } else if (geometryInfo.isThinX) {
    createVerticalXDimensions(group, mesh, box, scene);
  } else if (geometryInfo.isThinZ) {
    createVerticalZDimensions(group, mesh, box, scene);
  }

  if (group.children.length > 0) {
    scene.add(group);
  }
}
function calculateDistance(box: THREE.Box3, meta: any): number {
  const { axis, side, ref } = meta;

  if (axis === 'x') {
    return side === 'min' ? box.min.x - ref : ref - box.max.x;
  } else if (axis === 'y') {
    return side === 'min' ? box.min.y - ref : ref - box.max.y;
  } else {
    return side === 'min' ? box.min.z - ref : ref - box.max.z;
  }
}

function getCurrentFacePosition(box: THREE.Box3, meta: any): number {
  const { axis, side } = meta;

  if (axis === 'x') return side === 'min' ? box.min.x : box.max.x;
  if (axis === 'y') return side === 'min' ? box.min.y : box.max.y;
  return side === 'min' ? box.min.z : box.max.z;
}

function applyPositionDelta(
  target: THREE.Object3D,
  axis: string,
  delta: number,
) {
  if (axis === 'x') target.position.x += delta;
  else if (axis === 'y') target.position.y += delta;
  else target.position.z += delta;
}

export function updateCompartmentBoxes(parent: THREE.Object3D) {
  const config = parent.userData.compartmentConfig;
  if (!config) return;

  // Remove old invisible boxes
  const children = [...parent.children];
  for (const child of children) {
    if (child.name.startsWith('invisibleBox_compartment_')) {
      parent.remove(child);
      disposeObjectResources(child);
    }
  }

  const isHorizontal = config.divisionAxis === 'y';
  const planks = children.filter(
    (child) =>
      (isHorizontal
        ? child.userData.isHorizontalPlank
        : child.userData.isVerticalPlank) && child instanceof THREE.Mesh,
  );

  if (planks.length === 0) return;

  const plankCenters = planks
    .map((p) => p.position[config.divisionAxis as 'x' | 'y' | 'z'])
    .sort((a, b) => a - b);

  const boundsMin = config.localCenter[config.divisionAxis] - config.span / 2;
  const boundsMax = config.localCenter[config.divisionAxis] + config.span / 2;
  const innerMin = boundsMin + config.edgeClearance;
  const innerMax = boundsMax - config.edgeClearance;

  // repair compartment box
  const halfThick = config.thickness / 2;
  const starts = [innerMin + halfThick];
  for (const center of plankCenters) {
    starts.push(center + halfThick);
  }
  const ends = [];
  for (const center of plankCenters) {
    ends.push(center - halfThick);
  }
  ends.push(innerMax - halfThick);

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends[i];
    const compSize = Math.max(end - start, 0.02);
    const compCenterLocal = (start + end) / 2;

    // Position
    const localPos = new THREE.Vector3();
    localPos.x =
      config.divisionAxis === 'x' ? compCenterLocal : config.localCenter.x;
    localPos.y =
      config.divisionAxis === 'y' ? compCenterLocal : config.localCenter.y;
    localPos.z =
      config.divisionAxis === 'z' ? compCenterLocal : config.localCenter.z;

    const dims = {
      width: config.perpDims.x || compSize,
      height: config.perpDims.y || compSize,
      depth: config.perpDims.z || compSize,
    };
    if (config.divisionAxis === 'x') dims.width = compSize;
    if (config.divisionAxis === 'y') dims.height = compSize;
    if (config.divisionAxis === 'z') dims.depth = compSize;

    const invisiblebox = createInvisibleBox(
      dims,
      { x: localPos.x, y: localPos.y, z: localPos.z },
      `invisibleBox_compartment_${i}_for_${config.suffix}`,
      { type: 'INVISIBLE_COMPARTMENT', dimensions: dims },
    );
    parent.add(invisiblebox);
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

    const sprites: THREE.Object3D[] = [];
    view.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Sprite &&
        obj.name.startsWith(DIM_LABEL_PREFIX)
      ) {
        sprites.push(obj);
      }
    });

    const hits = ray.intersectObjects(sprites, true);
    if (!hits.length) return;

    const sprite = hits[0].object as THREE.Sprite & { userData: any };
    const meta = sprite.userData?.dimMeta;
    if (!meta) return;

    const target = view.scene.getObjectByProperty(
      'uuid',
      meta.targetUuid,
    ) as THREE.Mesh | null;
    if (!target) return;

    const box = getAABB(target);
    const currentDistanceM = calculateDistance(box, meta);
    const currentMm = Math.max(0, currentDistanceM * 1000);

    const input = prompt('Enter new distance (mm):', currentMm.toFixed(1));
    if (!input) return;

    const newMm = parseFloat(input);
    if (!Number.isFinite(newMm) || newMm < 0) return;

    const newM = newMm / 1000;
    const desiredFace = meta.ref + (meta.side === 'min' ? newM : -newM);
    const currentFace = getCurrentFacePosition(box, meta);
    const delta = desiredFace - currentFace;

    applyPositionDelta(target, meta.axis, delta);
    showPlankDimensions(view.scene, target);
    if (target.parent && target.parent.userData.compartmentConfig) {
      updateCompartmentBoxes(target.parent);
    }
    view.renderer.render(view.scene, view.camera);
  };

  view.renderer.domElement.addEventListener('dblclick', onClick);
}
