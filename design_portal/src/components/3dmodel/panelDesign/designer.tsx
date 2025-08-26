import curve from '@/assets/customdesign/curve.svg';
import dig from '@/assets/paneldesign/dig.svg';
import pencil from '@/assets/paneldesign/pencil.svg';
import redo from '@/assets/paneldesign/redo.svg';
import slotting from '@/assets/paneldesign/slotting.svg';
import undo from '@/assets/paneldesign/undo.svg';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Circle, Layer, Path, Rect, Stage, Transformer } from 'react-konva';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RootState } from '../store';
import styles from './panelDesign.module.css';

interface PanelDesignerProps {
  // state: RootState;
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
  const [shapePoints, setShapePoints] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [cornerRadius, setcornerRadius] = useState<number[]>([]);
  const [originalGeometry, setOriginalGeometry] = useState<
    THREE.BoxGeometry | undefined
  >();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [holes, setHoles] = useState<
    {
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'rect' | 'circle';
    }[]
  >([]);
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
    type: 'rect' | 'circle';
  } | null>(null);
  const [holeShape, setHoleShape] = useState<'rect' | 'circle'>('rect');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState<number | null>(
    null,
  );
  const [showRadiusInput, setShowRadiusInput] = useState(false);

  // Initialize corner radii when shapePoints change
  useEffect(() => {
    const numPoints = shapePoints.length || 4;
    if (cornerRadius.length !== numPoints) {
      setcornerRadius(Array(numPoints).fill(0));
    }
  }, [shapePoints]);

  // Initialize 3D scene and set originalGeometry
  useEffect(() => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    if (!selectedObject || !selectedChildObject) {
      router.push(`/design/${designId}`);
      return;
    }

    const scene = state?.scene?.scene;
    if (!threeCanvasRef.current || !scene) return;

    // Remove existing meshes
    scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh) {
        scene.remove(obj);
      }
    });

    const selectedMesh = scene.children.find(
      (obj) => obj.userData?.objectId === selectedObject,
    );

    const selectedChildMesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject,
    );

    if (!(selectedChildMesh instanceof THREE.Mesh)) return;

    if (selectedChildMesh.geometry) {
      setOriginalGeometry(selectedChildMesh.geometry);
      const geometry = selectedChildMesh.geometry;
      const params = geometry.parameters; // Fallback values
      const { width, height, depth } = params;

      if (selectedChildMesh.userData.type === 'HORIZONTAL') {
        setpanelWidth(width);
        setpanelHeight(depth);
      } else if (selectedChildMesh.userData.type === 'VERTICAL') {
        setpanelWidth(depth);
        setpanelHeight(height);
      } else {
        setpanelWidth(width);
        setpanelHeight(height);
      }

      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, -height / 2);
      shape.lineTo(width / 2, -height / 2);
      shape.lineTo(width / 2, height / 2);
      shape.lineTo(-width / 2, height / 2);
      shape.lineTo(-width / 2, -height / 2);

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: depth,
        bevelEnabled: false,
      };
      const newGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      newGeometry.computeBoundingBox();
      newGeometry.computeBoundingSphere();

      newGeometry.userData.oldGeometry = selectedChildMesh.geometry;

      selectedChildMesh.geometry.dispose();
      selectedChildMesh.geometry = newGeometry;
      selectedChildMesh.position.z = selectedChildMesh.position.z - depth / 2;
    }

    if (selectedMesh) {
      scene.add(selectedMesh);
    }

    const width = containerRef.current?.clientWidth || 300;
    const height = containerRef.current?.clientHeight || 200;

    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 1, 4.5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      controls.dispose();
    };
  }, [
    state?.scene?.scene,
    state?.data?.selectedObject,
    state?.data?.selectedChildObject,
  ]);

  useEffect(() => {
    const points = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    updateMeshGeometry(points, holes, cornerRadius);
  }, [shapePoints, holes, cornerRadius]);

  const updateMeshGeometry = (
    points: { x: number; y: number }[],
    holes: {
      x: number;
      y: number;
      width: number;
      height: number;
      type: string;
    }[],
    cornerRadius: number[],
  ) => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const scene = state?.scene?.scene;

    if (!scene || !selectedObject || !selectedChildObject) return;

    const selectedMesh = scene.children.find(
      (obj) => obj.userData?.objectId === selectedObject,
    );
    const selectedChildMesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject,
    );

    if (!(selectedChildMesh instanceof THREE.Mesh)) return;

    const shape = new THREE.Shape();
    const n = points.length;

    const getTangents = (i: number) => {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
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
      const tangents = getTangents(j);
      shape.lineTo(tangents.tp_in.x, tangents.tp_in.y);
      const r = cornerRadius[j] || 0;
      if (r > 0) {
        shape.absarc(
          tangents.center.x,
          tangents.center.y,
          r,
          tangents.start_angle,
          tangents.end_angle,
          false,
        );
      }
    }

    // === ADD HOLES ===
    holes.forEach((hole) => {
      if (hole.type === 'circle') {
        const radiusX = hole.width / 2;
        const radiusY = hole.height / 2;
        const centerX = hole.x + radiusX;
        const centerY = hole.y + radiusY;

        const circlePath = new THREE.Path();
        circlePath.absellipse(
          centerX,
          centerY,
          radiusX,
          radiusY,
          0,
          Math.PI * 2,
          false,
        );
        shape.holes.push(circlePath);
      } else {
        const holePath = new THREE.Path();
        holePath.moveTo(hole.x, hole.y);
        holePath.lineTo(hole.x + hole.width, hole.y);
        holePath.lineTo(hole.x + hole.width, hole.y + hole.height);
        holePath.lineTo(hole.x, hole.y + hole.height);
        holePath.lineTo(hole.x, hole.y);
        shape.holes.push(holePath);
      }
    });

    let staticDirectionValue;

    if (originalGeometry && 'parameters' in originalGeometry) {
      const params = originalGeometry.parameters;
      if (selectedChildMesh.userData.type === 'VERTICAL') {
        staticDirectionValue = params.width || 349;
        selectedChildMesh.rotation.y = Math.PI / 2 + Math.PI;
        selectedChildMesh.rotation.z = Math.PI;
        if (!selectedChildMesh.userData.isPerfect) {
          selectedChildMesh.position.z =
            selectedChildMesh.position.z + (params.depth || 18) / 2;
          selectedChildMesh.userData.isPerfect = true;
        }
      } else if (selectedChildMesh.userData.type === 'HORIZONTAL') {
        staticDirectionValue = params.height || 1960;
        selectedChildMesh.rotation.x = Math.PI / 2;
        if (!selectedChildMesh.userData.isPerfect) {
          selectedChildMesh.position.z =
            selectedChildMesh.position.z + (params.depth || 18) / 2;
          selectedChildMesh.userData.isPerfect = true;
        }
      } else {
        staticDirectionValue = params.depth || 18;
        selectedChildMesh.rotation.x = Math.PI;
      }
    } else {
      console.warn(
        'originalGeometry is not defined or does not have parameters',
      );
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
      const height = window.innerHeight - 60;
      setStageSize({ width, height });
      setStagePosition({ x: width / 2, y: height / 2 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
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
        />,
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
        </div>,
      );
    }

    return <div className={styles.rulerHorizontal}>{ticks}</div>;
  };

  const renderVerticalRuler = () => {
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
        />,
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
        </div>,
      );
    }

    return <div className={styles.rulerVertical}>{ticks}</div>;
  };

  const handleCancel = () => {
    setShowConfirmExit(true);
  };

  const confirmExit = () => {
    router.push(`/design/${designId}`);
  };

  const closeModal = () => {
    setShowConfirmExit(false);
  };

  const tools = [
    { name: 'Undo', icon: undo },
    { name: 'Redo', icon: redo },
    { name: 'Draw the outline of the board', icon: pencil },
    { name: 'Dig', icon: dig },
    { name: 'Slotting', icon: slotting },
    { name: 'Curve', icon: curve },
  ];

  const defaultPanelPoints = [
    { x: -panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: panelHeight / 2 },
    { x: -panelWidth / 2, y: panelHeight / 2 },
  ];

  const buildPathData = (
    points: { x: number; y: number }[],
    cornerRadius: number[],
  ) => {
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
      const len_next = Math.hypot(p2.x - p1.x, p2.y - p1.y);
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
      const tangents = getTangents(j);
      path += ` L ${tangents.tp_in.x} ${tangents.tp_in.y}`;
      const r = cornerRadius[j] || 0;
      if (r > 0) {
        path += ` A ${r} ${r} 0 0 1 ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      }
    }

    path += ' Z';
    return path;
  };

  const handleCurveClick = (index: number) => {
    setSelectedCornerIndex(index);
    setShowRadiusInput(true);
  };

  const renderRadiusInput = () => {
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

  return (
    <div className={styles.designerContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>Panel Designer</div>
        <div className={styles.headerCenter}>
          {tools.map(({ name, icon }) => (
            <div
              key={name}
              className={styles.toolButton}
              onClick={() => setActiveTool(name)}
              title={name}
            >
              <img src={icon.src} alt={name} />
              <div>{name}</div>
            </div>
          ))}
          {activeTool === 'Dig' && (
            <select
              value={holeShape}
              onChange={(e) =>
                setHoleShape(e.target.value as 'rect' | 'circle')
              }
              className={styles.holeTypeDropdown}
            >
              <option value="rect">Rectangle Hole</option>
              <option value="circle">Circle Hole</option>
            </select>
          )}
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button className={`${styles.actionButton} ${styles.completeButton}`}>
            Complete
          </button>
        </div>
      </div>
      {renderHorizontalRuler()}
      <div className={styles.canvasWrapper}>
        {renderVerticalRuler()}
        <Stage
          ref={stageRef}
          width={stageSize.width - 30}
          height={stageSize.height - 30}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          style={{ backgroundColor: '#fff', display: 'block', zIndex: 1 }}
          onWheel={handleWheel}
          draggable={!isDrawingHole}
          onMouseDown={() => {
            if (activeTool === 'Dig') {
              const stage = stageRef.current;
              const pointer = stage?.getPointerPosition();
              if (!pointer) return;

              const x = (pointer.x - stagePosition.x) / stageScale;
              const y = (pointer.y - stagePosition.y) / stageScale;

              setNewHoleStart({ x, y });
              setTempHole(null);
              setIsDrawingHole(true);
            }
          }}
          onMouseMove={() => {
            if (activeTool === 'Dig' && isDrawingHole && newHoleStart) {
              const stage = stageRef.current;
              const pointer = stage?.getPointerPosition();
              if (!pointer) return;

              const x = (pointer.x - stagePosition.x) / stageScale;
              const y = (pointer.y - stagePosition.y) / stageScale;

              const dx = x - newHoleStart.x;
              const dy = y - newHoleStart.y;

              if (holeShape === 'circle') {
                const radius = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
                const centerX = newHoleStart.x + dx / 2;
                const centerY = newHoleStart.y + dy / 2;

                setTempHole({
                  x: centerX - radius,
                  y: centerY - radius,
                  width: radius * 2,
                  height: radius * 2,
                  type: 'circle',
                });
              } else {
                setTempHole({
                  x: Math.min(newHoleStart.x, x),
                  y: Math.min(newHoleStart.y, y),
                  width: Math.abs(dx),
                  height: Math.abs(dy),
                  type: 'rect',
                });
              }
            }
          }}
          onMouseUp={() => {
            if (activeTool === 'Dig' && isDrawingHole && tempHole) {
              const finalHole = {
                ...tempHole,
                type: holeShape,
              };

              setHoles((prev) => [...prev, finalHole]);
              updateMeshGeometry(
                shapePoints.length > 0 ? shapePoints : defaultPanelPoints,
                [...holes, finalHole],
                cornerRadius,
              );
            }
            setIsDrawingHole(false);
            setNewHoleStart(null);
            setTempHole(null);
          }}
        >
          <Layer>
            {(shapePoints.length > 0 ||
              (panelWidth > 0 && panelHeight > 0)) && (
                <>
                  <Path
                    data={buildPathData(
                      shapePoints.length > 0 ? shapePoints : defaultPanelPoints,
                      cornerRadius,
                    )}
                    fill="#d8fdd3"
                    stroke="green"
                    strokeWidth={0.5}
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
                  {holes.map((hole, index) =>
                    hole.type === 'circle' ? (
                      <Circle
                        key={index}
                        x={hole.x + hole.width / 2}
                        y={hole.y + hole.height / 2}
                        radius={Math.min(hole.width, hole.height) / 2}
                        fill="rgba(0,0,0,0.2)"
                        stroke="black"
                        opacity={0.7}
                        strokeWidth={0.5}
                        listening={false}
                      />
                    ) : (
                      <Rect
                        key={index}
                        x={hole.x}
                        y={hole.y}
                        width={hole.width}
                        height={hole.height}
                        fill="rgba(0,0,0,0.2)"
                        stroke="black"
                        opacity={0.7}
                        strokeWidth={0.5}
                        listening={false}
                      />
                    ),
                  )}
                  {(shapePoints.length > 0
                    ? shapePoints
                    : defaultPanelPoints
                  ).map((point, index) => (
                    <Rect
                      key={index}
                      x={point.x - 3}
                      y={point.y - 3}
                      width={6}
                      height={6}
                      fill="grey"
                      opacity={0.7}
                      draggable
                      onClick={
                        activeTool === 'Curve'
                          ? () => handleCurveClick(index)
                          : undefined
                      }
                      onDragMove={(e) => {
                        const newPoints = [
                          ...(shapePoints.length > 0
                            ? shapePoints
                            : defaultPanelPoints),
                        ];
                        newPoints[index] = {
                          x: e.target.x() + 3,
                          y: e.target.y() + 3,
                        };
                        setShapePoints(newPoints);
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) {
                          container.style.cursor =
                            activeTool === 'Curve' ? 'crosshair' : 'pointer';
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
      <div className={styles.footer}>
        Origin at center • depth(D): {dimensions.width.toFixed(1)} • width(W):
        18.0 • height(H): {dimensions.height.toFixed(1)}
      </div>
      <div className={styles.miniThreeViewer}>
        <canvas ref={threeCanvasRef} />
      </div>
      {showConfirmExit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.popupHeader}>
              <FaExclamationTriangle className={styles.warningIcon} />
              <h2 className={styles.popupTitle}>
                The results of this edit will not be saved, will you confirm the
                exit editing?
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
