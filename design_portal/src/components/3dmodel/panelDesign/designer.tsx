import { assets } from '@/svgPaths';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Circle, Layer, Line, Path, Rect, Stage, Transformer, Text as KonvaText } from 'react-konva';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { detectPlankByBoundingBox } from '../../utils/plankUtils';
import { RootState } from '../store';
import styles from './panelDesign.module.css';

interface PanelDesignerProps {
  state: RootState;
}

export default function PanelDesigner({ state }: PanelDesignerProps) {
  const router = useRouter();
  const designId = window.location.pathname.split('/')[2];
  const stageRef = useRef<Konva.Stage | null>(null);
  const panelRef = useRef<Konva.Rect | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [selectedShapeName] = useState<string | null>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [panelWidth, setpanelWidth] = useState(0);
  const [panelHeight, setpanelHeight] = useState(0);
  const [panel] = useState({
    x: 0,
    y: 0,
    width: 349,
    height: 1960,
  });
  const [dimensions] = useState({
    x: panel.x,
    y: panel.y,
    width: panel.width,
    height: panel.height,
  });
  const [shapePoints, setShapePoints] = useState<{ x: number; y: number }[]>([]);
  const [cornerRadius, setcornerRadius] = useState<number[]>([]);
  const [cornerTypes, setCornerTypes] = useState<('default' | 'round' | 'chamfer' | 'cut-round')[]>([]);
  const [originalGeometry, setOriginalGeometry] = useState<THREE.BoxGeometry | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [holes, setHoles] = useState<
    {
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'rect' | 'circle' | 'polygon' | 'slotting';
      points?: { x: number; y: number }[];
      cornerRadius?: number[];
      cornerTypes?: ('default' | 'round' | 'chamfer' | 'cut-round')[];
      lineTypes?: ('linear' | 'arc')[];
      lineRadii?: number[];
      id?: string;
    }[]
  >([]);
  const [plankThickness, setPlankThickness] = useState(18);
  const [selectedHoleIndex, setSelectedHoleIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [hoveredHoleIndex, setHoveredHoleIndex] = useState<number | null>(null);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'3D' | 'Drawing'>('Drawing');
  const [previewPos, setPreviewPos] = useState({ x: window.innerWidth - 350, y: 110 });
  const [drawingPos, setDrawingPos] = useState({ x: window.innerWidth - 350, y: 400 });
  const [isRotated2D, setIsRotated2D] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [isDraggingDrawing, setIsDraggingDrawing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDrawingHole, setIsDrawingHole] = useState(false);
  const [newHoleStart, setNewHoleStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tempHole, setTempHole] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rect' | 'circle' | 'polygon' | 'slotting';
    points?: { x: number; y: number }[];
    id?: string;
  } | null>(null);
  const [holeShape, setHoleShape] = useState<'rect' | 'circle' | 'polygon' | 'slotting'>('rect');

  const [selectedCornerIndex, setSelectedCornerIndex] = useState<number | null>(null);
  const [showRadiusInput, setShowRadiusInput] = useState(false);

  // New Pen Tool & Curve Tool States
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [activeCurveDragKey, setActiveCurveDragKey] = useState<string | null>(null);
  const [curveControls, setCurveControls] = useState<Record<string, { x: number, y: number }>>({});
  const [snappingGuides, setSnappingGuides] = useState<{ type: 'x' | 'y', value: number }[]>([]);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<{ prefix: string, index: number } | null>(null);


  // Initialize corner radii when shapePoints change
  useEffect(() => {
    const numPoints = shapePoints.length || 4;
    if (cornerRadius.length !== numPoints) {
      setcornerRadius(Array(numPoints).fill(0));
    }
    if (cornerTypes.length !== numPoints) {
      setCornerTypes(Array(numPoints).fill('default'));
    }
  }, [shapePoints]);

  // Auto-zoom to fit plank in view on initialization
  useEffect(() => {
    if (panelWidth > 0 && panelHeight > 0 && stageSize.width > 0 && stageSize.height > 0) {
      const padding = 50;
      const availableWidth = stageSize.width - padding * 2;
      const availableHeight = stageSize.height - padding * 2;
      
      const scaleX = availableWidth / panelWidth;
      const scaleY = availableHeight / panelHeight;
      const newScale = Math.min(scaleX, scaleY, 1.0); // Fit but don't over-zoom small planks
      
      setStageScale(newScale);
      setStagePosition({
        x: stageSize.width / 2,
        y: stageSize.height / 2
      });
    }
  }, [panelWidth, panelHeight, stageSize.width, stageSize.height]);

  // Detect plank dimensions from the scene state
  useEffect(() => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const scene = state?.scene?.scene;
    if (!scene) return;

    const selectedMesh = scene.children.find((obj) => obj.userData?.objectId === selectedObject);
    const selectedChildMesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject
    );

    if (!(selectedChildMesh instanceof THREE.Mesh)) return;

    if (selectedChildMesh.geometry) {
      setOriginalGeometry(selectedChildMesh.geometry);

      const plankInfo = detectPlankByBoundingBox(selectedChildMesh);
      const { size, thicknessAxis } = plankInfo;
      const currentThickness = size[thicknessAxis];

      let w = 0;
      let h = 0;

      if (thicknessAxis === 'y') {
        w = size.x;
        h = size.z;
      } else if (thicknessAxis === 'x') {
        w = size.z;
        h = size.y;
      } else {
        w = size.x;
        h = size.y;
      }

      const pW = w;
      const pH = h;

      if (pH > pW) {
        setpanelWidth(pH);
        setpanelHeight(pW);
        setIsRotated2D(true);
      } else {
        setpanelWidth(pW);
        setpanelHeight(pH);
        setIsRotated2D(false);
      }

      setPlankThickness(currentThickness);
    }
  }, [state?.scene?.scene, state?.data?.selectedObject, state?.data?.selectedChildObject]);

  // Initialize 3D renderer with local scene and lighting
  useEffect(() => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const globalScene = state?.scene?.scene;

    if (!threeCanvasRef.current || !globalScene) return;

    // Create a local scene for the mini-viewer
    const localScene = new THREE.Scene();
    localScene.background = new THREE.Color(0xffffff);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    localScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 7.5);
    localScene.add(directionalLight);

    // Create the geometry from local state
    const currentPoints = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    const mainShape = buildThreeShape(
      currentPoints,
      cornerRadius,
      cornerTypes,
      'shape'
    );

    // Add holes
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
          `hole_${hIdx}`
        );
        // Path/Shape both work for holes, but we need to convert points to Path
        const holePath = new THREE.Path(holeShapeObj.getPoints());
        mainShape.holes.push(holePath);
      } else if (hole.type === 'slotting') {
        const r = Math.min(hole.width, hole.height) / 2;
        const holePath = new THREE.Path();
        // Simplified slotting as rounded rect
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
    
    // Find material from global scene if available
    const selectedMesh = globalScene.children.find((obj) => obj.userData?.objectId === selectedObject);
    const selectedChildMesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject
    );

    const material = (selectedChildMesh instanceof THREE.Mesh) 
      ? selectedChildMesh.material 
      : new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2; // Orient correctly
    if (isRotated2D) mesh.rotation.z = Math.PI / 2;

    // Center the mesh
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
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(localScene, camera);
    };
    animate();

    return () => {
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
    curveControls,
    cornerRadius,
    cornerTypes,
    plankThickness,
    isRotated2D
  ]);

  const defaultPanelPoints = [
    { x: -panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: panelHeight / 2 },
    { x: -panelWidth / 2, y: panelHeight / 2 },
  ];

  const getAllPoints = () => {
    let allPoints: { x: number, y: number }[] = [];
    if (shapePoints.length > 0) allPoints.push(...shapePoints);
    else allPoints.push(...defaultPanelPoints);

    holes.forEach(h => {
      if (h.type === 'polygon' && h.points) {
        allPoints.push(...h.points);
      }
    });
    return allPoints;
  };

  const SNAP_TOLERANCE = 15;

  const getSnappedPosition = (x: number, y: number, ignoreSelf?: { x: number, y: number }) => {
    let snappedX = x;
    let snappedY = y;
    let guides: { type: 'x' | 'y', value: number }[] = [];

    const allPoints = getAllPoints();
    if (currentDrawingPoints.length > 0) {
      allPoints.push(...currentDrawingPoints);
    }

    let snappedToX = false;
    let snappedToY = false;

    for (const p of allPoints) {
      if (ignoreSelf && p.x === ignoreSelf.x && p.y === ignoreSelf.y) continue;

      if (!snappedToX && Math.abs(p.x - x) < SNAP_TOLERANCE / stageScale) {
        snappedX = p.x;
        guides.push({ type: 'x', value: p.x });
        snappedToX = true;
      }
      if (!snappedToY && Math.abs(p.y - y) < SNAP_TOLERANCE / stageScale) {
        snappedY = p.y;
        guides.push({ type: 'y', value: p.y });
        snappedToY = true;
      }
    }
    return { snappedX, snappedY, guides };
  };

  const updateMeshGeometry = (
    points: { x: number; y: number }[],
    holes: any[],
    cornerRadius: number[],
    curves: Record<string, { x: number, y: number }> = {}
  ) => {
    /** Updates the geometry of the selected mesh based on points, holes, and corner radiuses. */

    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const scene = state?.scene?.scene;

    if (!scene || !selectedObject || !selectedChildObject) return;

    const selectedMesh = scene.children.find((obj) => obj.userData?.objectId === selectedObject);
    const selectedChildMesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject
    );

    if (!(selectedChildMesh instanceof THREE.Mesh)) return;

    const shape = new THREE.Shape();
    const n = points.length;

    // Mapping logic: If rotated for 2D, we must rotate back to 3D orientation
    const getMappedPoint = (p: { x: number, y: number }) => {
      if (isRotated2D) {
        // Rotated 90deg CW: (x, y) -> (-y, x)
        return { x: -p.y, y: p.x };
      }
      return p;
    };

    const getTangents = (i: number) => {
      const p0 = getMappedPoint(points[(i - 1 + n) % n]);
      const p1 = getMappedPoint(points[i]);
      const p2 = getMappedPoint(points[(i + 1) % n]);
      const r = cornerRadius[i] || 0;

      if (r <= 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          center: { x: p1.x, y: p1.y },
          start_angle: 0,
          end_angle: 0,
          det: 0,
        };
      }

      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let len = Math.hypot(dx, dy);
      const u_in_x = dx / len;
      const u_in_y = dy / len;

      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      len = Math.hypot(dx, dy);
      const u_out_x = dx / len;
      const u_out_y = dy / len;

      const dot = u_in_x * u_out_x + u_in_y * u_out_y;
      const alpha = Math.acos(Math.max(-1, Math.min(1, dot)));

      const det = u_in_x * u_out_y - u_in_y * u_out_x;
      if (det <= 0 || alpha === 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          center: { x: p1.x, y: p1.y },
          start_angle: 0,
          end_angle: 0,
          det: det,
        };
      }

      const half_alpha = alpha / 2;
      const tan_half = Math.tan(half_alpha);
      let l = r * tan_half;

      const len_prev = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const len_next = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (l > len_prev / 2 || l > len_next / 2) {
        l = Math.min(len_prev / 2, len_next / 2);
      }

      const tp_in_x = p1.x - u_in_x * l;
      const tp_in_y = p1.y - u_in_y * l;
      const tp_out_x = p1.x + u_out_x * l;
      const tp_out_y = p1.y + u_out_y * l;

      const n_in_x = -u_in_y;
      const n_in_y = u_in_x;
      const n_out_x = -u_out_y;
      const n_out_y = u_out_x;

      let bis_x = n_in_x + n_out_x;
      let bis_y = n_in_y + n_out_y;
      len = Math.hypot(bis_x, bis_y);
      bis_x /= len;
      bis_y /= len;

      const sin_half = Math.sin(half_alpha);
      const d = r / sin_half;

      const center_x = p1.x + bis_x * d;
      const center_y = p1.y + bis_y * d;

      let vec_x = tp_in_x - center_x;
      let vec_y = tp_in_y - center_y;
      const start_angle = Math.atan2(vec_y, vec_x);

      vec_x = tp_out_x - center_x;
      vec_y = tp_out_y - center_y;
      let end_angle = Math.atan2(vec_y, vec_x);
      if (end_angle < start_angle) end_angle += 2 * Math.PI;

      return {
        tp_in: { x: tp_in_x, y: tp_in_y },
        tp_out: { x: tp_out_x, y: tp_out_y },
        center: { x: center_x, y: center_y },
        start_angle,
        end_angle,
        det,
      };
    };

    const tangents0 = getTangents(0);
    shape.moveTo(tangents0.tp_out.x, tangents0.tp_out.y);

    for (let i = 1; i <= n; i++) {
      const j = i % n;
      const prevJ = (i - 1 + n) % n;
      const tangents = getTangents(j);

      const ctrl = curves[`shape_${prevJ}`];
      if (ctrl) {
        shape.quadraticCurveTo(ctrl.x, ctrl.y, tangents.tp_in.x, tangents.tp_in.y);
      } else {
        shape.lineTo(tangents.tp_in.x, tangents.tp_in.y);
      }

      const r = cornerRadius[j] || 0;
      const type = cornerTypes[j] || 'default';

      if (r > 0) {
        if (type === 'round') {
          shape.absarc(
            tangents.center.x,
            tangents.center.y,
            r,
            tangents.start_angle,
            tangents.end_angle,
            false
          );
        } else if (type === 'chamfer') {
          shape.lineTo(tangents.tp_out.x, tangents.tp_out.y);
        } else if (type === 'cut-round') {
          // Inverted arc: sweep in opposite direction or different center?
          // Usually cut-round means the circle center is at p1 (the original corner point)
          // and we draw an arc from tp_in to tp_out.
          const p1 = points[j];
          shape.absarc(p1.x, p1.y, r, tangents.start_angle + Math.PI, tangents.end_angle + Math.PI, true);
        }
      }
    }

    // === ADD HOLES ===
    holes.forEach((hole, hIdx) => {
      if (hole.type === 'circle') {
        const radiusX = hole.width / 2;
        const radiusY = hole.height / 2;
        const c3d = getMappedPoint({ x: hole.x + radiusX, y: hole.y + radiusY });

        const circlePath = new THREE.Path();
        if (isRotated2D) {
          // If rotated, swap radii
          circlePath.absellipse(c3d.x, c3d.y, radiusY, radiusX, 0, Math.PI * 2, false);
        } else {
          circlePath.absellipse(c3d.x, c3d.y, radiusX, radiusY, 0, Math.PI * 2, false);
        }
        shape.holes.push(circlePath);
      } else if (hole.type === 'slotting') {
        const r = Math.min(hole.width, hole.height) / 2;
        const holePath = new THREE.Path();
        
        // Map corners to 3D
        const p1 = getMappedPoint({ x: hole.x, y: hole.y });
        const p2 = getMappedPoint({ x: hole.x + hole.width, y: hole.y + hole.height });
        
        const x3d = Math.min(p1.x, p2.x);
        const y3d = Math.min(p1.y, p2.y);
        const w3d = Math.abs(p2.x - p1.x);
        const h3d = Math.abs(p2.y - p1.y);

        holePath.moveTo(x3d + r, y3d);
        holePath.lineTo(x3d + w3d - r, y3d);
        holePath.absarc(x3d + w3d - r, y3d + r, r, Math.PI * 1.5, 0, false);
        holePath.lineTo(x3d + w3d, y3d + h3d - r);
        holePath.absarc(x3d + w3d - r, y3d + h3d - r, r, 0, Math.PI * 0.5, false);
        holePath.lineTo(x3d + r, y3d + h3d);
        holePath.absarc(x3d + r, y3d + h3d - r, r, Math.PI * 0.5, Math.PI, false);
        holePath.lineTo(x3d, y3d + r);
        holePath.absarc(x3d + r, y3d + r, r, Math.PI, Math.PI * 1.5, false);
        shape.holes.push(holePath);
      } else if (hole.type === 'rect') {
        const hp1 = getMappedPoint({ x: hole.x, y: hole.y });
        const hp2 = getMappedPoint({ x: hole.x + hole.width, y: hole.y + hole.height });
        
        const hminX = Math.min(hp1.x, hp2.x);
        const hmaxX = Math.max(hp1.x, hp2.x);
        const hminY = Math.min(hp1.y, hp2.y);
        const hmaxY = Math.max(hp1.y, hp2.y);

        const holePath = new THREE.Path();
        holePath.moveTo(hminX, hminY);
        holePath.lineTo(hmaxX, hminY);
        holePath.lineTo(hmaxX, hmaxY);
        holePath.lineTo(hminX, hmaxY);
        holePath.lineTo(hminX, hminY);
        shape.holes.push(holePath);
      } else if (hole.type === 'polygon' && hole.points) {
        const hp = hole.points;
        const hn = hp.length;
        if (hn > 2) {
          const holePath = new THREE.Path();
          const pStart = getMappedPoint(hp[0]);
          holePath.moveTo(pStart.x, pStart.y);

          // Fix winding and mapping
          let area = 0;
          for (let i = 0; i < hn; i++) {
            const p1 = getMappedPoint(hp[i]);
            const p2 = getMappedPoint(hp[(i + 1) % hn]);
            area += (p2.x - p1.x) * (p2.y + p1.y);
          }

          const isCCW = area < 0;

          if (isCCW) {
            for (let i = hn - 1; i >= 0; i--) {
              const p = getMappedPoint(hp[i]);
              const prevJ = (i + 1) % hn;
              const ctrlCurveKey = `hole_${hIdx}_${i}`;
              const ctrlRaw = curves[ctrlCurveKey];
              const ctrl = ctrlRaw ? getMappedPoint(ctrlRaw) : null;

              if (ctrl) {
                holePath.quadraticCurveTo(ctrl.x, ctrl.y, p.x, p.y);
              } else {
                holePath.lineTo(p.x, p.y);
              }
            }
          } else {
            for (let i = 1; i <= hn; i++) {
              const j = i % hn;
              const p = getMappedPoint(hp[j]);
              const prevJ = (i - 1 + hn) % hn;
              const ctrlRaw = curves[`hole_${hIdx}_${prevJ}`];
              const ctrl = ctrlRaw ? getMappedPoint(ctrlRaw) : null;
              if (ctrl) {
                holePath.quadraticCurveTo(ctrl.x, ctrl.y, p.x, p.y);
              } else {
                holePath.lineTo(p.x, p.y);
              }
            }
          }
          shape.holes.push(holePath);
        }
      }
    });

    let staticDirectionValue = 18;

    if (originalGeometry) {
      // Use cached plank info if available, or re-detect
      const plankInfo = detectPlankByBoundingBox(selectedChildMesh);
      const { size, thicknessAxis } = plankInfo;

      staticDirectionValue = size[thicknessAxis];
      if (plankThickness !== staticDirectionValue) setPlankThickness(staticDirectionValue);

      if (thicknessAxis === 'y') {
        // HORIZONTAL: Rotate X 90deg
        selectedChildMesh.rotation.x = Math.PI / 2;
        selectedChildMesh.rotation.y = 0;
        selectedChildMesh.rotation.z = 0;
      } else if (thicknessAxis === 'x') {
        // VERTICAL: Rotate Y 90deg
        selectedChildMesh.rotation.x = 0;
        selectedChildMesh.rotation.y = Math.PI / 2;
        selectedChildMesh.rotation.z = 0;
      } else {
        // BACK/FRONT (z): No rotation (Logic: Draw locally X-Y, extrude Z)
        // Check if we need rotation? Usually Back Panel is in X-Y plane.
        selectedChildMesh.rotation.x = 0;
        selectedChildMesh.rotation.y = 0;
        selectedChildMesh.rotation.z = 0;
      }

      if (!selectedChildMesh.userData.isPerfect) {
        selectedChildMesh.userData.isPerfect = true;
      }
    } else {
      console.warn('originalGeometry is not defined');
    }

    const extrudeSettings = {
      depth: staticDirectionValue,
      bevelEnabled: false,
    };

    const newGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    newGeometry.userData.oldGeometry = originalGeometry;

    selectedChildMesh.geometry.dispose();
    selectedChildMesh.geometry = newGeometry;
    selectedChildMesh.material = selectedChildMesh.material.clone();
  };

  useEffect(() => {
    const points = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    updateMeshGeometry(points, holes, cornerRadius, curveControls);
  }, [shapePoints, holes, cornerRadius, defaultPanelPoints, updateMeshGeometry, curveControls]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const selectedNode = panelRef.current;

    if (transformer && selectedShapeName === 'panel' && selectedNode) {
      transformer.nodes([selectedNode]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedShapeName]);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight - 85; // Header (60) + SubToolbar (35) + Footer (25)? No, Header+SubToolbar is 95. Footer 25. 95+25=120? 
      // Actually CSS says header 60, subToolbar 35, footer 25. Total non-canvas height = 120.
      setStageSize({ width, height: window.innerHeight - 120 });
      setStagePosition({ x: width / 2, y: (window.innerHeight - 120) / 2 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPreview) {
        setPreviewPos(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      } else if (isDraggingDrawing) {
        setDrawingPos(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      }
    };
    const handleMouseUp = () => {
      setIsDraggingPreview(false);
      setIsDraggingDrawing(false);
    };

    if (isDraggingPreview || isDraggingDrawing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPreview, isDraggingDrawing]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    /** Handles mouse wheel zooming for the Konva stage with position and scale adjustments. */

    e.evt.preventDefault();
    const stage = stageRef.current;
    const scaleBy = 1.05;
    const oldScale = stageScale;
    const pointer = stage?.getPointerPosition();
    const x = pointer?.x ? pointer.x : 0;
    const y = pointer?.y ? pointer.y : 0;

    const mousePointTo = {
      x: (x - stagePosition.x) / oldScale,
      y: (y - stagePosition.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const newPos = {
      x: x - mousePointTo.x * newScale,
      y: y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  const renderHorizontalRuler = () => {
    /** Renders the horizontal ruler with tick marks and distance labels for the editor view. */

    const ticks = [];
    const tickSpacing = 100;
    const viewWidth = stageSize.width;
    const offset = stagePosition.x;
    const scale = stageScale;
    const totalTicks = Math.ceil(viewWidth / (tickSpacing * scale)) * 2;

    for (let i = -totalTicks; i < totalTicks; i++) {
      const x = i * tickSpacing * scale + offset;

      ticks.push(
        <div
          key={`h-tick-${i}`}
          className={styles.tickLine}
          style={{
            left: `${x}px`,
            top: 0,
            width: '1px',
            height: '10px',
          }}
        />
      );

      ticks.push(
        <div
          key={`h-label-${i}`}
          className={styles.tickLabel}
          style={{
            left: `${x - 2}px`,
            top: '10px',
          }}
        >
          {i * tickSpacing}
        </div>
      );
    }

    return <div className={styles.rulerHorizontal} style={{ top: activeTool === 'Dig' ? '95px' : '60px' }}>{ticks}</div>;
  };

  const renderVerticalRuler = () => {
    /** Renders the vertical ruler with tick marks and distance labels for the editor view. */

    const ticks = [];
    const tickSpacing = 100;
    const viewHeight = stageSize.height;
    const offset = stagePosition.y;
    const scale = stageScale;
    const totalTicks = Math.ceil(viewHeight / (tickSpacing * scale)) * 2;

    for (let i = -totalTicks; i < totalTicks; i++) {
      const y = i * tickSpacing * scale + offset;

      ticks.push(
        <div
          key={`v-tick-${i}`}
          className={styles.tickLine}
          style={{
            top: `${y}px`,
            left: 0,
            width: '10px',
            height: '1px',
          }}
        />
      );

      ticks.push(
        <div
          key={`v-label-${i}`}
          className={styles.tickLabel}
          style={{
            top: `${y - 2}px`,
            left: '10px',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {i * tickSpacing}
        </div>
      );
    }

    return <div className={styles.rulerVertical} style={{ top: activeTool === 'Dig' ? '120px' : '85px' }}>{ticks}</div>;
  };

  const handleCancel = () => {
    /** Opens a confirmation dialog before exiting the current editor or panel view. */

    setShowConfirmExit(true);
  };

  const confirmExit = () => {
    /** Confirms the exit action and redirects the user to the design view page. */

    router.push(`/design/${designId}`);
  };

  const closeModal = () => {
    /** Closes the confirmation modal without exiting the current editor. */

    setShowConfirmExit(false);
  };

  const handleComplete = () => {
    if (!designId) {
      console.warn('designId missing');
      return;
    }

    router.push(`/design/${designId}`);
  };

  const tools = [
    { name: 'Undo', icon: assets.undo },
    { name: 'Redo', icon: assets.redo },
    { name: 'Draw the outline of the board', icon: assets.pencil },
    { name: 'Dig', icon: assets.dig, subTools: ['rect', 'polygon', 'circle', 'slotting'] },
    { name: 'Curve', icon: assets.curve },

  ];

  const buildPathData = (points: { x: number; y: number }[], cornerRadius: number[], cornerTypesArr?: string[], prefix: string = 'shape') => {
    /** Builds an SVG-style path string with rounded corners from shape points and corner radiuses. */

    const n = points.length;
    if (n < 3) return '';

    const getTangents = (i: number) => {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const r = cornerRadius[i] || 0;

      if (r <= 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          det: 0,
        };
      }

      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let len = Math.hypot(dx, dy);
      const u_in_x = dx / len;
      const u_in_y = dy / len;

      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      len = Math.hypot(dx, dy);
      const u_out_x = dx / len;
      const u_out_y = dy / len;

      const dot = u_in_x * u_out_x + u_in_y * u_out_y;
      const alpha = Math.acos(Math.max(-1, Math.min(1, dot)));

      const det = u_in_x * u_out_y - u_in_y * u_out_x;
      if (det <= 0 || alpha === 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          det,
        };
      }

      const half_alpha = alpha / 2;
      const tan_half = Math.tan(half_alpha);
      let l = r * tan_half;

      const len_prev = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const len_next = Math.hypot(p2.x - p1.x, p1.y - p2.y);
      if (l > len_prev / 2 || l > len_next / 2) {
        l = Math.min(len_prev / 2, len_next / 2);
      }

      const tp_in_x = p1.x - u_in_x * l;
      const tp_in_y = p1.y - u_in_y * l;
      const tp_out_x = p1.x + u_out_x * l;
      const tp_out_y = p1.y + u_out_y * l;

      return {
        tp_in: { x: tp_in_x, y: tp_in_y },
        tp_out: { x: tp_out_x, y: tp_out_y },
        det,
      };
    };

    const tangents0 = getTangents(0);
    let path = `M ${tangents0.tp_out.x} ${tangents0.tp_out.y}`;

    for (let i = 1; i <= n; i++) {
      const j = i % n;
      const prevJ = (i - 1 + n) % n;
      const tangents = getTangents(j);

      const ctrl = curveControls[`${prefix}_${prevJ}`];
      if (ctrl) {
        path += ` Q ${ctrl.x} ${ctrl.y} ${tangents.tp_in.x} ${tangents.tp_in.y}`;
      } else {
        path += ` L ${tangents.tp_in.x} ${tangents.tp_in.y}`;
      }

      const r = cornerRadius[j] || 0;
      const type = (cornerTypesArr && cornerTypesArr[j]) || 'default';
      if (r > 0) {
        if (type === 'round') {
          path += ` A ${r} ${r} 0 0 1 ${tangents.tp_out.x} ${tangents.tp_out.y}`;
        } else if (type === 'chamfer') {
          path += ` L ${tangents.tp_out.x} ${tangents.tp_out.y}`;
        } else if (type === 'cut-round') {
          // Inverted arc for cut-round
          path += ` A ${r} ${r} 0 0 0 ${tangents.tp_out.x} ${tangents.tp_out.y}`;
        }
      }
    }

    path += ' Z';
    return path;
  };

  const buildThreeShape = (points: { x: number; y: number }[], cornerRadius: number[], cornerTypesArr?: string[], prefix: string = 'shape') => {
    const n = points.length;
    if (n < 3) return new THREE.Shape();

    const shape = new THREE.Shape();

    const getTangents = (i: number) => {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const r = cornerRadius[i] || 0;

      if (r <= 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          det: 0,
        };
      }

      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let len = Math.hypot(dx, dy);
      const u_in_x = dx / len;
      const u_in_y = dy / len;

      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      len = Math.hypot(dx, dy);
      const u_out_x = dx / len;
      const u_out_y = dy / len;

      const dot = u_in_x * u_out_x + u_in_y * u_out_y;
      const alpha = Math.acos(Math.max(-1, Math.min(1, dot)));
      const det = u_in_x * u_out_y - u_in_y * u_out_x;

      if (det <= 0 || alpha === 0) {
        return {
          tp_in: { x: p1.x, y: p1.y },
          tp_out: { x: p1.x, y: p1.y },
          det,
        };
      }

      const half_alpha = alpha / 2;
      const tan_half = Math.tan(half_alpha);
      let l = r * tan_half;

      const len_prev = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const len_next = Math.hypot(p2.x - p1.x, p1.y - p2.y);
      if (l > len_prev / 2 || l > len_next / 2) {
        l = Math.min(len_prev / 2, len_next / 2);
      }

      const tp_in_x = p1.x - u_in_x * l;
      const tp_in_y = p1.y - u_in_y * l;
      const tp_out_x = p1.x + u_out_x * l;
      const tp_out_y = p1.y + u_out_y * l;

      return {
        tp_in: { x: tp_in_x, y: tp_in_y },
        tp_out: { x: tp_out_x, y: tp_out_y },
        det,
      };
    };

    const tangents0 = getTangents(0);
    shape.moveTo(tangents0.tp_out.x, tangents0.tp_out.y);

    for (let i = 1; i <= n; i++) {
      const j = i % n;
      const prevJ = (i - 1 + n) % n;
      const tangents = getTangents(j);

      const ctrl = curveControls[`${prefix}_${prevJ}`];
      if (ctrl) {
        shape.quadraticCurveTo(ctrl.x, ctrl.y, tangents.tp_in.x, tangents.tp_in.y);
      } else {
        shape.lineTo(tangents.tp_in.x, tangents.tp_in.y);
      }

      const r = cornerRadius[j] || 0;
      const type = (cornerTypesArr && cornerTypesArr[j]) || 'default';
      if (r > 0) {
        if (type === 'round') {
          // Approximate arc with quadratic curve or use .absarc if we calculated center
          // For simplicity in sync with buildPathData, lineTo tp_out for now or use moveTo/lineTo
          // Actually THREE.Shape has no direct 'A' equivalent without center, so we'll lineTo
          // to maintain sync with the visual "one step ahead" logic.
          shape.lineTo(tangents.tp_out.x, tangents.tp_out.y); 
        } else {
          shape.lineTo(tangents.tp_out.x, tangents.tp_out.y);
        }
      }
    }

    return shape;
  };

  const handleCurveClick = (index: number) => {
    /** Handles user clicks on corner points to enable radius input editing. */

    setSelectedCornerIndex(index);
    setShowRadiusInput(true);
  };

  const renderRadiusInput = () => {
    /** Renders an input box overlay for editing the corner radius of a selected vertex. */

    if (!showRadiusInput || selectedCornerIndex === null) return null;

    const points = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    const point = points[selectedCornerIndex];

    const stageContainer = stageRef.current?.container();
    if (!stageContainer) return null;

    const rect = stageContainer.getBoundingClientRect();
    const screenX = rect.left + (point.x * stageScale + stagePosition.x);
    const screenY = rect.top + (point.y * stageScale + stagePosition.y);

    return (
      <div
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY + 10}px`,
          zIndex: 10,
          background: 'white',
          padding: '5px',
          border: '1px solid black',
          borderRadius: '4px',
        }}
      >
        <label>Radius:</label>
        <input
          type="number"
          min="0"
          value={cornerRadius[selectedCornerIndex] || 0}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            const newRadii = [...cornerRadius];
            newRadii[selectedCornerIndex] = val;
            setcornerRadius(newRadii);
          }}
          autoFocus
        />
        <button onClick={() => setShowRadiusInput(false)}>OK</button>
      </div>
    );
  };

  const renderPreviewSidebar = () => {
    return (
      <div 
        className={styles.sidebar}
        style={{ left: previewPos.x, top: previewPos.y, height: '260px' }}
      >
        <div className={styles.panelHeader} onMouseDown={() => setIsDraggingPreview(true)}>
          <div className={styles.panelTitle}>
            <span>⠿</span> Panel Design
          </div>
          <div className={styles.panelHeaderActions}>
            <span>✥</span>
          </div>
        </div>
        <div className={styles.sidebarPreview} ref={containerRef}>
          <div className={styles.previewTitle}>3D Preview</div>
          <canvas ref={threeCanvasRef} />
        </div>
      </div>
    );
  };

  const renderPropertiesSidebar = () => {
    return (
      <div 
        className={styles.sidebar}
        style={{ left: drawingPos.x, top: drawingPos.y }}
      >
        <div className={styles.panelHeader} onMouseDown={() => setIsDraggingDrawing(true)}>
          <div className={styles.panelTitle}>
            <span>⠿</span> Drawing
          </div>
          <div className={styles.panelHeaderActions}>
            <span>✥</span>
          </div>
        </div>
        
        <div className={styles.propertiesContainer}>
          <div className={styles.sidebarContent}>
            <>
              {selectedHoleIndex !== null && selectedLineIndex !== null && (
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarTitle}>Line Editing (Hole #{selectedHoleIndex + 1})</div>
                  <div className={styles.sidebarRow}>
                    <span>Type:</span>
                    <select
                      className={styles.sidebarSelect}
                      value={curveControls[`hole_${selectedHoleIndex}_${selectedLineIndex}`] ? 'arc' : 'linear'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const curveKey = `hole_${selectedHoleIndex}_${selectedLineIndex}`;
                        if (val === 'linear') {
                          const next = { ...curveControls };
                          delete next[curveKey];
                          setCurveControls(next);
                        } else {
                          const hole = holes[selectedHoleIndex];
                          if (hole.points) {
                            const p1 = hole.points[selectedLineIndex];
                            const p2 = hole.points[(selectedLineIndex + 1) % hole.points.length];
                            setCurveControls(prev => ({
                              ...prev,
                              [curveKey]: { x: (p1.x + p2.x) / 2 + 10, y: (p1.y + p2.y) / 2 + 10 }
                            }));
                          }
                        }
                      }}
                    >
                      <option value="linear">Linear</option>
                      <option value="arc">Arc</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedHoleIndex !== null && selectedPointIndex !== null && (
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarTitle}>Point Editing (Hole #{selectedHoleIndex + 1})</div>
                  <div className={styles.sidebarRow}>
                    <span>Point X:</span>
                    <input type="number" step="0.1" value={holes[selectedHoleIndex].points![selectedPointIndex].x} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setHoles(prev => {
                        const next = [...prev];
                        const nextPoints = [...(next[selectedHoleIndex].points as any)];
                        nextPoints[selectedPointIndex] = { ...nextPoints[selectedPointIndex], x: val };
                        next[selectedHoleIndex] = { ...next[selectedHoleIndex], points: nextPoints };
                        return next;
                      });
                    }} />
                  </div>
                  <div className={styles.sidebarRow}>
                    <span>Point Y:</span>
                    <input type="number" step="0.1" value={holes[selectedHoleIndex].points![selectedPointIndex].y} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setHoles(prev => {
                        const next = [...prev];
                        const nextPoints = [...(next[selectedHoleIndex].points as any)];
                        nextPoints[selectedPointIndex] = { ...nextPoints[selectedPointIndex], y: val };
                        next[selectedHoleIndex] = { ...next[selectedHoleIndex], points: nextPoints };
                        return next;
                      });
                    }} />
                  </div>
                </div>
              )}

              {selectedHoleIndex !== null && selectedPointIndex === null && selectedLineIndex === null && (
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarTitle}>Face Editing (Hole #{selectedHoleIndex + 1})</div>
                  <div className={styles.sidebarRow}>
                    <span>X:</span>
                    <input type="number" step="0.1" value={holes[selectedHoleIndex].x} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setHoles(prev => {
                        const next = [...prev];
                        next[selectedHoleIndex] = { ...next[selectedHoleIndex], x: val };
                        return next;
                      });
                    }} />
                  </div>
                  <div className={styles.sidebarRow}>
                    <span>Y:</span>
                    <input type="number" step="0.1" value={holes[selectedHoleIndex].y} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setHoles(prev => {
                        const next = [...prev];
                        next[selectedHoleIndex] = { ...next[selectedHoleIndex], y: val };
                        return next;
                      });
                    }} />
                  </div>
                  <button className={styles.sidebarDeleteButton} onClick={() => {
                    setHoles(prev => prev.filter((_, i) => i !== selectedHoleIndex));
                    setSelectedHoleIndex(null);
                  }}>Delete Hole</button>
                </div>
              )}

              {selectedCornerIndex !== null && (
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarTitle}>Vertex Editing (#{selectedCornerIndex + 1})</div>
                  <div className={styles.sidebarRow}>
                    <span>Point X:</span>
                    <input type="number" step="0.1" value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].x} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setShapePoints(prev => {
                        const pts = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
                        pts[selectedCornerIndex] = { ...pts[selectedCornerIndex], x: val };
                        return pts;
                      });
                    }} />
                  </div>
                  <div className={styles.sidebarRow}>
                    <span>Point Y:</span>
                    <input type="number" step="0.1" value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].y} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setShapePoints(prev => {
                        const pts = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
                        pts[selectedCornerIndex] = { ...pts[selectedCornerIndex], y: val };
                        return pts;
                      });
                    }} />
                  </div>
                </div>
              )}

              {selectedHoleIndex === null && selectedCornerIndex === null && (
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarTitle}>Panel Properties</div>
                  <div className={styles.sidebarRow}>
                    <span>Width:</span>
                    <span>{panelWidth.toFixed(1)} mm</span>
                  </div>
                  <div className={styles.sidebarRow}>
                    <span>Rotated:</span>
                    <span>{isRotated2D ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}
            </>
          </div>
        </div>
      </div>
    );
  };


  const renderHoverDimensions = () => {
    // 1. Snapping guides for drawing
    const guides = snappingGuides.map((guide, i) => (
      <Line
        key={`snapping-guide-${i}`}
        points={guide.type === 'x' ? [guide.value, -10000, guide.value, 10000] : [-10000, guide.value, 10000, guide.value]}
        stroke="red"
        strokeWidth={1 / stageScale}
        dash={[4, 4]}
      />
    ));

    // 2. Existing Hole Dimensions on Hover
    let holeDims = null;
    const currentHoveredIdx = hoveredHoleIndex !== null ? hoveredHoleIndex : selectedHoleIndex;
    if (currentHoveredIdx !== null && holes[currentHoveredIdx]) {
      const hole = holes[currentHoveredIdx];
      const pts = hole.type === 'polygon' && hole.points ? hole.points : [
        { x: hole.x, y: hole.y },
        { x: hole.x + hole.width, y: hole.y + hole.height }
      ];
      
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const w = maxX - minX, h = maxY - minY;
      const dimStroke = '#9e9e9e';

      holeDims = (
        <>
          <Line points={[minX, minY - 15, maxX, minY - 15]} stroke={dimStroke} strokeWidth={0.5} />
          <Line points={[minX, maxY + 15, maxX, maxY + 15]} stroke={dimStroke} strokeWidth={0.5} />
          <Line points={[minX - 15, minY, minX - 15, maxY]} stroke={dimStroke} strokeWidth={0.5} />
          <Line points={[maxX + 15, minY, maxX + 15, maxY]} stroke={dimStroke} strokeWidth={0.5} />
          <Rect x={minX + w / 2 - 30} y={minY - 28} width={60} height={12} fill="white" opacity={0.8} />
          <KonvaText x={minX + w / 2 - 28} y={minY - 26} text={`${w.toFixed(1)} mm`} fontSize={10} fill="#424242" />
          <Rect x={minX - 60} y={minY + h / 2 - 6} width={50} height={12} fill="white" opacity={0.8} />
          <KonvaText x={minX - 58} y={minY + h / 2 - 4} text={`${h.toFixed(1)} mm`} fontSize={10} fill="#424242" />
          {(hole.type === 'circle' || hole.type === 'slotting') && (
            <>
              <KonvaText 
                x={minX + w / 2} 
                y={minY + h / 2} 
                text={`r: ${(Math.min(w, h) / 2).toFixed(1)}`} 
                fontSize={10} 
                fill="#ff5722" 
                align="center"
              />
            </>
          )}
        </>
      );
    }

    return (
      <>
        {guides}
        {holeDims}
      </>
    );
  };

  return (
    <div className={styles.designerContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>Panel Designer</div>
        <div className={styles.headerCenter}>
          {tools.map(({ name, icon, subTools }) => (
            <div
              key={name}
              className={styles.toolButton}
              onClick={() => {
                if (name === 'Dig') {
                  setActiveTool(activeTool === 'Dig' ? null : 'Dig');
                  // If 'Dig' is activated, set default hole shape if not already set
                  if (activeTool !== 'Dig' && !holeShape) {
                    setHoleShape('rect');
                  }
                  return;
                }
                setActiveTool(name);
              }}

              title={name}
            >
              <img src={icon} alt={name} />
              <div>{name}</div>
            </div>
          ))}
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.actionButton} ${styles.completeButton}`}
            onClick={handleComplete}
          >
            Complete
          </button>
        </div>
      </div>

      {activeTool === 'Dig' && (
        <div className={styles.subToolbar}>
          <div className={styles.subToolbarLabel}>Dig Options:</div>
          <select
            value={holeShape}
            onChange={(e) => setHoleShape(e.target.value as 'rect' | 'circle' | 'polygon' | 'slotting')}
            className={styles.holeTypeDropdown}
          >
            <option value="rect">Rectangle Hole</option>
            <option value="circle">Circle Hole</option>
            <option value="polygon">Polygon Hole</option>
            <option value="slotting">Slotting Hole</option>
          </select>
        </div>
      )}

      {renderHorizontalRuler()}
      <div className={styles.canvasAndSidebar}>
        <div className={styles.canvasWrapper} style={{ marginTop: activeTool === 'Dig' ? '35px' : '0' }}>
          {renderVerticalRuler()}
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            style={{ backgroundColor: '#fff', display: 'block', zIndex: 1 }}
            onWheel={handleWheel}
            draggable={!isDrawingHole && !isDrawingShape}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              const pointer = stage?.getPointerPosition();
              if (!pointer) return;
              const rawX = (pointer.x - stagePosition.x) / stageScale;
              const rawY = (pointer.y - stagePosition.y) / stageScale;

              if (activeTool === 'Draw the outline of the board') {
                const { snappedX, snappedY } = getSnappedPosition(rawX, rawY);
                if (currentDrawingPoints.length > 0) {
                  const firstPoint = currentDrawingPoints[0];
                  const dist = Math.hypot(firstPoint.x - snappedX, firstPoint.y - snappedY);
                  if (dist < 15 / stageScale) {
                    if (shapePoints.length === 0) {
                      setShapePoints(currentDrawingPoints);
                    } else {
                      setHoles(prev => [...prev, { x: 0, y: 0, width: 0, height: 0, type: 'polygon', points: currentDrawingPoints, id: `hole-${Date.now()}` }]);
                    }
                    setCurrentDrawingPoints([]);
                    setIsDrawingShape(false);
                    setSnappingGuides([]);
                    setMousePos(null);
                    return;
                  }
                }
                setCurrentDrawingPoints(prev => [...prev, { x: snappedX, y: snappedY }]);
                setIsDrawingShape(true);
              } else if (activeTool === 'Dig') {
                if (holeShape === 'polygon') {
                  const { snappedX, snappedY } = getSnappedPosition(rawX, rawY);
                  if (currentDrawingPoints.length > 0) {
                    if (Math.hypot(currentDrawingPoints[0].x - snappedX, currentDrawingPoints[0].y - snappedY) < 15 / stageScale) {
                      setHoles(prev => [...prev, { x: 0, y: 0, width: 0, height: 0, type: 'polygon', points: currentDrawingPoints, id: `hole-${Date.now()}` }]);
                      setCurrentDrawingPoints([]);
                      setIsDrawingShape(false);
                      setSnappingGuides([]);
                      return;
                    }
                  }
                  setCurrentDrawingPoints(prev => [...prev, { x: snappedX, y: snappedY }]);
                  setIsDrawingShape(true);
                } else if (holeShape === 'rect' || holeShape === 'circle') {
                  setNewHoleStart({ x: rawX, y: rawY });
                  setTempHole(null);
                  setIsDrawingHole(true);
                }
              }
            }}
            onMouseMove={(e) => {
              const stage = e.target.getStage();
              const pointer = stage?.getPointerPosition();
              if (!pointer) return;
              const rawX = (pointer.x - stagePosition.x) / stageScale;
              const rawY = (pointer.y - stagePosition.y) / stageScale;

              if ((activeTool === 'Draw the outline of the board' || (activeTool === 'Dig' && holeShape === 'polygon')) && isDrawingShape && currentDrawingPoints.length > 0) {
                const { snappedX, snappedY, guides } = getSnappedPosition(rawX, rawY);
                setMousePos({ x: snappedX, y: snappedY });
                setSnappingGuides(guides);
              } else if (activeTool === 'Dig' && isDrawingHole && newHoleStart) {
                const dx = rawX - newHoleStart.x;
                const dy = rawY - newHoleStart.y;
                if (holeShape === 'circle') {
                  const radius = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
                  setTempHole({ x: newHoleStart.x + dx / 2 - radius, y: newHoleStart.y + dy / 2 - radius, width: radius * 2, height: radius * 2, type: 'circle' });
                } else if (holeShape === 'slotting') {
                  // Slotting: keep aspect ratio or just draw a rect that will be rendered with full radius
                  setTempHole({ x: Math.min(newHoleStart.x, rawX), y: Math.min(newHoleStart.y, rawY), width: Math.abs(dx), height: Math.abs(dy), type: 'slotting' });
                } else { // This will be 'rect'
                  setTempHole({ x: Math.min(newHoleStart.x, rawX), y: Math.min(newHoleStart.y, rawY), width: Math.abs(dx), height: Math.abs(dy), type: 'rect' });
                }
              } else if (activeTool === 'Draw the outline of the board') {
                if (activeCurveDragKey) setCurveControls(prev => ({ ...prev, [activeCurveDragKey]: { x: rawX, y: rawY } }));
              }
            }}
            onMouseUp={() => {
              if (isDrawingHole && tempHole) {
                setHoles(prev => [...prev, { ...tempHole, id: `hole-${Date.now()}` } as any]);
                setTempHole(null);
                setNewHoleStart(null);
                setIsDrawingHole(false);
              }
              setActiveCurveDragKey(null);
            }}
          >


          <Layer>
            {(shapePoints.length > 0 || (panelWidth > 0 && panelHeight > 0)) && (
              <>
                <Path
                  data={buildPathData(
                    shapePoints.length > 0 ? shapePoints : defaultPanelPoints,
                    cornerRadius,
                    cornerTypes,
                    'shape'
                  )}
                  fill="rgba(57, 37, 121, 0.15)"
                  stroke="#392579"
                  strokeWidth={1}
                  fillRule="evenodd"
                />
                {tempHole &&
                  (tempHole.type === 'circle' ? (
                    <Circle
                      x={tempHole.x + tempHole.width / 2}
                      y={tempHole.y + tempHole.height / 2}
                      radius={Math.min(tempHole.width, tempHole.height) / 2}
                      fill="rgba(0,0,0,0.2)"
                      stroke="black"
                      strokeWidth={0.5}
                      listening={false}
                    />
                  ) : (
                    <Rect
                      x={tempHole.x}
                      y={tempHole.y}
                      width={tempHole.width}
                      height={tempHole.height}
                      fill="rgba(0,0,0,0.2)"
                      stroke="black"
                      strokeWidth={0.5}
                      listening={false}
                    />
                  ))}
                {holes.map((hole, index) => {
                  const commonProps = {
                    key: index,
                    fill: "rgba(0,0,0,0.2)",
                    stroke: selectedHoleIndex === index ? '#1e88e5' : 'black',
                    opacity: 0.7,
                    strokeWidth: 0.5,
                    onClick: () => {
                      setSelectedHoleIndex(index);
                      setSelectedPointIndex(null);
                      setSelectedLineIndex(null);
                    },
                    onMouseEnter: () => setHoveredHoleIndex(index),
                    onMouseLeave: () => setHoveredHoleIndex(null),
                  };
                  if (hole.type === 'circle') {
                    return <Circle
                      {...commonProps}
                      x={hole.x + hole.width / 2}
                      y={hole.y + hole.height / 2}
                      radius={Math.min(hole.width, hole.height) / 2}
                    />;
                  } else if (hole.type === 'polygon' && hole.points) {
                    return (
                      <React.Fragment key={`hole-poly-container-${index}`}>
                        <Path
                          {...commonProps}
                          key={`hole-poly-${index}`}
                          data={buildPathData(hole.points, hole.cornerRadius || new Array(hole.points.length).fill(0), hole.cornerTypes, `hole_${index}`)}
                        />
                        {selectedHoleIndex === index && (
                          <>
                            {hole.points.map((p, pIdx) => (
                              <Rect
                                key={`h-${index}-p-${pIdx}`}
                                x={p.x - 3} y={p.y - 3} width={6} height={6}
                                onClick={() => {
                                  setSelectedPointIndex(pIdx);
                                  // Keep selectedHoleIndex as is
                                }}
                                onDragMove={(e) => {
                                  const rawX = e.target.x() + 3;
                                  const rawY = e.target.y() + 3;
                                  const { snappedX, snappedY } = getSnappedPosition(rawX, rawY);
                                  e.target.x(snappedX - 3); e.target.y(snappedY - 3);
                                  setHoles(prev => {
                                    const next = [...prev];
                                    const nextPoints = [...(next[index].points as any)];
                                    nextPoints[pIdx] = { x: snappedX, y: snappedY };
                                    next[index] = { ...next[index], points: nextPoints };
                                    return next;
                                  });
                                }}
                              />
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  } else if (hole.type === 'slotting') {
                    const r = Math.min(hole.width, hole.height) / 2;
                    return <Rect
                      {...commonProps}
                      x={hole.x}
                      y={hole.y}
                      width={hole.width}
                      height={hole.height}
                      cornerRadius={r}
                    />;
                  } else {
                    return <Rect
                      {...commonProps}
                      x={hole.x}
                      y={hole.y}
                      width={hole.width}
                      height={hole.height}
                    />;
                  }
                })}

                {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((point, index) => (
                  <Rect
                    key={index}
                    x={point.x - 3}
                    y={point.y - 3}
                    width={6}
                    height={6}
                    fill="grey"
                    opacity={0.7}
                    draggable
                    onClick={() => {
                      setSelectedCornerIndex(index);
                      setSelectedHoleIndex(null);
                    }}
                    onDragMove={(e) => {
                      const rawX = e.target.x() + 3;
                      const rawY = e.target.y() + 3;
                      const { snappedX, snappedY, guides } = getSnappedPosition(rawX, rawY, { x: rawX, y: rawY }); // Simplified ignore self logic by exact coords matching or we just accept snapping to self which implies no change. Actually getSnappedPosition takes ignoreSelf {x,y}
                      e.target.x(snappedX - 3);
                      e.target.y(snappedY - 3);
                      setSnappingGuides(guides);

                      const newPoints = [
                        ...(shapePoints.length > 0 ? shapePoints : defaultPanelPoints),
                      ];
                      newPoints[index] = {
                        x: snappedX,
                        y: snappedY,
                      };
                      setShapePoints(newPoints);
                    }}
                    onDragEnd={(e) => {
                      setSnappingGuides([]);
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) {
                        container.style.cursor = activeTool === 'Curve' ? 'crosshair' : 'pointer';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) {
                        container.style.cursor = 'default';
                      }
                    }}
                  />
                ))}
              </>
            )}

            {/* Snapping Guides */}
            {snappingGuides.map((guide, i) => (
              <Line
                key={`guide-${i}`}
                points={guide.type === 'x' ? [guide.value, -10000, guide.value, 10000] : [-10000, guide.value, 10000, guide.value]}
                stroke="red"
                strokeWidth={1 / stageScale}
                dash={[4, 4]}
              />
            ))}

            {/* Current Drawing Shape */}
            {currentDrawingPoints.length > 0 && (
              <>
                <Line
                  points={currentDrawingPoints.flatMap(p => [p.x, p.y]).concat(mousePos ? [mousePos.x, mousePos.y] : [])}
                  stroke="green"
                  strokeWidth={0.5}
                />
                {currentDrawingPoints.map((p, i) => (
                  <Circle key={`dp-${i}`} x={p.x} y={p.y} radius={3} fill={i === 0 ? "orange" : "blue"} />
                ))}
              </>
            )}

            {/* Curve Tool Handles */}
            {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p1, i) => {
              const pts = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
              const p2 = pts[(i + 1) % pts.length];
              const curveKey = `shape_${i}`;
              const ctrl = curveControls[curveKey];
              const handlePos = ctrl || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
              return (
                <React.Fragment key={`curve-grip-shape-${i}`}>
                  {ctrl && activeTool === 'Draw the outline of the board' && (
                    <>
                      <Line
                        points={[(p1.x + p2.x) / 2, (p1.y + p2.y) / 2, ctrl.x, ctrl.y]}
                        stroke="blue"
                        strokeWidth={0.5}
                        dash={[2, 2]}
                      />
                    </>
                  )}
                  <Circle
                    x={handlePos.x}
                    y={handlePos.y}
                    radius={activeTool === 'Draw the outline of the board' ? 6 / stageScale : 0}
                    fill="blue"
                    draggable={activeTool === 'Draw the outline of the board'}
                    onDragMove={(e) => {
                      setCurveControls(prev => ({ ...prev, [curveKey]: { x: e.target.x(), y: e.target.y() } }));
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container && activeTool === 'Draw the outline of the board') container.style.cursor = 'crosshair';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  />
                </React.Fragment>
              )
            })}

            {/* Hover dimension lines and labels */}
            {renderHoverDimensions()}
            {/* Hole Curve Handles */}
            {holes.map((hole, hIdx) => {
              if (hole.type === 'polygon' && hole.points) {
                return hole.points.map((p1, i) => {
                  const pts = hole.points as { x: number, y: number }[];
                  const p2 = pts[(i + 1) % pts.length];
                  const curveKey = `hole_${hIdx}_${i}`;
                  const ctrl = curveControls[curveKey];
                  const handlePos = ctrl || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                  return (
                    <React.Fragment key={`curve-grip-hole-${hIdx}-${i}`}>
                      {ctrl && activeTool === 'Draw the outline of the board' && (
                        <Line
                          points={[(p1.x + p2.x) / 2, (p1.y + p2.y) / 2, ctrl.x, ctrl.y]}
                          stroke="blue"
                          strokeWidth={0.5}
                          dash={[2, 2]}
                        />
                      )}
                      <Circle
                        x={handlePos.x}
                        y={handlePos.y}
                        radius={activeTool === 'Draw the outline of the board' ? 6 / stageScale : 0}
                        fill="red"
                        draggable={activeTool === 'Draw the outline of the board'}
                        onDragMove={(e) => {
                          setCurveControls(prev => ({ ...prev, [curveKey]: { x: e.target.x(), y: e.target.y() } }));
                        }}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container && activeTool === 'Draw the outline of the board') container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                    </React.Fragment>
                  )
                })
              }
              return null;
            })}

            {/* Invisible Hit Detectors for Arc Dragging (MouseDown) */}
            {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p1, i) => {
              const pts = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
              const p2 = pts[(i + 1) % pts.length];
              const curveKey = `shape_${i}`;
              const ctrl = curveControls[curveKey];
              // If curve already exists, we use a Path or we just let them drag the handle. 
              // If it doesn't, we show a thick invisible line.
              if (ctrl || activeTool !== 'Draw the outline of the board') return null;

              return (
                <Line
                  key={`hit-shape-${i}`}
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke="transparent"
                  strokeWidth={15 / stageScale}
                  hitStrokeWidth={20 / stageScale}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container && activeTool === 'Draw the outline of the board') container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                  onMouseDown={(e) => {
                    setSelectedLineIndex(i);
                    setSelectedCornerIndex(null);
                    setSelectedHoleIndex(null);

                    if (activeTool === 'Draw the outline of the board') {
                      const stage = e.target.getStage();
                      const pointer = stage?.getPointerPosition();
                      if (!pointer) return;
                      const rawX = (pointer.x - stagePosition.x) / stageScale;
                      const rawY = (pointer.y - stagePosition.y) / stageScale;
                      setCurveControls(prev => ({ ...prev, [curveKey]: { x: rawX, y: rawY } }));
                      setActiveCurveDragKey(curveKey);
                    }
                  }}
                />
              )
            })}

            {holes.map((hole, hIdx) => {
              if (hole.type === 'polygon' && hole.points) {
                return hole.points.map((p1, i) => {
                  const pts = hole.points as { x: number, y: number }[];
                  const p2 = pts[(i + 1) % pts.length];
                  const curveKey = `hole_${hIdx}_${i}`;
                  if (curveControls[curveKey] || activeTool !== 'Draw the outline of the board') return null;

                  return (
                    <Line
                      key={`hit-hole-${hIdx}-${i}`}
                      points={[p1.x, p1.y, p2.x, p2.y]}
                      stroke={hoveredLineIndex?.prefix === `hole_${hIdx}` && hoveredLineIndex.index === i ? 'rgba(255, 165, 0, 0.5)' : 'transparent'}
                      strokeWidth={15 / stageScale}
                      hitStrokeWidth={20 / stageScale}
                      onMouseEnter={(e) => {
                        setHoveredLineIndex({ prefix: `hole_${hIdx}`, index: i });
                        const container = e.target.getStage()?.container();
                        if (container && activeTool === 'Draw the outline of the board') container.style.cursor = 'grab';
                      }}
                      onMouseLeave={(e) => {
                        setHoveredLineIndex(null);
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                      onMouseDown={(e) => {
                        setSelectedHoleIndex(hIdx);
                        setSelectedLineIndex(i);
                        setSelectedCornerIndex(null);
                        setSelectedPointIndex(null);

                        if (activeTool === 'Draw the outline of the board') {
                          const stage = e.target.getStage();
                          const pointer = stage?.getPointerPosition();
                          if (!pointer) return;
                          const rawX = (pointer.x - stagePosition.x) / stageScale;
                          const rawY = (pointer.y - stagePosition.y) / stageScale;
                          setCurveControls(prev => ({ ...prev, [curveKey]: { x: rawX, y: rawY } }));
                          setActiveCurveDragKey(curveKey);
                        }
                      }}
                    />
                  )
                });
              }
              return null;
            })}

            {/* Point dragging updates guides */}

            <Transformer
              ref={transformerRef}
              boundBoxFunc={(newBox) => newBox}
              anchorSize={8}
              anchorStroke="#000"
              anchorFill="#fff"
              anchorCornerRadius={2}
            />
          </Layer>
        </Stage>
      </div>
      {renderPreviewSidebar()}
      {renderPropertiesSidebar()}
    </div>

    <div className={styles.footer}>
      Origin at center • depth(T): {plankThickness.toFixed(1)} mm • width(W): {panelWidth.toFixed(1)} mm • height(H): {panelHeight.toFixed(1)} mm
    </div>
    {showConfirmExit && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.popupHeader}>
            <FaExclamationTriangle className={styles.warningIcon} />
            <h2 className={styles.popupTitle}>
              The results of this edit will not be saved, will you confirm the exit editing?
            </h2>
          </div>
          <div className={styles.buttonContainer}>
            <button
              className={`${styles.button} ${styles.popupCancelButton}`}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className={`${styles.button} ${styles.popupConfirmButton}`}
              onClick={confirmExit}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
    {renderRadiusInput()}
  </div>
);
}
