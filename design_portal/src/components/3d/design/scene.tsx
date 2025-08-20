// ThreeDView.ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { createGrid } from './grid-creator';

export interface ThreeDView {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  mount: HTMLDivElement | null;
  transformControls: TransformControls;
}

export const init3DDesign = (mount: HTMLDivElement): ThreeDView => {
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(1, 1, 1);
  camera.lookAt(0, 0, 0);

  // Initialize Sky
  const sky = new Sky();
  sky.scale.setScalar(450000); // Large scale to cover the scene
  scene.add(sky);

  // Set Sun Position (Affects Sky Gradient)
  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(80); // Adjust Elevation
  const theta = THREE.MathUtils.degToRad(0); // Adjust Azimuth
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);
  sky.material.uniforms['rayleigh'].value = 2; // Increase for a stronger blue gradient
  sky.material.uniforms['turbidity'].value = 2; // Lower for a flatter sky
  sky.material.uniforms['mieCoefficient'].value = 0.0001; // Reduce haze

  // Renderer with transparency
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  // Add Grid from GridCreator
  const gridSize = 1000;
  const gridDivisions = 1000;
  const grid = createGrid(gridSize, gridDivisions);
  scene.add(grid);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Stronger directional light
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.size = 0.3;
  transformControls.showY = false;
  transformControls.space = 'world';

  // Animation Loop
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // Resize Handler
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, controls, mount, transformControls };
};

export const cleanupThreeDView = (view: ThreeDView) => {
  window.removeEventListener('resize', () => {});
  if (view.mount && view.renderer.domElement) {
    view.mount.removeChild(view.renderer.domElement);
  }
};
