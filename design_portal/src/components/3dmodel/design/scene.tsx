import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { initializeMoveHandler } from '../handler/items';
import { createGrid } from './grid-creator';
import { ThreeDView } from './interface';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let cachedHandleModel: THREE.Object3D | null = null;

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

  const addBaseCabinetsUnderPlatform = () => {
    const platformGroup = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
    if (!platformGroup) return;

    // Remove existing cabinets if re-run
    const existing = scene.getObjectByName('BaseCabinets');
    if (existing) {
      scene.remove(existing);
    }

    const cabinetsGroup = new THREE.Group();
    cabinetsGroup.name = 'BaseCabinets';

    const backCounter = platformGroup.children.find((c) => c.name === 'Back Counter') as THREE.Mesh | undefined;
    const leftCounter = platformGroup.children.find((c) => c.name === 'Left Counter') as THREE.Mesh | undefined;
    const backWall = scene.getObjectByName('Center Wall') as THREE.Mesh | undefined;
    const leftWall = scene.getObjectByName('Left Wall') as THREE.Mesh | undefined;

    // Determine floor Y position from the floor panel
    let floorY = 0;
    const cWallGroup = scene.getObjectByName('cWallWithFloor') as THREE.Group | null;
    if (cWallGroup) {
      const floorObj = cWallGroup.children.find(
        (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
      ) as THREE.Mesh | undefined;
      if (floorObj) floorY = floorObj.position.y;
    }

    const makeCabinet = (w: number, h: number, d: number, name: string) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xc7b199, roughness: 0.6 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.castShadow = true;
      box.receiveShadow = true;
      box.name = name;
      return box;
    };

    const makePlinth = (w: number, h: number, d: number, name: string) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4f4f4f, roughness: 0.7 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.castShadow = false;
      box.receiveShadow = true;
      box.name = name;
      return box;
    };

    // Common parameters from counters
    if (backCounter) {
      const p = (backCounter.geometry as THREE.BoxGeometry).parameters as any;
      const counterThickness = p.height as number; // Y of back counter
      const counterDepth = p.depth as number; // Z of back counter
      const counterLength = p.width as number; // X of back counter
      const cabinetTopY = backCounter.position.y - counterThickness / 2; // underside of top
      const toeKick = 0.1; // 100mm plinth sitting on floor
      const carcassHeight = Math.max(cabinetTopY - floorY - toeKick, 0.5);
      const clearanceBack = 0.02;
      const clearanceFront = 0.02;
      const cabinetDepth = Math.max(counterDepth - (clearanceBack + clearanceFront), 0.4);

      // Inner face of back wall (positive Z face)
      let innerFaceZ = 0;
      if (backWall) {
        const wp = (backWall.geometry as THREE.BoxGeometry).parameters as any;
        const wallHalfT = (wp.depth as number) / 2;
        innerFaceZ = backWall.position.z + wallHalfT; // facing into the room
      }

      const module = 0.6; // 600mm modules
      const modulesCount = Math.max(1, Math.floor(counterLength / module));
      const actualModule = counterLength / modulesCount; // even spacing

      for (let i = 0; i < modulesCount; i++) {
        const cab = makeCabinet(actualModule - 0.02, carcassHeight, cabinetDepth, `BaseCabinet_Back_${i}`);
        const centerX = -counterLength / 2 + actualModule * (i + 0.5);
        const centerZ = (innerFaceZ || 0) + clearanceBack + cabinetDepth / 2;
        cab.position.set(centerX, floorY + toeKick + carcassHeight / 2, centerZ);
        // Plinth under cabinet touching floor
        const plinth = makePlinth(cab.geometry.parameters.width, toeKick, cab.geometry.parameters.depth, `Plinth_Back_${i}`);
        plinth.position.set(centerX, floorY + toeKick / 2, centerZ);
        cabinetsGroup.add(cab);
        cabinetsGroup.add(plinth);
      }
    }

    if (leftCounter) {
      const p = (leftCounter.geometry as THREE.BoxGeometry).parameters as any;
      const counterThickness = p.height as number; // Y of left counter
      const counterDepthX = p.width as number; // X width equals platform depth
      const runLengthZ = p.depth as number; // Z length along wall
      const cabinetTopY = leftCounter.position.y - counterThickness / 2;
      const toeKick = 0.1;
      const carcassHeight = Math.max(cabinetTopY - floorY - toeKick, 0.5);
      const clearanceWall = 0.02;
      const clearanceFront = 0.02;
      const depthX = Math.max(counterDepthX - (clearanceWall + clearanceFront), 0.4);

      // Inner face of left wall (positive X face into room)
      let innerFaceX = -2.5; // fallback
      if (leftWall) {
        const wp = (leftWall.geometry as THREE.BoxGeometry).parameters as any;
        const wallHalfW = (wp.width as number) / 2; // along X is wall thickness
        innerFaceX = leftWall.position.x + wallHalfW;
      }

      const module = 0.6;
      const modulesCount = Math.max(1, Math.floor(runLengthZ / module));
      const actualModule = runLengthZ / modulesCount;

      for (let i = 0; i < modulesCount; i++) {
        const cab = makeCabinet(depthX, carcassHeight, actualModule - 0.02, `BaseCabinet_Left_${i}`);
        const centerZ = leftCounter.position.z - runLengthZ / 2 + actualModule * (i + 0.5);
        const centerX = innerFaceX + clearanceWall + depthX / 2;
        cab.position.set(centerX, floorY + toeKick + carcassHeight / 2, centerZ);
        // Plinth under cabinet touching floor
        const plinth = makePlinth(cab.geometry.parameters.width, toeKick, cab.geometry.parameters.depth, `Plinth_Left_${i}`);
        plinth.position.set(centerX, floorY + toeKick / 2, centerZ);
        cabinetsGroup.add(cab);
        cabinetsGroup.add(plinth);
      }
    }

    scene.add(cabinetsGroup);
  };

  const addFullKitchenSetup = async () => {
    // 1) Ensure base cabinets exist
    addBaseCabinetsUnderPlatform();

    const platformGroup = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
    const baseGroup = scene.getObjectByName('BaseCabinets') as THREE.Group | null;
    const backCounter = platformGroup?.children.find((c) => c.name === 'Back Counter') as THREE.Mesh | undefined;
    if (!platformGroup || !baseGroup || !backCounter) return;

    // Ensure handle GLB is loaded (auto-load default if not)
    if (!cachedHandleModel) {
      await loadHandleModel('/door_handle.glb');
    }

    // 2) Add sink and tap centered on back counter
    const p = (backCounter.geometry as THREE.BoxGeometry).parameters as any;
    const counterLength = p.width as number;
    const counterDepth = p.depth as number;
    const counterTopY = backCounter.position.y + (p.height as number) / 2;

    // const sinkOuterW = 0.8;
    // const sinkOuterD = 0.45;
    // const sinkOuterH = 0.18;
    // const sinkMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.3 });
    // const sink = new THREE.Mesh(new THREE.BoxGeometry(sinkOuterW, sinkOuterH, sinkOuterD), sinkMat);
    // sink.name = 'Sink';
    // sink.position.set(0, counterTopY - sinkOuterH / 2 + 0.005, counterDepth / 2 - sinkOuterD / 2 - 0.04);
    // sink.castShadow = true;
    // sink.receiveShadow = true;
    // scene.add(sink);

    // // Simple tap
    // const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 16), sinkMat);
    // tap.name = 'SinkTap';
    // tap.position.set(sink.position.x + sinkOuterW / 4, counterTopY + 0.09, sink.position.z - sinkOuterD / 2 + 0.06);
    // scene.add(tap);

    // Helpers to build carcass (5 planks) and vertical partitions
    const carcassMat = new THREE.MeshStandardMaterial({ color: 0xd9c7b8, roughness: 0.7, metalness: 0.0 });
    const thickness = 0.018; // 18mm

    const createCarcass = (centerX: number, centerY: number, centerZ: number, w: number, h: number, d: number, name: string) => {
      const group = new THREE.Group();
      group.name = name;
      // Left plank
      const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, d), carcassMat);
      left.name = `LEFT_PLANK_${name}`;
      left.position.set(centerX - w / 2 + thickness / 2, centerY, centerZ);
      // Right plank
      const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, d), carcassMat);
      right.name = `RIGHT_PLANK_${name}`;
      right.position.set(centerX + w / 2 - thickness / 2, centerY, centerZ);
      // Bottom plank
      const bottom = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, thickness, d), carcassMat);
      bottom.name = `BOTTOM_PLANK_${name}`;
      bottom.position.set(centerX, centerY - h / 2 + thickness / 2, centerZ);
      // Top plank
      const top = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, thickness, d), carcassMat);
      top.name = `TOP_PLANK_${name}`;
      top.position.set(centerX, centerY + h / 2 - thickness / 2, centerZ);
      // Back plank
      const back = new THREE.Mesh(new THREE.BoxGeometry(w - thickness * 2, h - thickness * 2, thickness), carcassMat);
      back.name = `BACK_PLANK_${name}`;
      back.position.set(centerX, centerY, centerZ - d / 2 + thickness / 2);
      [left, right, bottom, top, back].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
      group.add(left, right, bottom, top, back);
      scene.add(group);
      return group;
    };

    const partitionsGroupName = 'BasePartitions';
    let partitionsGroup = scene.getObjectByName(partitionsGroupName) as THREE.Group | null;
    if (partitionsGroup) scene.remove(partitionsGroup);
    partitionsGroup = new THREE.Group();
    partitionsGroup.name = partitionsGroupName;

    const createPartitionAtX = (x: number, centerZ: number, height: number, depth: number, baseY: number, label: string) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), carcassMat);
      panel.name = `VERTICAL_PARTITION_${label}`;
      panel.position.set(x, baseY + height / 2, centerZ);
      panel.castShadow = true;
      panel.receiveShadow = true;
      partitionsGroup!.add(panel);
      return panel;
    };

    // 3) Convert modules: door modules -> carcass with doors; drawer modules -> partitions + drawers (no carcass)
    const baseModules = baseGroup.children.filter((c) => c.name.startsWith('BaseCabinet_')) as THREE.Mesh[];
    baseModules.forEach((mod, idx) => {
      const wp = (mod.geometry as THREE.BoxGeometry).parameters as any;
      const modW = wp.width as number;
      const modH = wp.height as number;
      const modD = wp.depth as number;

      const frontZ = mod.position.z + modD / 2 - 0.01;
      const leftX = mod.position.x - modW / 2;
      const rightX = mod.position.x + modW / 2;
      const bottomY = mod.position.y - modH / 2;

      const frontPanelMat = new THREE.MeshStandardMaterial({ color: 0xb97a57, roughness: 0.6 });

      if (idx % 3 === 0) {
        // Door cabinet: replace solid box with 5-plank carcass + doors
        baseGroup.remove(mod);
        const carc = createCarcass(mod.position.x, mod.position.y, mod.position.z, modW, modH, modD, `Carcass_${mod.name}`);
        const door = new THREE.Mesh(new THREE.BoxGeometry(modW - thickness * 0.5, modH - thickness * 0.5, 0.02), frontPanelMat);
        door.name = `Door_${mod.name}`;
        door.position.set(mod.position.x, mod.position.y, frontZ + 0.005);
        door.castShadow = true;
        scene.add(door);
        // Handle
        if (cachedHandleModel) {
          const handle = cachedHandleModel.clone(true);
          // Normalize local transform and place at right side of door
          handle.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
          handle.position.set(mod.position.x + (modW / 2) - 0.05, mod.position.y, frontZ + 0.02);
          handle.name = `Handle_${mod.name}`;
          scene.add(handle);
        } else {
          const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.007, 0.007, 0.12, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
          );
          handle.rotation.z = Math.PI / 2;
          handle.position.set(mod.position.x + (modW / 2) - 0.05, mod.position.y, frontZ + 0.02);
          handle.name = `Handle_${mod.name}`;
          scene.add(handle);
        }
      } else {
        // Drawer bay: no carcass, create partitions at module boundaries, then drawers between
        baseGroup.remove(mod);
        // Ensure left/right partitions
        createPartitionAtX(leftX + thickness / 2, mod.position.z, modH, modD, bottomY, `${mod.name}_L`);
        createPartitionAtX(rightX - thickness / 2, mod.position.z, modH, modD, bottomY, `${mod.name}_R`);

        // Drawer stack with varied heights
        const drawerHeights = idx % 2 === 0 ? [0.18, 0.22, 0.26] : [0.26, 0.26];
        let accY = bottomY;
        drawerHeights.forEach((h, i) => {
          const faceW = modW - thickness * 2 - 0.01;
          const face = new THREE.Mesh(new THREE.BoxGeometry(faceW, h - 0.01, 0.02), frontPanelMat);
          face.name = `DrawerFace_${mod.name}_${i}`;
          accY += h / 2;
          face.position.set(mod.position.x, accY, frontZ + 0.005);
          scene.add(face);
          // Handle centered
          if (cachedHandleModel) {
            const handle = cachedHandleModel.clone(true);
            handle.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
            handle.position.set(mod.position.x, accY, frontZ + 0.02);
            handle.name = `Handle_${mod.name}_${i}`;
            scene.add(handle);
          } else {
            const handle = new THREE.Mesh(
              new THREE.CylinderGeometry(0.007, 0.007, 0.09, 12),
              new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
            );
            handle.rotation.z = Math.PI / 2;
            handle.position.set(mod.position.x, accY, frontZ + 0.02);
            handle.name = `Handle_${mod.name}_${i}`;
            scene.add(handle);
          }

          // Wire basket inside drawer bounded by partitions
          const basketW = modW - thickness * 2 - 0.06;
          const basketH = h - 0.06;
          const basketD = modD - 0.08;
          const basketGeom = new THREE.BoxGeometry(basketW, basketH, basketD);
          const edges = new THREE.EdgesGeometry(basketGeom);
          const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
          line.name = `WireBasket_${mod.name}_${i}`;
          line.position.set(mod.position.x, accY, mod.position.z);
          scene.add(line);
          accY += h / 2;
        });
      }
    });

    scene.add(partitionsGroup);

    // 4) Add upper cabinets along back wall (five-plank carcasses with doors)
    const uppersGroup = scene.getObjectByName('UpperCabinets');
    if (uppersGroup) scene.remove(uppersGroup);
    const upperGroup = new THREE.Group();
    upperGroup.name = 'UpperCabinets';

    const upperBottomY = backCounter.position.y + 0.55; // ~550mm above counter
    const upperHeight = 0.7; // 700mm tall
    const upperDepth = 0.35;

    const modules = 5;
    const upperW = (counterLength - 0.05) / modules; // small gaps
    for (let i = 0; i < modules; i++) {
      const cx = -counterLength / 2 + upperW * (i + 0.5);
      // five-plank carcass
      const carc = new THREE.Group();
      carc.name = `UpperCabinet_${i}`;
      const uLeft = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperHeight, upperDepth), carcassMat);
      const uRight = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperHeight, upperDepth), carcassMat);
      const uBottom = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, thickness, upperDepth), carcassMat);
      const uTop = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, thickness, upperDepth), carcassMat);
      const uBack = new THREE.Mesh(new THREE.BoxGeometry(upperW - thickness * 2 - 0.02, upperHeight - thickness * 2, thickness), carcassMat);
      [uLeft, uRight, uBottom, uTop, uBack].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
      uLeft.position.set(cx - upperW / 2 + thickness / 2, upperBottomY + upperHeight / 2, upperDepth / 2 + 0.02);
      uRight.position.set(cx + upperW / 2 - thickness / 2, upperBottomY + upperHeight / 2, upperDepth / 2 + 0.02);
      uBottom.position.set(cx, upperBottomY + thickness / 2, upperDepth / 2 + 0.02);
      uTop.position.set(cx, upperBottomY + upperHeight - thickness / 2, upperDepth / 2 + 0.02);
      uBack.position.set(cx, upperBottomY + upperHeight / 2, 0.02);
      carc.add(uLeft, uRight, uBottom, uTop, uBack);
      upperGroup.add(carc);

      // Upper doors
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(upperW / 2 - 0.02, upperHeight - 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xb97a57, roughness: 0.6 }),
      );
      door.position.set(cx - (upperW / 4), upperBottomY + upperHeight / 2, upperDepth + 0.01);
      door.name = `UpperDoor_L_${i}`;
      upperGroup.add(door);
      const doorR = door.clone();
      doorR.position.set(cx + (upperW / 4), upperBottomY + upperHeight / 2, upperDepth + 0.01);
      doorR.name = `UpperDoor_R_${i}`;
      upperGroup.add(doorR);

      // Handles on doors
      const handleOffsetX = (upperW / 2) - 0.06;
      const handleY = upperBottomY + upperHeight / 2;
      const handleZ = upperDepth + 0.03;
      const addUpperHandle = (hx: number, name: string) => {
        if (cachedHandleModel) {
          const h = cachedHandleModel.clone(true);
          h.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
          h.position.set(hx, handleY, handleZ);
          h.name = name;
          upperGroup.add(h);
        } else {
          const cyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.007, 0.007, 0.09, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 }),
          );
          cyl.rotation.z = Math.PI / 2;
          cyl.position.set(hx, handleY, handleZ);
          cyl.name = name;
          upperGroup.add(cyl);
        }
      };
      addUpperHandle(cx - handleOffsetX, `UpperHandle_L_${i}`);
      addUpperHandle(cx + handleOffsetX, `UpperHandle_R_${i}`);
    }

    scene.add(upperGroup);
  };

  const loadHandleModel = async (url: string) => {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    return new Promise<void>((resolve) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          // Normalize size to a typical handle length ~120mm
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const targetLen = 0.12;
          const currentLen = Math.max(size.x, size.y, size.z) || 1;
          const s = targetLen / currentLen;
          model.scale.setScalar(s);
          // center
          const box2 = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box2.getCenter(center);
          model.position.sub(center);
          model.traverse((n: any) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
          cachedHandleModel = model;
          resolve();
        },
        undefined,
        () => resolve(),
      );
    });
  };

  const loadSinkModel = async (url: string) => {
    const platformGroup = scene.getObjectByName('LShapeKitchenPlatform') as THREE.Group | null;
    const backCounter = platformGroup?.children.find((c) => c.name === 'Back Counter') as THREE.Mesh | undefined;
    if (!platformGroup || !backCounter) return;
    const p = (backCounter.geometry as THREE.BoxGeometry).parameters as any;
    const counterDepth = p.depth as number;
    const counterTopY = backCounter.position.y + (p.height as number) / 2;

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
        const scale = Math.min(targetW / Math.max(size.x, 0.0001), targetD / Math.max(size.z, 0.0001));
        model.scale.setScalar(scale);
        // Recompute bounds after scale
        const box2 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        model.position.sub(center);
        // Place on counter slightly inset from front edge
        model.position.x = 0;
        model.position.y = counterTopY + 0.005;
        model.position.z = counterDepth / 2 - targetD / 2 - 0.04;
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
    addBaseCabinetsUnderPlatform,
    addFullKitchenSetup,
    loadSinkModel,
    loadHandleModel,
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
