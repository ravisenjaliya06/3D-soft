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

let cachedHandleModel: THREE.Object3D | null = null;

// ===== Dimension helpers (exported) =====
const DIMENSION_GROUP_PREFIX = 'plank_dimension_group_';
const DIM_LABEL_PREFIX = 'plank_dim_label_';

const mm = (meters: number) => Math.max(0, meters) * 1000; // meters → millimeters

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
  // addLShapeKitchenPlatform(scene, counterTexture);

  // const addBaseCabinetsUnderPlatform = () => {
  //   const platformGroup = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
  //   if (!platformGroup) return;

  //   // Remove existing cabinets if re-run
  //   const existing = scene.getObjectByName('BaseCabinets');
  //   if (existing) {
  //     scene.remove(existing);
  //   }

  //   const cabinetsGroup = new THREE.Group();
  //   cabinetsGroup.name = 'BaseCabinets';

  //   const backCounter = platformGroup.children.find((c) => c.name === 'Back Counter') as THREE.Mesh | undefined;
  //   const leftCounter = platformGroup.children.find((c) => c.name === 'Left Counter') as THREE.Mesh | undefined;
  //   const backWall = scene.getObjectByName('Center Wall') as THREE.Mesh | undefined;
  //   const leftWall = scene.getObjectByName('Left Wall') as THREE.Mesh | undefined;

  //   // Determine floor Y position from the floor panel
  //   let floorY = 0;
  //   const cWallGroup = scene.getObjectByName('cWallWithFloor') as THREE.Group | null;
  //   if (cWallGroup) {
  //     const floorObj = cWallGroup.children.find(
  //       (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
  //     ) as THREE.Mesh | undefined;
  //     if (floorObj) floorY = floorObj.position.y;
  //   }

  //   const makeCabinet = (w: number, h: number, d: number, name: string) => {
  //     const mat = new THREE.MeshStandardMaterial({ color: 0xc7b199, roughness: 0.6 });
  //     const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  //     box.castShadow = true;
  //     box.receiveShadow = true;
  //     box.name = name;
  //     return box;
  //   };

  //   const makePlinth = (w: number, h: number, d: number, name: string) => {
  //     const mat = new THREE.MeshStandardMaterial({ color: 0x4f4f4f, roughness: 0.7 });
  //     const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  //     box.castShadow = false;
  //     box.receiveShadow = true;
  //     box.name = name;
  //     return box;
  //   };

  //   // Common parameters from counters
  //   if (backCounter) {
  //     const p = (backCounter.geometry as THREE.BoxGeometry).parameters as any;
  //     const counterThickness = p.height as number; // Y of back counter
  //     const counterDepth = p.depth as number; // Z of back counter
  //     const counterLength = p.width as number; // X of back counter
  //     const cabinetTopY = backCounter.position.y - counterThickness / 2; // underside of top
  //     const toeKick = 0.1; // 100mm plinth sitting on floor
  //     const carcassHeight = Math.max(cabinetTopY - floorY - toeKick, 0.5);
  //     const clearanceBack = 0.02;
  //     const clearanceFront = 0.02;
  //     const cabinetDepth = Math.max(counterDepth - (clearanceBack + clearanceFront), 0.4);

  //     // Inner face of back wall (positive Z face)
  //     let innerFaceZ = 0;
  //     if (backWall) {
  //       const wp = (backWall.geometry as THREE.BoxGeometry).parameters as any;
  //       const wallHalfT = (wp.depth as number) / 2;
  //       innerFaceZ = backWall.position.z + wallHalfT; // facing into the room
  //     }

  //     const module = 0.6; // 600mm modules
  //     const modulesCount = Math.max(1, Math.floor(counterLength / module));
  //     const actualModule = counterLength / modulesCount; // even spacing

  //     for (let i = 0; i < modulesCount; i++) {
  //       const cab = makeCabinet(actualModule - 0.02, carcassHeight, cabinetDepth, `BaseCabinet_Back_${i}`);
  //       const centerX = -counterLength / 2 + actualModule * (i + 0.5);
  //       const centerZ = (innerFaceZ || 0) + clearanceBack + cabinetDepth / 2;
  //       cab.position.set(centerX, floorY + toeKick + carcassHeight / 2, centerZ);
  //       // Plinth under cabinet touching floor
  //       const plinth = makePlinth(cab.geometry.parameters.width, toeKick, cab.geometry.parameters.depth, `Plinth_Back_${i}`);
  //       plinth.position.set(centerX, floorY + toeKick / 2, centerZ);
  //       cabinetsGroup.add(cab);
  //       cabinetsGroup.add(plinth);
  //     }
  //   }

  //   if (leftCounter) {
  //     const p = (leftCounter.geometry as THREE.BoxGeometry).parameters as any;
  //     const counterThickness = p.height as number; // Y of left counter
  //     const counterDepthX = p.width as number; // X width equals platform depth
  //     const runLengthZ = p.depth as number; // Z length along wall
  //     const cabinetTopY = leftCounter.position.y - counterThickness / 2;
  //     const toeKick = 0.1;
  //     const carcassHeight = Math.max(cabinetTopY - floorY - toeKick, 0.5);
  //     const clearanceWall = 0.02;
  //     const clearanceFront = 0.02;
  //     const depthX = Math.max(counterDepthX - (clearanceWall + clearanceFront), 0.4);

  //     // Inner face of left wall (positive X face into room)
  //     let innerFaceX = -2.5; // fallback
  //     if (leftWall) {
  //       const wp = (leftWall.geometry as THREE.BoxGeometry).parameters as any;
  //       const wallHalfW = (wp.width as number) / 2; // along X is wall thickness
  //       innerFaceX = leftWall.position.x + wallHalfW;
  //     }

  //     const module = 0.6;
  //     const modulesCount = Math.max(1, Math.floor(runLengthZ / module));
  //     const actualModule = runLengthZ / modulesCount;

  //     for (let i = 0; i < modulesCount; i++) {
  //       const cab = makeCabinet(depthX, carcassHeight, actualModule - 0.02, `BaseCabinet_Left_${i}`);
  //       const centerZ = leftCounter.position.z - runLengthZ / 2 + actualModule * (i + 0.5);
  //       const centerX = innerFaceX + clearanceWall + depthX / 2;
  //       cab.position.set(centerX, floorY + toeKick + carcassHeight / 2, centerZ);
  //       // Plinth under cabinet touching floor
  //       const plinth = makePlinth(cab.geometry.parameters.width, toeKick, cab.geometry.parameters.depth, `Plinth_Left_${i}`);
  //       plinth.position.set(centerX, floorY + toeKick / 2, centerZ);
  //       cabinetsGroup.add(cab);
  //       cabinetsGroup.add(plinth);
  //     }
  //   }

  //   scene.add(cabinetsGroup);
  // };

  // const addFullKitchenSetup = async () => {
  //   // 1) Ensure base cabinets exist
  //   addBaseCabinetsUnderPlatform();

  //   const platformGroup = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
  //   const baseGroup = scene.getObjectByName('BaseCabinets') as THREE.Group | null;
  //   const backCounter = platformGroup?.children.find((c) => c.name === 'Back Counter') as THREE.Mesh | undefined;
  //   if (!platformGroup || !baseGroup || !backCounter) return;

  //   // Ensure handle GLB is loaded (auto-load default if not)
  //   if (!cachedHandleModel) {
  //     await loadHandleModel('/door_handle.glb');
  //   }

  //   // 2) Add sink and tap centered on back counter
  //   const p = (backCounter.geometry as THREE.BoxGeometry).parameters as any;
  //   const counterLength = p.width as number;
  //   const counterDepth = p.depth as number;
  //   const counterTopY = backCounter.position.y + (p.height as number) / 2;

  //   // const sinkOuterW = 0.8;
  //   // const sinkOuterD = 0.45;
  //   // const sinkOuterH = 0.18;
  //   // const sinkMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.3 });
  //   // const sink = new THREE.Mesh(new THREE.BoxGeometry(sinkOuterW, sinkOuterH, sinkOuterD), sinkMat);
  //   // sink.name = 'Sink';
  //   // sink.position.set(0, counterTopY - sinkOuterH / 2 + 0.005, counterDepth / 2 - sinkOuterD / 2 - 0.04);
  //   // sink.castShadow = true;
  //   // sink.receiveShadow = true;
  //   // scene.add(sink);

  //   // // Simple tap
  //   // const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 16), sinkMat);
  //   // tap.name = 'SinkTap';
  //   // tap.position.set(sink.position.x + sinkOuterW / 4, counterTopY + 0.09, sink.position.z - sinkOuterD / 2 + 0.06);
  //   // scene.add(tap);

  //   // Helpers to build carcass (5 planks) and vertical partitions
  //   const carcassMat = new THREE.MeshStandardMaterial({ color: 0xd9c7b8, roughness: 0.7, metalness: 0.0 });
  //   const thickness = 0.018; // 18mm

  //   const createCarcass = (centerX: number, centerY: number, centerZ: number, w: number, h: number, d: number, name: string) => {
  //     const group = new THREE.Group();
  //     group.name = name;
  //     // Left plank
  //     const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, d), carcassMat);
  //     left.name = `LEFT_PLANK_${name}`;
  //     left.position.set(centerX - w / 2 + thickness / 2, centerY, centerZ);
  //     // Right plank
  //     const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, d), carcassMat);
  //     right.name = `RIGHT_PLANK_${name}`;
  //     right.position.set(centerX + w / 2 - thickness / 2, centerY, centerZ);
  //     // Bottom plank
  //     const bottom = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, thickness, d), carcassMat);
  //     bottom.name = `BOTTOM_PLANK_${name}`;
  //     bottom.position.set(centerX, centerY - h / 2 + thickness / 2, centerZ);
  //     // Top plank
  //     const top = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, thickness, d), carcassMat);
  //     top.name = `TOP_PLANK_${name}`;
  //     top.position.set(centerX, centerY + h / 2 - thickness / 2, centerZ);
  //     // Back plank
  //     const back = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, h - thickness * 2, thickness), carcassMat);
  //     back.name = `BACK_PLANK_${name}`;
  //     back.position.set(centerX, centerY, centerZ - d / 2 + thickness / 2);
  //     [left, right, bottom, top, back].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  //     group.add(left, right, bottom, top, back);
  //     scene.add(group);
  //     return group;
  //   };

  //   const partitionsGroupName = 'BasePartitions';
  //   let partitionsGroup = scene.getObjectByName(partitionsGroupName) as THREE.Group | null;
  //   if (partitionsGroup) scene.remove(partitionsGroup);
  //   partitionsGroup = new THREE.Group();
  //   partitionsGroup.name = partitionsGroupName;

  //   const createPartitionAtX = (x: number, centerZ: number, height: number, depth: number, baseY: number, label: string) => {
  //     const panel = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), carcassMat);
  //     panel.name = `VERTICAL_PARTITION_${label}`;
  //     panel.position.set(x, baseY + height / 2, centerZ);
  //     panel.castShadow = true;
  //     panel.receiveShadow = true;
  //     partitionsGroup!.add(panel);
  //     return panel;
  //   };

  //   // 3) Convert modules: door modules -> carcass with doors; drawer modules -> partitions + drawers (no carcass)
  //   const baseModules = baseGroup.children.filter((c) => c.name.startsWith('BaseCabinet_')) as THREE.Mesh[];
  //   baseModules.forEach((mod, idx) => {
  //     const wp = (mod.geometry as THREE.BoxGeometry).parameters as any;
  //     const modW = wp.width as number;
  //     const modH = wp.height as number;
  //     const modD = wp.depth as number;

  //     const frontZ = mod.position.z + modD / 2 - 0.01;
  //     const leftX = mod.position.x - modW / 2;
  //     const rightX = mod.position.x + modW / 2;
  //     const bottomY = mod.position.y - modH / 2;

  //     const frontPanelMat = new THREE.MeshStandardMaterial({ color: 0xb97a57, roughness: 0.6 });

  //     if (idx % 3 === 0) {
  //       // Door cabinet: replace solid box with 5-plank carcass + doors
  //       baseGroup.remove(mod);
  //       const carc = createCarcass(mod.position.x, mod.position.y, mod.position.z, modW, modH, modD, `Carcass_${mod.name}`);
  //       const door = new THREE.Mesh(new THREE.BoxGeometry(modW - thickness * 0.5, modH - thickness * 0.5, 0.02), frontPanelMat);
  //       door.name = `Door_${mod.name}`;
  //       door.position.set(mod.position.x, mod.position.y, frontZ + 0.005);
  //       door.castShadow = true;
  //       scene.add(door);
  //       // Handle
  //       if (cachedHandleModel) {
  //         const handle = cachedHandleModel.clone(true);
  //         // Normalize local transform and place at right side of door
  //         handle.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  //         handle.position.set(mod.position.x + (modW / 2) - 0.05, mod.position.y, frontZ + 0.02);
  //         handle.name = `Handle_${mod.name}`;
  //         scene.add(handle);
  //       } else {
  //         const handle = new THREE.Mesh(
  //           new THREE.CylinderGeometry(0.007, 0.007, 0.12, 12),
  //           new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
  //         );
  //         handle.rotation.z = Math.PI / 2;
  //         handle.position.set(mod.position.x + (modW / 2) - 0.05, mod.position.y, frontZ + 0.02);
  //         handle.name = `Handle_${mod.name}`;
  //         scene.add(handle);
  //       }
  //     } else {
  //       // Drawer bay: no carcass, create partitions at module boundaries, then drawers between
  //       baseGroup.remove(mod);
  //       // Ensure left/right partitions
  //       createPartitionAtX(leftX + thickness / 2, mod.position.z, modH, modD, bottomY, `${mod.name}_L`);
  //       createPartitionAtX(rightX - thickness / 2, mod.position.z, modH, modD, bottomY, `${mod.name}_R`);

  //       // Drawer stack with varied heights
  //       const drawerHeights = idx % 2 === 0 ? [0.18, 0.22, 0.26] : [0.26, 0.26];
  //       let accY = bottomY;
  //       drawerHeights.forEach((h, i) => {
  //         const faceW = modW - thickness * 2 - 0.01;
  //         const face = new THREE.Mesh(new THREE.BoxGeometry(faceW, h - 0.01, 0.02), frontPanelMat);
  //         face.name = `DrawerFace_${mod.name}_${i}`;
  //         accY += h / 2;
  //         face.position.set(mod.position.x, accY, frontZ + 0.005);
  //         scene.add(face);
  //         // Handle centered
  //         if (cachedHandleModel) {
  //           const handle = cachedHandleModel.clone(true);
  //           handle.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  //           handle.position.set(mod.position.x, accY, frontZ + 0.02);
  //           handle.name = `Handle_${mod.name}_${i}`;
  //           scene.add(handle);
  //         } else {
  //           const handle = new THREE.Mesh(
  //             new THREE.CylinderGeometry(0.007, 0.007, 0.09, 12),
  //             new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
  //           );
  //           handle.rotation.z = Math.PI / 2;
  //           handle.position.set(mod.position.x, accY, frontZ + 0.02);
  //           handle.name = `Handle_${mod.name}_${i}`;
  //           scene.add(handle);
  //         }

  //         // Wire basket inside drawer bounded by partitions
  //         const basketW = modW - thickness * 2 - 0.06;
  //         const basketH = h - 0.06;
  //         const basketD = modD - 0.08;
  //         const basketGeom = new THREE.BoxGeometry(basketW, basketH, basketD);
  //         const edges = new THREE.EdgesGeometry(basketGeom);
  //         const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  //         line.name = `WireBasket_${mod.name}_${i}`;
  //         line.position.set(mod.position.x, accY, mod.position.z);
  //         scene.add(line);
  //         accY += h / 2;
  //       });
  //     }
  //   });

  //   scene.add(partitionsGroup);

  //   // 4) Add upper cabinets along back wall (five-plank carcasses with doors)
  //   const uppersGroup = scene.getObjectByName('UpperCabinets');
  //   if (uppersGroup) scene.remove(uppersGroup);
  //   const upperGroup = new THREE.Group();
  //   upperGroup.name = 'UpperCabinets';

  //   const upperBottomY = backCounter.position.y + 0.55; // ~550mm above counter
  //   const upperHeight = 0.7; // 700mm tall
  //   const upperDepth = 0.35;

  //   const modules = 5;
  //   const upperW = (counterLength - 0.05) / modules; // small gaps
  //   for (let i = 0; i < modules; i++) {
  //     const cx = -counterLength / 2 + upperW * (i + 0.5);
  //     // five-plank carcass
  //     const carc = new THREE.Group();
  //     carc.name = `UpperCabinet_${i}`;
  //     const uLeft = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperHeight, upperDepth), carcassMat);
  //     const uRight = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperHeight, upperDepth), carcassMat);
  //     const uBottom = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, thickness, upperDepth), carcassMat);
  //     const uTop = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, thickness, upperDepth), carcassMat);
  //     const uBack = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, upperHeight - thickness * 2, thickness), carcassMat);
  //     [uLeft, uRight, uBottom, uTop, uBack].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  //     uLeft.position.set(cx - upperW / 2 + thickness / 2, upperBottomY + upperHeight / 2, upperDepth / 2 + 0.02);
  //     uRight.position.set(cx + upperW / 2 - thickness / 2, upperBottomY + upperHeight / 2, upperDepth / 2 + 0.02);
  //     uBottom.position.set(cx, upperBottomY + thickness / 2, upperDepth / 2 + 0.02);
  //     uTop.position.set(cx, upperBottomY + upperHeight - thickness / 2, upperDepth / 2 + 0.02);
  //     uBack.position.set(cx, upperBottomY + upperHeight / 2, 0.02);
  //     carc.add(uLeft, uRight, uBottom, uTop, uBack);
  //     upperGroup.add(carc);

  //     // Upper doors
  //     const door = new THREE.Mesh(
  //       new THREE.BoxGeometry(upperW / 2 - 0.02, upperHeight - 0.02, 0.02),
  //       new THREE.MeshStandardMaterial({ color: 0xb97a57, roughness: 0.6 }),
  //     );
  //     door.position.set(cx - (upperW / 4), upperBottomY + upperHeight / 2, upperDepth + 0.01);
  //     door.name = `UpperDoor_L_${i}`;
  //     upperGroup.add(door);
  //     const doorR = door.clone();
  //     doorR.position.set(cx + (upperW / 4), upperBottomY + upperHeight / 2, upperDepth + 0.01);
  //     doorR.name = `UpperDoor_R_${i}`;
  //     upperGroup.add(doorR);

  //     // Handles on doors
  //     const handleOffsetX = (upperW / 2) - 0.06;
  //     const handleY = upperBottomY + upperHeight / 2;
  //     const handleZ = upperDepth + 0.03;
  //     const addUpperHandle = (hx: number, name: string) => {
  //       if (cachedHandleModel) {
  //         const h = cachedHandleModel.clone(true);
  //         h.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  //         h.position.set(hx, handleY, handleZ);
  //         h.name = name;
  //         upperGroup.add(h);
  //       } else {
  //         const cyl = new THREE.Mesh(
  //           new THREE.CylinderGeometry(0.007, 0.007, 0.09, 12),
  //           new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
  //         );
  //         cyl.rotation.z = Math.PI / 2;
  //         cyl.position.set(hx, handleY, handleZ);
  //         cyl.name = name;
  //         upperGroup.add(cyl);
  //       }
  //     };
  //     addUpperHandle(cx - handleOffsetX, `UpperHandle_L_${i}`);
  //     addUpperHandle(cx + handleOffsetX, `UpperHandle_R_${i}`);
  //   }

  //   scene.add(upperGroup);
  // };

  // const loadHandleModel = async (url: string) => {
  //   const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  //   const loader = new GLTFLoader();
  //   return new Promise<void>((resolve) => {
  //     loader.load(
  //       url,
  //       (gltf) => {
  //         const model = gltf.scene;
  //         // Normalize size to a typical handle length ~120mm
  //         const box = new THREE.Box3().setFromObject(model);
  //         const size = new THREE.Vector3();
  //         box.getSize(size);
  //         const targetLen = 0.12;
  //         const currentLen = Math.max(size.x, size.y, size.z) || 1;
  //         const s = targetLen / currentLen;
  //         model.scale.setScalar(s);
  //         // center
  //         const box2 = new THREE.Box3().setFromObject(model);
  //         const center = new THREE.Vector3();
  //         box2.getCenter(center);
  //         model.position.sub(center);
  //         model.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  //         cachedHandleModel = model;
  //         resolve();
  //       },
  //       undefined,
  //       () => resolve(),
  //     );
  //   });
  // };

  const loadSinkModel = async (url: string) => {
    // Try to find a suitable countertop to place the sink on
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
      // Fallback: any mesh named starting with "Counter_"
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
};

