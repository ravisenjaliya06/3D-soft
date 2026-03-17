import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Point, Hole, CurveControls, CornerType } from '../types';
import { buildThreeShape } from '../utils/geometryUtils';

export function useThreeScene(
  shapePoints: Point[],
  defaultPanelPoints: Point[],
  cornerRadius: number[],
  cornerTypes: CornerType[],
  holes: Hole[],
  plankThickness: number,
  isRotated2D: boolean,
  state: any,
  activeTab: string
) {
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const globalScene = state?.scene?.scene;

    if (!threeCanvasRef.current || !globalScene) return;

    const localScene = new THREE.Scene();
    localScene.background = new THREE.Color(0xffffff);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    localScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 7.5);
    localScene.add(directionalLight);

    const currentPoints = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    const mainShape = buildThreeShape(
      currentPoints,
      cornerRadius,
      cornerTypes,
      {}, // curveControls - can be passed if needed
      'shape'
    );

    holes.forEach((hole, hIdx) => {
      if (hole.type === 'rect') {
        const holePath = new THREE.Path();
        holePath.moveTo(hole.x, hole.y);
        holePath.lineTo(hole.x + hole.width, hole.y);
        holePath.lineTo(hole.x + hole.width, hole.y + hole.height);
        holePath.lineTo(hole.x, hole.y + hole.height);
        holePath.closePath();
        mainShape.holes.push(holePath);
      } else if (hole.type === 'circle') {
        const radius = Math.min(hole.width, hole.height) / 2;
        const holePath = new THREE.Path();
        holePath.absarc(hole.x + hole.width / 2, hole.y + hole.height / 2, radius, 0, Math.PI * 2, true);
        mainShape.holes.push(holePath);
      } else if (hole.type === 'polygon' && hole.points) {
        const holeShapeObj = buildThreeShape(
          hole.points,
          hole.cornerRadius || new Array(hole.points.length).fill(0),
          hole.cornerTypes,
          {},
          `hole_${hIdx}`
        );
        const holePath = new THREE.Path(holeShapeObj.getPoints());
        mainShape.holes.push(holePath);
      } else if (hole.type === 'slotting') {
        const r = Math.min(hole.width, hole.height) / 2;
        const holePath = new THREE.Path();
        holePath.moveTo(hole.x + r, hole.y);
        holePath.lineTo(hole.x + hole.width - r, hole.y);
        holePath.absarc(hole.x + hole.width - r, hole.y + r, r, -Math.PI / 2, 0, false);
        holePath.lineTo(hole.x + hole.width, hole.y + hole.height - r);
        holePath.absarc(hole.x + hole.width - r, hole.y + hole.height - r, r, 0, Math.PI / 2, false);
        holePath.lineTo(hole.x + r, hole.y + hole.height);
        holePath.absarc(hole.x + r, hole.y + hole.height - r, r, Math.PI / 2, Math.PI, false);
        holePath.lineTo(hole.x, hole.y + r);
        holePath.absarc(hole.x + r, hole.y + r, r, Math.PI, Math.PI * 1.5, false);
        mainShape.holes.push(holePath);
      }
    });

    const extrudeSettings = {
      depth: plankThickness,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(mainShape, extrudeSettings);

    const selectedMesh = globalScene.children.find((obj: any) => obj.userData?.objectId === selectedObject);
    const selectedChildMesh = selectedMesh?.children.find(
      (obj: any) => obj.userData?.objectId === selectedChildObject
    );

    const material = (selectedChildMesh instanceof THREE.Mesh)
      ? selectedChildMesh.material
      : new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    if (isRotated2D) mesh.rotation.z = Math.PI / 2;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    mesh.position.sub(center);

    localScene.add(mesh);

    const width = containerRef.current?.clientWidth || 300;
    const height = containerRef.current?.clientHeight || 200;

    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    const maxDim = Math.max(size.x, size.y, size.z);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, maxDim * 0.5, maxDim * 1.5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const animate = () => {
      const frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(localScene, camera);
      return frame;
    };
    const frameId = animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      controls.dispose();
      geometry.dispose();
    };
  }, [
    state?.scene?.scene,
    state?.data?.selectedObject,
    state?.data?.selectedChildObject,
    activeTab,
    holes,
    shapePoints,
    cornerRadius,
    cornerTypes,
    plankThickness,
    isRotated2D
  ]);

  return { threeCanvasRef, containerRef };
}
