import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { ThreeDView } from '../interface';
import { createGrid } from './grid-creator';

export const init3DDesign = async (mount: HTMLDivElement): Promise<ThreeDView> => {
  const scene = new THREE.Scene();

  // Perspective Camera (3D)
  const perspectiveCamera = new THREE.PerspectiveCamera(
    80,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  perspectiveCamera.position.set(-3.0, 3.0, 3.0);
  perspectiveCamera.lookAt(0, 0, 0);

  // Orthographic Camera (2D)
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 10; // Adjust based on your scene scale
  const orthographicCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  orthographicCamera.position.set(0, 10, 0); // Top-down view
  orthographicCamera.lookAt(0, 0, 0);
  orthographicCamera.rotation.set(-Math.PI / 2, 0, 0); // Ensure correct orientation

  // Current active camera
  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspectiveCamera;

  // Initialize Day Sky
  const daySky = new Sky();
  daySky.scale.setScalar(450000);
  const daySun = new THREE.Vector3();
  const dayPhi = THREE.MathUtils.degToRad(60);
  const dayTheta = THREE.MathUtils.degToRad(0);
  daySun.setFromSphericalCoords(1, dayPhi, dayTheta);
  daySky.name = 'daysky';
  daySky.material.uniforms['sunPosition'].value.copy(daySun);
  daySky.material.uniforms['rayleigh'].value = 2;
  daySky.material.uniforms['turbidity'].value = 2;
  daySky.material.uniforms['mieCoefficient'].value = 0.0001;

  // Initialize Night Sky
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

  // Create Stars for Night Sky
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
  const stars = new THREE.Points(starGeometry, starMaterial);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  //Add grid
  const gridSize = 1000;
  const gridDivisions = 1000;
  const grid = createGrid(gridSize, gridDivisions);
  scene.add(grid);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(-3.0, 3.0, 3.0);
  scene.add(directionalLight);

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enableRotate = true;

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setSize(0.8); // Adjust gizmo size
  transformControls.space = 'world';
  scene.add(transformControls as unknown as THREE.Object3D);

  // Track transform mode
  let transformMode: 'translate' | 'rotate' | 'scale' = 'translate';
  transformControls.setMode(transformMode);

  // Keyboard event listener for mode switching
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 't') {
      transformMode = 'translate';
      transformControls.setMode('translate');
    } else if (event.key === 'r') {
      transformMode = 'rotate';
      transformControls.setMode('rotate');
    } else if (event.key === 's') {
      transformMode = 'scale';
      transformControls.setMode('scale');
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Disable OrbitControls during dragging
  transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });

  controls.target.set(0, 0, 0);

  // State variables
  let isDay = true;
  let isZoomMode = false;
  let overlayCanvas: HTMLCanvasElement | null = null;

  // Add initial day sky
  scene.add(daySky);

  // Toggle Sky Function
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

  // // Toggle 2D/3D Mode
  const toggle2DMode = (enable: boolean) => {
    if (enable) {
      // Switch to Orthographic Camera (2D)
      camera = orthographicCamera;
      controls.enableRotate = false; // Disable rotation in 2D mode
      controls.minZoom = 0.1; // Allow zooming out
      controls.maxZoom = 10; // Allow zooming in
      camera.position.set(0, 10, 0); // Top-down view
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      // Configure OrbitControls for 2D: both left and right clicks for panning
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.update();
      // Update transform controls to use orthographic camera
      transformControls.detach(); // Detach to avoid issues
      transformControls.camera = camera;
    } else {
      // Switch to Perspective Camera (3D)
      camera = perspectiveCamera;
      controls.enableRotate = true; // Re-enable rotation
      camera.position.set(0, 1, 4.5); // Reset to initial 3D position
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      // Restore default OrbitControls mouse buttons
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.update();
      // Update transform controls to use perspective camera
      transformControls.detach();
      transformControls.camera = camera;
    }
    // Update OrbitControls to use the new camera
    controls.object = camera;
    controls.update();
  };

  // Zoom Mode Toggle
  const toggleZoomMode = (enable: boolean) => {
    isZoomMode = enable;
    if (enable) {
      document.body.style.cursor = 'zoom-in';
      controls.enabled = false;
    } else {
      document.body.style.cursor = 'default';
      controls.enabled = true;
      if (overlayCanvas && overlayCanvas.parentNode) {
        overlayCanvas.parentNode.removeChild(overlayCanvas);
        overlayCanvas = null;
      }
    }
  };

  // Animation Loop
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // Resize Handler
  const handleResize = () => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = (frustumSize * aspect) / -2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
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
