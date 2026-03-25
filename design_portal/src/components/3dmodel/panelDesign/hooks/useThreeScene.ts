import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { normalizeUVs } from '../../sceneCreator/utils';
import { CornerType, CurveControls, Hole, Point } from '../types';
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
  curveControls: CurveControls,
  plankThickness: number,
  isRotated2D: boolean,
  state: any
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

    let isCancelled = false;

    const buildGeometry = async () => {
      // 1. Build Geometry
      const currentPoints = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
      const mappedPoints = currentPoints.map(getMappedPoint);
      const mainShape = buildThreeShape(mappedPoints, cornerRadius, {}, 'shape', cornerTypes);

      // Add only non-slotting holes to main 2D profile
      holes.forEach((hole, index) => {
        if (hole.type !== 'slotting') {
          const holePath = createHolePath(hole, index, curveControls, getMappedPoint, isRotated2D);
          mainShape.holes.push(holePath);
        }
      });

      const geometry = new THREE.ExtrudeGeometry(mainShape, {
        depth: plankThickness,
        bevelEnabled: false,
        curveSegments: 32,
      });

      // 2. Center and Coordinate Geometry
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      let finalGeometry = geometry as THREE.BufferGeometry;

      const slottingHoles = holes.filter((h) => h.type === 'slotting');
      if (slottingHoles.length > 0) {
        const { Evaluator, Brush, SUBTRACTION } = await import('three-bvh-csg');
        const evaluator = new Evaluator();
        let resultBrush = new Brush(finalGeometry);
        resultBrush.updateMatrixWorld();

        for (const hole of slottingHoles) {
          const pocketDepth = hole.depth ?? 10;
          const originalIndex = holes.indexOf(hole);
          const holePath = createHolePath(
            hole,
            originalIndex,
            curveControls,
            getMappedPoint,
            isRotated2D
          );
          const plugShape = new THREE.Shape(holePath.getPoints());

          const plugGeom = new THREE.ExtrudeGeometry(plugShape, {
            depth: pocketDepth,
            bevelEnabled: false,
            curveSegments: 32,
          });

          // Translate to strictly overlap the front face (+thickness/2)
          plugGeom.translate(0, 0, plankThickness / 2 - pocketDepth);

          const holeBrush = new Brush(plugGeom);
          holeBrush.updateMatrixWorld();

          resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
        }

        finalGeometry = resultBrush.geometry;
        Object.setPrototypeOf(finalGeometry, THREE.ExtrudeGeometry.prototype);
        Object.defineProperty(finalGeometry, 'type', { value: 'ExtrudeGeometry' });
        (finalGeometry as any).parameters = geometry.parameters;
      }

      if (isCancelled) return;

      normalizeUVs(finalGeometry);

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
      let targetMesh: THREE.Mesh;
      if (meshRef.current) {
        targetMesh = meshRef.current;
        targetMesh.geometry.dispose();
        targetMesh.geometry = finalGeometry;
        targetMesh.material = material;
      } else {
        targetMesh = new THREE.Mesh(finalGeometry, material);
        targetMesh.rotation.x = Math.PI / 2;
        scene.add(targetMesh);
        meshRef.current = targetMesh;
      }

      // --- Cleanup Old Plugs ---
      const oldPlugs = targetMesh.children.filter((c) => c.name === 'slottingPlug');
      oldPlugs.forEach((p) => {
        targetMesh.remove(p);
        if (p instanceof THREE.Mesh) p.geometry.dispose();
      });

      // 5. Auto-target Camera
      if (cameraRef.current && controlsRef.current) {
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        cameraRef.current.position.set(0, maxDim * 1.5, maxDim * 2);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.target.set(0, 0, 0);
      }
    };

    buildGeometry();

    return () => {
      isCancelled = true;
    };
  }, [
    shapePoints,
    defaultPanelPoints,
    cornerRadius,
    cornerTypes,
    holes,
    curveControls,
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