export const addVerticalPlanksInsideBox = (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  if (!boxMesh || count <= 0) return;
  const params = (boxMesh.geometry as THREE.BoxGeometry).parameters as any;
  const width = params.width as number; // X span of box
  const height = params.height as number; // Y span of box
  const depth = params.depth as number; // Z span of

  const center = boxMesh.position.clone();
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
  const plankY = center.y + skirtingHeight / 2; // Position above skirting

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
                  x: (plank.position as any).x,
                  y: (plank.position as any).y,
                  z: (plank.position as any).z,
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
      plank.position.set(center.x, plankY, center.z + zLocal + 0.01);
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
                  x: (plank.position as any).x,
                  y: (plank.position as any).y,
                  z: (plank.position as any).z,
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
      plank.position.set(center.x + xLocal, plankY, center.z + 0.01);
      parent.add(plank);
    }
  }

  // Add kitchen skirting (toe kick) along front at floor
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
      inv.position.set(center.x, plankY, center.z + compCenterZ + 0.01);
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
      inv.position.set(center.x + compCenterX, plankY, center.z + 0.01);
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
                x: (shelf.position as any).x,
                y: (shelf.position as any).y,
                z: (shelf.position as any).z,
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
    shelf.position.set(center.x, center.y + yLocal + 0.01, center.z);
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

