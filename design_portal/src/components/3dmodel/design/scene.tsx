import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { initializeMoveHandler } from '../handler/items';
import { createGrid } from './grid-creator';
import { ThreeDView } from './interface';

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.physicallyCorrectLights = true;
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
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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
  const wallTexture = textureLoader.load('/img1_0.jpg');
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(2, 1);

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
  addLShapeKitchenPlatform(scene, counterTexture);

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
  centerPanel.position.set(0, wallHeight / 2 - 0.61, 0);

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
    wallHeight / 2 - 0.61,
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
    wallHeight / 2 - 0.61,
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
  floorPanel.position.set(0, -0.59, wallLength / 2 - wallThickness / 2);

  // ---------- Group ----------
  const cWallGroup = new THREE.Group();
  cWallGroup.name = 'cWallWithFloor';
  cWallGroup.add(centerPanel, leftPanel, rightPanel, floorPanel);
  scene.add(cWallGroup);
};

const addLShapeKitchenPlatform = (
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
    -lengthBack / 2 + depth / 1.7,
    platformHeight + countertopThickness / 2,
    lengthLeft / 2 + depth,
  );

  // ---- Group and add to scene ----
  const lKitchenGroup = new THREE.Group();
  lKitchenGroup.name = 'LShapeKitchenPlatform';
  lKitchenGroup.add(backCounter, leftCounter);
  scene.add(lKitchenGroup);
};
