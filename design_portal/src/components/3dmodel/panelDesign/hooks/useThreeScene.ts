import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CornerType, Hole, Point } from '../types';
import { buildThreeShape, createHolePath } from '../utils/geometryUtils';

/**
 * Manages a side-by-side Three.js 3D preview of the panel being designed.
 * Handles scene initialization, real-time geometry updates, material syncing,
 * and responsive canvas resizing.
 * 
 * @returns refs for the canvas and its container to be used in the UI.
 */
export function useThreeScene(
  shapePoints: Point[],
  defaultPanelPoints: Point[],
  cornerRadius: number[],
  cornerTypes: CornerType[],
  holes: Hole[],
  plankThickness: number,
  isRotated2D: boolean,
  state: any,
) {
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Persistent Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Memoized mapping function
  const getMappedPoint = useMemo(
    () => (p: Point) => (isRotated2D ? { x: -p.y, y: p.x } : p),
    [isRotated2D]
  );

  // Initialization Effect
  useEffect(() => {
    if (!threeCanvasRef.current || !containerRef.current) return;

    // 1. Scene & Lighting Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    sceneRef.current = scene;

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // 3. Camera & Controls Setup
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // 4. Animation Loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 5. Cleanup
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Sync / Update Effect
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Build Geometry
    const currentPoints = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    const mappedPoints = currentPoints.map(getMappedPoint);
    const mainShape = buildThreeShape(mappedPoints, cornerRadius, {}, 'shape');

    // Add holes using the utility
    holes.forEach((hole) => {
      const holePath = createHolePath(hole, getMappedPoint, isRotated2D);
      mainShape.holes.push(holePath);
    });

    const geometry = new THREE.ExtrudeGeometry(mainShape, {
      depth: plankThickness,
      bevelEnabled: false,
    });

    // 2. Center and Coordinate Geometry
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    // 3. Material Handling
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const globalScene = state?.scene?.scene;
    let material = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

    if (globalScene && selectedObject && selectedChildObject) {
      const selectedMesh = globalScene.children.find(
        (obj: any) => obj.userData?.objectId === selectedObject
      );
      const selectedChildMesh = selectedMesh?.children.find(
        (obj: any) => obj.userData?.objectId === selectedChildObject
      );
      if (selectedChildMesh instanceof THREE.Mesh) {
        material = selectedChildMesh.material.clone();
      }
    }

    // 4. Update or Create Mesh
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;
      meshRef.current.material = material;
    } else {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;
    }

    // 5. Auto-target Camera
    if (cameraRef.current && controlsRef.current) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      cameraRef.current.position.set(0, maxDim * 1.5, maxDim * 2);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [
    shapePoints,
    defaultPanelPoints,
    cornerRadius,
    cornerTypes,
    holes,
    plankThickness,
    isRotated2D,
    state?.scene?.scene,
    state?.data?.selectedObject,
    state?.data?.selectedChildObject,
    getMappedPoint,
  ]);

  // Resize Handling Effect
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        rendererRef.current?.setSize(width, height);
        if (cameraRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return { threeCanvasRef, containerRef };
}