// New function to refresh invisible boxes after plank movement
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

export const addDoorOnInvisibleBox = async (
  scene: THREE.Scene,
  boxMesh: THREE.Mesh,
  count: number = 1,
  selectedCabinetItem: any = null,
  apiResponseDataArray: any[] = [],
) => {
  const params = (boxMesh.geometry as THREE.BoxGeometry).parameters as any;
  const w = params.width as number;
  const h = params.height as number;
  const d = params.depth as number;
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
  if (isSide) {
    const frontX = boxMesh.position.x + dir * (w / 2 + 0.01);
    face.position.set(frontX, boxMesh.position.y, boxMesh.position.z);
  } else {
    const frontZ = boxMesh.position.z + d / 2 + 0.01;
    face.position.set(boxMesh.position.x, boxMesh.position.y, frontZ);
  }
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
  scene.add(doorGroup);
  doorGroup.attach(face);
  await ensureHandleLoaded();
  if (cachedHandleModel) {
    const handle = cachedHandleModel.clone(true);

    if (isSide) {
      // For side walls, handle should be positioned on the door face and rotated properly
      const frontX = face.position.x;
      // Position handle in left corner of the door
      handle.position.set(
        frontX + dir * 0.01,
        face.position.y - h / 2 + 0.1,
        face.position.z - d / 2 + 0.1,
      );
      // Rotate handle to be perpendicular to the door face for side walls
      handle.rotation.set(0, 0, 0);
      // For side walls, the door face is vertical, so handle should be horizontal
      handle.rotation.z = Math.PI / 2; // Rotate around Z axis to make handle horizontal
      handle.rotation.y = Math.PI / 2; // Rotate around Y axis for side wall orientation
    } else {
      // For center walls, handle positioned in left corner of the door
      const frontZ = face.position.z;
      handle.position.set(
        face.position.x - w / 2 + 0.1,
        face.position.y,
        frontZ + 0.01,
      );
      // Standard vertical handle rotation for center walls
      handle.rotation.set(0, 0, 0);
      handle.rotation.y = Math.PI / 2;
    }

    handle.name = `Handle_for_${boxMesh.name}`;
    scene.add(handle);
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
  const params = (boxMesh.geometry as THREE.BoxGeometry).parameters as any;
  const w = params.width as number;
  const h = params.height as number;
  const d = params.depth as number;
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
    const yCenter = boxMesh.position.y - h / 2 + eachH * (i + 0.5);
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
      const frontX = boxMesh.position.x + dir * (w / 2 + 0.01);
      face.position.set(frontX, yCenter, boxMesh.position.z);
    } else {
      const frontZ = boxMesh.position.z + d / 2 + 0.01;
      face.position.set(boxMesh.position.x, yCenter, frontZ);
    }
    scene.add(face);
    drawerGroup.attach(face);
    // Handle
    if (cachedHandleModel) {
      const handle = cachedHandleModel.clone(true);

      if (isSide) {
        // For side walls, position handle on the drawer face
        const frontX = (face.position as THREE.Vector3).x;
        handle.position.set(
          frontX + dir * 0.01,
          face.position.y,
          face.position.z,
        );
        // Rotate handle for side wall orientation
        handle.rotation.set(0, 0, 0);
        // For side walls, the drawer face is vertical, so handle should be horizontal
        handle.rotation.z = Math.PI / 2; // Rotate around Z axis to make handle horizontal
        handle.rotation.y = Math.PI / 2; // Rotate around Y axis for side wall orientation
      } else {
        // For center walls, horizontal handle for drawers
        const frontZ = (face.position as THREE.Vector3).z;
        handle.position.set(face.position.x, face.position.y, frontZ + 0.01);
        handle.rotation.set(0, 0, 0);
        handle.rotation.z = Math.PI / 2;
        handle.rotation.x = -(Math.PI / 2);
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
      leftSide.position.set(
        boxMesh.position.x - innerW / 2,
        baseY,
        boxMesh.position.z,
      );
      rightSide.position.set(
        boxMesh.position.x + innerW / 2,
        baseY,
        boxMesh.position.z,
      );
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
      back.position.set(
        boxMesh.position.x,
        baseY,
        boxMesh.position.z - innerD / 2,
      );
      back.name = `DrawerBack_${i}_for_${boxMesh.name}`;
      scene.add(back);
      drawerGroup.attach(back);
      // Front inner panel (inside behind face)
      const frontInner = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, innerH, thickness),
        sideMat,
      );
      frontInner.position.set(
        boxMesh.position.x,
        baseY,
        boxMesh.position.z + innerD / 2 - thickness,
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
        boxMesh.position.x,
        baseY - innerH / 2 + thickness / 2,
        boxMesh.position.z,
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
      basket.position.set(boxMesh.position.x, yCenter, boxMesh.position.z);
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
      const nearZ = boxMesh.position.z - d / 2 + railT / 2 + 0.01;
      const farZ = boxMesh.position.z + d / 2 - railT / 2 - 0.01;
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
      nearRail.position.set(boxMesh.position.x, yCenter, nearZ);
      farRail.position.set(boxMesh.position.x, yCenter, farZ);
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
        boxMesh.position.x - w / 2 + railT / 2 + 0.01,
        yCenter,
        boxMesh.position.z,
      );
      rightRail.position.set(
        boxMesh.position.x + w / 2 - railT / 2 - 0.01,
        yCenter,
        boxMesh.position.z,
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

  for (let i = 0; i < count; i++) {
    // Cabinet carcass (five-plank construction)
    const carcassMat = new THREE.MeshStandardMaterial({
      color: 0xd9c7b8,
      roughness: 0.7,
    });
    const thickness = 0.018; // 18mm

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
    // Only rotate for side platforms
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
    // Only rotate for side platforms
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
    // Only rotate for side platforms
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
    // Only rotate for side platforms
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
    // Only rotate for side platforms
    if (isSidePlatform) {
      backPlank.rotation.y = Math.PI / 2;
    }
    backPlank.castShadow = true;
    backPlank.receiveShadow = true;
    backPlank.name = `UpperBackPlank_${i}`;

    // Add planks to cabinet group
    cabinetGroup.add(leftPlank, rightPlank, bottomPlank, topPlank, backPlank);

    // Create door(s) based on door type
    const doorHeight = upperHeight - thickness * 2 - 0.01;
    const doorThickness = 0.02;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('/Texture0004.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 1);

    const doorMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      side: THREE.DoubleSide,
    });

    if (doorType === 'double') {
      // Create two doors for double door cabinet
      const doorWidth = (actualCabinetWidth - thickness * 2 - 0.01) / 2 - 0.005; // Split width with small gap

      // Left door
      const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness),
        doorMat,
      );

      // Right door
      const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness),
        doorMat,
      );

      if (isSidePlatform) {
        // For side walls, doors should be positioned on the front face (facing into the room)
        if (isLeftWall) {
          // Left wall: doors face right (positive X direction)
          leftDoor.position.set(
            cabinetX + upperDepth / 2 + doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ - doorWidth / 2 - 0.0025, // Left side
          );
          rightDoor.position.set(
            cabinetX + upperDepth / 2 + doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ + doorWidth / 2 + 0.0025, // Right side
          );
          leftDoor.rotation.y = Math.PI / 2;
          rightDoor.rotation.y = Math.PI / 2;
        } else if (isRightWall) {
          // Right wall: doors face left (negative X direction)
          leftDoor.position.set(
            cabinetX - upperDepth / 2 - doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ - doorWidth / 2 - 0.0025, // Left side
          );
          rightDoor.position.set(
            cabinetX - upperDepth / 2 - doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ + doorWidth / 2 + 0.0025, // Right side
          );
          leftDoor.rotation.y = Math.PI / 2;
          rightDoor.rotation.y = Math.PI / 2;
        }
      } else {
        // For center wall, doors face forward (positive Z direction)
        leftDoor.position.set(
          cabinetX - doorWidth / 2 - 0.0025, // Left side
          upperBottomY + upperHeight / 2,
          cabinetZ + upperDepth / 2 + doorThickness / 2,
        );
        rightDoor.position.set(
          cabinetX + doorWidth / 2 + 0.0025, // Right side
          upperBottomY + upperHeight / 2,
          cabinetZ + upperDepth / 2 + doorThickness / 2,
        );
        // leftDoor.rotation.y = Math.PI / 2;
        // rightDoor.rotation.y = Math.PI / 2;
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
    } else {
      // Single door (original behavior)
      const doorWidth = actualCabinetWidth - thickness * 2 - 0.01;
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness),
        doorMat,
      );

      if (isSidePlatform) {
        // For side walls, door should be positioned on the front face (facing into the room)
        if (isLeftWall) {
          // Left wall: door faces right (positive X direction)
          door.position.set(
            cabinetX + upperDepth / 2 + doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ,
          );
          door.rotation.y = Math.PI / 2;
        } else if (isRightWall) {
          // Right wall: door faces left (negative X direction)
          door.position.set(
            cabinetX - upperDepth / 2 - doorThickness / 2,
            upperBottomY + upperHeight / 2,
            cabinetZ,
          );
          door.rotation.y = Math.PI / 2;
        }
      } else {
        // For center wall, door faces forward (positive Z direction)
        door.position.set(
          cabinetX,
          upperBottomY + upperHeight / 2,
          cabinetZ + upperDepth / 2 + doorThickness / 2,
        );
        // No rotation needed for center wall doors
      }

      door.castShadow = true;
      door.receiveShadow = true;
      door.name = `UpperDoor_${i}`;
      door.userData.openDirection = 'top';

      // Add door to cabinet group
      cabinetGroup.add(door);
    }

    // Add handle(s) to door(s) (positioned for bottom-to-top opening)
    if (cachedHandleModel) {
      if (doorType === 'double') {
        // Create handles for both doors
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

        if (isSidePlatform) {
          // For side walls, position handles on the door faces
          if (isLeftWall) {
            // Left wall: handles on the right side of the doors
            const handleX =
              cabinetX + upperDepth / 2 + doorThickness / 2 + 0.01;
            const handleY = upperBottomY + thickness + 0.1; // Near bottom of door

            leftHandle.position.set(
              handleX,
              handleY,
              cabinetZ - (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            );
            rightHandle.position.set(
              handleX,
              handleY,
              cabinetZ + (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            );

            leftHandle.rotation.set(0, 0, 0);
            leftHandle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
            rightHandle.rotation.set(0, 0, 0);
            rightHandle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
          } else if (isRightWall) {
            // Right wall: handles on the left side of the doors
            const handleX =
              cabinetX - upperDepth / 2 - doorThickness / 2 - 0.01;
            const handleY = upperBottomY + thickness + 0.1; // Near bottom of door

            leftHandle.position.set(
              handleX,
              handleY,
              cabinetZ - (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            );
            rightHandle.position.set(
              handleX,
              handleY,
              cabinetZ + (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            );

            leftHandle.rotation.set(0, 0, 0);
            leftHandle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
            rightHandle.rotation.set(0, 0, 0);
            rightHandle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
          }
        } else {
          // For center wall, position handles at bottom of doors
          const handleY = upperBottomY + thickness + 0.1; // Near bottom of door
          const handleZ = cabinetZ + upperDepth / 2 - 0.01; // At the front face of the door

          leftHandle.position.set(
            cabinetX - (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            handleY,
            handleZ,
          );
          rightHandle.position.set(
            cabinetX + (actualCabinetWidth - thickness * 2 - 0.01) / 4,
            handleY,
            handleZ,
          );

          leftHandle.rotation.x = -(Math.PI / 2);
          leftHandle.rotation.z = Math.PI / 2;
          rightHandle.rotation.x = -(Math.PI / 2);
          rightHandle.rotation.z = Math.PI / 2;
        }

        leftHandle.name = `UpperLeftHandle_${i}`;
        rightHandle.name = `UpperRightHandle_${i}`;
        cabinetGroup.add(leftHandle, rightHandle);
      } else {
        // Single door handle (original behavior)
        const handle = cachedHandleModel.clone(true);
        handle.traverse((n: any) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });

        if (isSidePlatform) {
          // For side walls, position handle on the door face
          if (isLeftWall) {
            // Left wall: handle on the right side of the door
            const handleX =
              cabinetX + upperDepth / 2 + doorThickness / 2 + 0.01;
            const handleY = upperBottomY + thickness + 0.1; // Near bottom of door
            const handleZ = cabinetZ;
            handle.position.set(handleX, handleY, handleZ);
            handle.rotation.set(0, 0, 0);
            handle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
          } else if (isRightWall) {
            // Right wall: handle on the left side of the door
            const handleX =
              cabinetX - upperDepth / 2 - doorThickness / 2 - 0.01;
            const handleY = upperBottomY + thickness + 0.1; // Near bottom of door
            const handleZ = cabinetZ;
            handle.position.set(handleX, handleY, handleZ);
            handle.rotation.set(0, 0, 0);
            handle.rotation.z = Math.PI / 2; // Horizontal handle for side wall
          }
        } else {
          // For center wall, position handle at bottom of door
          const handleX = cabinetX;
          const handleY = upperBottomY + thickness + 0.1; // Near bottom of door
          const handleZ = cabinetZ + upperDepth / 2 - 0.01; // At the front face of the door
          handle.position.set(handleX, handleY, handleZ);
          handle.rotation.x = -(Math.PI / 2);
          handle.rotation.z = Math.PI / 2;
        }

        handle.name = `UpperHandle_${i}`;
        cabinetGroup.add(handle);
      }
    }

    // Add cabinet to upper group
    upperGroup.add(cabinetGroup);
  }
};

/**
 * Creates double-door upper cabinets above a platform
 * @param scene - The Three.js scene
 * @param platformMesh - The platform/counter mesh to place cabinets above
 * @param count - Number of double-door cabinets to create
 */
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
