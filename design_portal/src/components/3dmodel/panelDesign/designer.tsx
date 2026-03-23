import { assets } from '@/svgPaths';
import Konva from 'konva';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Circle, Layer, Line, Path, Rect, Stage, Transformer } from 'react-konva';
import { useDispatch } from 'react-redux';
import * as THREE from 'three';
import { detectPlankByBoundingBox } from '../../utils/plankUtils';
import { GEOMETRY } from '../sceneCreator/interface';
import { RootState } from '../store';
import { updateObject } from '../store/dataSlice';
import { getDesignIdsFromRouter } from '../utils/routeIds';
import { PANEL_TOOLS } from './constants';
import { useStageManager } from './hooks/useStageManager';
import { useThreeScene } from './hooks/useThreeScene';
import styles from './panelDesign.module.css';
import { CornerType, CurveControls, Hole, Point } from './types';
import { getHoleBounds, getPanelBounds } from './utils/boundsUtils';
import {
  alignExtrudedGeometry,
  buildPathData,
  buildThreeShape,
  createHolePath,
  getTangents,
} from './utils/geometryUtils';
import { getSnappedPosition } from './utils/snappingUtils';

import { normalizeUVs } from '../sceneCreator/utils';
import { DimensionHighlighter } from './components/DimensionHighlighter';
import { HoleOffsetInputs } from './components/HoleOffsetInputs';
import { PanelHeader } from './components/PanelHeader';
import { HorizontalRuler, VerticalRuler } from './components/Rulers';
import { PreviewSidebar, PropertiesSidebar } from './components/Sidebars';

interface PanelDesignerProps {
  state: RootState;
}

/**
 * PanelDesigner Component
 *
 * A comprehensive 2D/3D interface for designing and modifying furniture panels.
 * Features:
 * - 2D Sketching: Draw outlines and "dig" holes using Konva.
 * - Real-time 3D Preview: Local Three.js scene synchronized with 2D edits.
 * - Geometry Refinement: Corner rounding, curve controls, and snapping system.
 * - State Synchronization: Projects 2D edits back to the main 3D global scene.
 *
 * @param state Global application state (RootState)
 */
export default function PanelDesigner({ state }: PanelDesignerProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { designId = '', versionId = '' } = getDesignIdsFromRouter(router);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  // States
  const [panelWidth, setpanelWidth] = useState(0);
  const [panelHeight, setpanelHeight] = useState(0);
  const [shapePoints, setShapePoints] = useState<Point[]>([]);
  const [cornerRadius, setcornerRadius] = useState<number[]>([]);
  const [cornerTypes, setCornerTypes] = useState<CornerType[]>([]);
  const [originalGeometry, setOriginalGeometry] = useState<THREE.BufferGeometry | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [plankThickness, setPlankThickness] = useState(18);
  const [selectedHoleIndex, setSelectedHoleIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [hoveredHoleIndex, setHoveredHoleIndex] = useState<number | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState(false);
  const [hoveredCornerIndex, setHoveredCornerIndex] = useState<number | null>(null);
  const [hoveredHolePointIndex, setHoveredHolePointIndex] = useState<number | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [isRotated2D, setIsRotated2D] = useState(false);
  const [thicknessAxis, setThicknessAxis] = useState<'x' | 'y' | 'z'>('y');

  const [previewPos, setPreviewPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 280 : 0,
    y: 25,
  });
  const [drawingPos, setDrawingPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 280 : 0,
    y: 293,
  });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [isDraggingDrawing, setIsDraggingDrawing] = useState(false);

  const [isDrawingHole, setIsDrawingHole] = useState(false);
  const [newHoleStart, setNewHoleStart] = useState<Point | null>(null);
  const [tempHole, setTempHole] = useState<Hole | null>(null);
  const [holeShape, setHoleShape] = useState<'rect' | 'circle' | 'polygon'>('rect');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState<number | null>(null);

  // Selected-hole offset inputs (relative to panel top-left)
  const [holeLeftInput, setHoleLeftInput] = useState<string>('');
  const [holeTopInput, setHoleTopInput] = useState<string>('');

  // Refs for persistent Three.js objects
  const selectedChildMeshRef = useRef<THREE.Mesh | null>(null);

  // Pen Tool & Curve Tool States
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [activeCurveDragKey, setActiveCurveDragKey] = useState<string | null>(null);
  const [curveControls, setCurveControls] = useState<CurveControls>({});
  const [snappingGuides, setSnappingGuides] = useState<{ type: 'x' | 'y'; value: number }[]>([]);

  const defaultPanelPoints = [
    { x: -panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: panelHeight / 2 },
    { x: -panelWidth / 2, y: panelHeight / 2 },
  ];

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const commitSelectedHoleOffsets = (nextLeftMm: number, nextTopMm: number) => {
    if (selectedHoleIndex === null) return;
    const hole = holes[selectedHoleIndex];
    if (!hole) return;

    const panelB = getPanelBounds(shapePoints, defaultPanelPoints);
    const holeB = getHoleBounds(hole);

    const maxLeft = Math.max(0, panelB.width - holeB.width);
    const maxTop = Math.max(0, panelB.height - holeB.height);

    const left = clamp(nextLeftMm, 0, maxLeft);
    const top = clamp(nextTopMm, 0, maxTop);

    const targetMinX = panelB.minX + left;
    const targetMinY = panelB.minY + top;

    setHoles((prev) => {
      const next = [...prev];
      const current = next[selectedHoleIndex];
      if (!current) return prev;

      if (current.type === 'polygon' && current.points?.length) {
        const curB = getHoleBounds(current);
        const dx = targetMinX - curB.minX;
        const dy = targetMinY - curB.minY;
        const movedPoints = current.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        next[selectedHoleIndex] = {
          ...current,
          points: movedPoints,
          x: targetMinX,
          y: targetMinY,
          width: curB.width,
          height: curB.height,
        };
        return next;
      }

      next[selectedHoleIndex] = {
        ...current,
        x: targetMinX,
        y: targetMinY,
      };
      return next;
    });

    // Keep inputs in sync with clamped values
    setHoleLeftInput(left.toFixed(1));
    setHoleTopInput(top.toFixed(1));
  };

  const parseMm = (s: string) => {
    const n = Number(String(s).replace(/[^\d.+-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    if (selectedHoleIndex === null || !holes[selectedHoleIndex]) {
      setHoleLeftInput('');
      setHoleTopInput('');
      return;
    }
    const panelB = getPanelBounds(shapePoints, defaultPanelPoints);
    const holeB = getHoleBounds(holes[selectedHoleIndex]);
    setHoleLeftInput((holeB.minX - panelB.minX).toFixed(1));
    setHoleTopInput((holeB.minY - panelB.minY).toFixed(1));
  }, [selectedHoleIndex, holes, shapePoints, panelWidth, panelHeight]);

  // Hooks
  const { stageRef, stageSize, stageScale, stagePosition, handleWheel, handleStageDrag } =
    useStageManager(panelWidth, panelHeight);

  const { threeCanvasRef, containerRef } = useThreeScene(
    shapePoints,
    defaultPanelPoints,
    cornerRadius,
    cornerTypes,
    holes,
    curveControls,
    plankThickness,
    isRotated2D,
    state
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawingShape(false);
        setCurrentDrawingPoints([]);
        setSnappingGuides([]);
        setMousePos(null);

        setIsDrawingHole(false);
        setTempHole(null);
        setNewHoleStart(null);

        setActiveCurveDragKey(null);
        setActiveTool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Effect hook to ensure corner radius and types arrays match the number of shape points.
   */
  useEffect(() => {
    const numPoints = shapePoints.length || 4;
    if (cornerRadius.length !== numPoints) setcornerRadius(Array(numPoints).fill(0));
    if (cornerTypes.length !== numPoints) setCornerTypes(Array(numPoints).fill('default'));
  }, [shapePoints]);

  // Handle selection changes and initialize dimensions
  useEffect(() => {
    const selectedObject = state?.data?.selectedObject;
    const selectedChildObject = state?.data?.selectedChildObject;
    const scene = state?.scene?.scene;

    if (!scene || !selectedObject || !selectedChildObject) {
      selectedChildMeshRef.current = null;
      if (designId && versionId) {
        router.push(`/design/${designId}/${versionId}`);
      }
      return;
    }

    // Find the mesh in the scene
    const selectedMesh = scene.children.find((obj) => obj.userData?.objectId === selectedObject);
    const mesh = selectedMesh?.children.find(
      (obj) => obj.userData?.objectId === selectedChildObject
    ) as THREE.Mesh | undefined;

    if (!mesh) {
      selectedChildMeshRef.current = null;
      return;
    }

    selectedChildMeshRef.current = mesh;

    // Initialize dimensions and original geometry
    if (mesh.geometry) {
      if (!originalGeometry || originalGeometry.uuid !== mesh.geometry.uuid) {
        if (!mesh.geometry.userData.isModified) {
          setOriginalGeometry(mesh.geometry.clone());
        }

        const objectData = state?.data?.objects?.find((obj: any) => obj.id === selectedChildObject);
        if (objectData?.panelDesign) {
          const pd = objectData.panelDesign;
          if (pd.outline?.length > 0) setShapePoints(pd.outline);
          if (pd.cornerRadius?.length > 0) setcornerRadius(pd.cornerRadius);
          if (pd.cornerTypes?.length > 0) setCornerTypes(pd.cornerTypes);
          if (pd.curveControls) setCurveControls(pd.curveControls);
          if (pd.holes?.length > 0) setHoles(pd.holes);
        } else {
          setShapePoints([]);
          setcornerRadius([]);
          setCornerTypes([]);
          setCurveControls({});
          setHoles([]);
        }
      }

      const plankInfo = detectPlankByBoundingBox(mesh);
      const { size, thicknessAxis: detectedAxis } = plankInfo;
      setThicknessAxis(detectedAxis);

      let w = 0,
        h = 0;
      if (detectedAxis === 'y') {
        w = size.x;
        h = size.z;
      } else if (detectedAxis === 'x') {
        w = size.z;
        h = size.y;
      } else {
        w = size.x;
        h = size.y;
      }

      if (h > w) {
        setpanelWidth(h);
        setpanelHeight(w);
        setIsRotated2D(true);
      } else {
        setpanelWidth(w);
        setpanelHeight(h);
        setIsRotated2D(false);
      }
      setPlankThickness(size[detectedAxis]);

      // Optimization: Clone material once upon selection to avoid cloning in the update loop
      const mainMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mainMat && !mainMat.userData.isCloned) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const cloned = m.clone();
            cloned.userData.isCloned = true;
            return cloned;
          });
        } else {
          mesh.material = mesh.material.clone();
          mesh.material.userData.isCloned = true;
        }
      }
    }
  }, [state?.scene?.scene, state?.data?.selectedObject, state?.data?.selectedChildObject]);

  /**
   * Generates and applies a new 3D geometry to the selected plank.
   * This function:
   * 1. Maps 2D points to 3D space based on orientation.
   * 2. Builds a THREE.Shape with holes.
   * 3. Extrudes the shape into THREE.ExtrudeGeometry.
   * 4. Aligns the new geometry using the alignExtrudedGeometry utility.
   */
  const updateMeshGeometry = () => {
    const mesh = selectedChildMeshRef.current;
    if (!mesh) return;

    // Determine target points (user-drawn or default)
    const points = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    const mappedPoints = isRotated2D ? points.map((p) => ({ x: -p.y, y: p.x })) : points;
    const getMappedPoint = (p: Point) => (isRotated2D ? { x: -p.y, y: p.x } : p);

    // Build the 2D shape with holes
    const mainShape = buildThreeShape(
      mappedPoints,
      cornerRadius,
      curveControls,
      'shape',
      cornerTypes
    );
    holes.forEach((hole, index) => {
      mainShape.holes.push(createHolePath(hole, index, curveControls, getMappedPoint, isRotated2D));
    });

    // Create 3D geometry and align it
    const newGeometry = new THREE.ExtrudeGeometry(mainShape, {
      depth: plankThickness,
      bevelEnabled: false,
      curveSegments: 32,
    });
    alignExtrudedGeometry(newGeometry, plankThickness, thicknessAxis, originalGeometry);
    normalizeUVs(newGeometry);

    // Update mesh metadata and swap geometry
    newGeometry.userData.oldGeometry = originalGeometry;
    newGeometry.userData.isModified = true;

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
  };

  /**
   * Effect hook to trigger geometry update when shape definition (points, holes, curves) changes.
   */
  useEffect(() => {
    updateMeshGeometry();
  }, [shapePoints, holes, cornerRadius, cornerTypes, curveControls, isRotated2D]);

  // Event Handlers

  /**
   * Effect hook for handling preview and drawing window dragging.
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPreview)
        setPreviewPos((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      else if (isDraggingDrawing)
        setDrawingPos((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
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

  /**
   * Triggers the confirmation modal before exiting the designer.
   */
  const handleCancel = () => setShowConfirmExit(true);

  /**
   * Reverts changes by restoring the original geometry and navigates back to the design view.
   */
  const confirmExit = () => {
    const scene = state?.scene?.scene;
    const selectedChildMesh = scene?.children
      .find((obj: any) => obj.userData?.objectId === state?.data?.selectedObject)
      ?.children.find((obj: any) => obj.userData?.objectId === state?.data?.selectedChildObject);
    if (selectedChildMesh instanceof THREE.Mesh && originalGeometry) {
      (selectedChildMesh as THREE.Mesh).geometry.dispose();
      (selectedChildMesh as THREE.Mesh).geometry = originalGeometry;
    }
    router.push(`/design/${designId}/${versionId}`);
  };

  /**
   * Restores the panel to a generic state, removing custom holes and outlines.
   */
  const handleRestoreDefault = () => {
    setShapePoints([]);
    setcornerRadius([]);
    setCornerTypes([]);
    setCurveControls({});
    setHoles([]);
  };

  /**
   * Finalizes the editing process by applying the geometry changes to the
   * main design scene and navigating back.
   */
  const handleComplete = () => {
    updateMeshGeometry();

    const selectedChildObject = state?.data?.selectedChildObject;
    if (selectedChildObject) {
      dispatch(
        updateObject({
          id: selectedChildObject,
          geometryType: GEOMETRY.EXTRUDE_GEOMETRY,
          panelDesign: {
            outline: shapePoints.length > 0 ? shapePoints : defaultPanelPoints,
            cornerRadius,
            cornerTypes,
            curveControls,
            holes,
          },
        })
      );
    }

    router.push(`/design/${designId}/${versionId}`);
  };

  /**
   * Aggregates all relevant points (panel vertices, hole vertices)
   * to be used by the proximity snapping system.
   */
  const getAllPoints = () => {
    const pts = shapePoints.length > 0 ? [...shapePoints] : [...defaultPanelPoints];
    holes.forEach((h) => h.type === 'polygon' && h.points && pts.push(...h.points));
    if (currentDrawingPoints.length > 0) pts.push(...currentDrawingPoints);
    return pts;
  };

  /**
   * Handles mouse down events on the Konva stage for drawing and digging operations.
   */
  const onStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const relativePos = stage?.getRelativePointerPosition();
    if (!relativePos) return;
    const { x: rawX, y: rawY } = relativePos;

    if (activeTool === PANEL_TOOLS.PENCIL) {
      const { snappedX, snappedY } = getSnappedPosition(rawX, rawY, getAllPoints(), stageScale);
      if (currentDrawingPoints.length > 0) {
        const dist = Math.hypot(
          currentDrawingPoints[0].x - snappedX,
          currentDrawingPoints[0].y - snappedY
        );
        if (dist < 15 / stageScale) {
          if (shapePoints.length === 0) setShapePoints(currentDrawingPoints);
          else {
            const xs = currentDrawingPoints.map((p) => p.x);
            const ys = currentDrawingPoints.map((p) => p.y);
            setHoles((prev) => [
              ...prev,
              {
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys),
                type: 'polygon',
                points: currentDrawingPoints,
                id: crypto.randomUUID(),
              },
            ]);
          }
          setCurrentDrawingPoints([]);
          setIsDrawingShape(false);
          setSnappingGuides([]);
          setMousePos(null);
          return;
        }
      }
      setCurrentDrawingPoints((prev) => [...prev, { x: snappedX, y: snappedY }]);
      setIsDrawingShape(true);
    } else if (activeTool === PANEL_TOOLS.DIG) {
      if (holeShape === 'polygon') {
        const { snappedX, snappedY } = getSnappedPosition(rawX, rawY, getAllPoints(), stageScale);
        if (
          currentDrawingPoints.length > 0 &&
          Math.hypot(currentDrawingPoints[0].x - snappedX, currentDrawingPoints[0].y - snappedY) <
            15 / stageScale
        ) {
          const xs = currentDrawingPoints.map((p) => p.x);
          const ys = currentDrawingPoints.map((p) => p.y);
          setHoles((prev) => [
            ...prev,
            {
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
              type: 'polygon',
              points: currentDrawingPoints,
              id: crypto.randomUUID(),
            },
          ]);
          setCurrentDrawingPoints([]);
          setIsDrawingShape(false);
          setSnappingGuides([]);
          return;
        }
        setCurrentDrawingPoints((prev) => [...prev, { x: snappedX, y: snappedY }]);
        setIsDrawingShape(true);
      } else {
        setNewHoleStart({ x: rawX, y: rawY });
        setTempHole(null);
        setIsDrawingHole(true);
      }
    }
  };

  /**
   * Handles mouse move events for previewing shapes, updating snapping guides,
   * or adjusting curve control points during the drawing process.
   */
  const onStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const relativePos = stage?.getRelativePointerPosition();
    if (!relativePos) return;
    const { x: rawX, y: rawY } = relativePos;

    if (isDrawingShape && currentDrawingPoints.length > 0) {
      const { snappedX, snappedY, guides } = getSnappedPosition(
        rawX,
        rawY,
        getAllPoints(),
        stageScale
      );
      setMousePos({ x: snappedX, y: snappedY });
      setSnappingGuides(guides);
    } else if (isDrawingHole && newHoleStart) {
      const dx = rawX - newHoleStart.x,
        dy = rawY - newHoleStart.y;
      if (holeShape === 'circle') {
        const circleRadius = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
        setTempHole({
          x: newHoleStart.x + dx / 2 - circleRadius,
          y: newHoleStart.y + dy / 2 - circleRadius,
          width: circleRadius * 2,
          height: circleRadius * 2,
          type: 'circle',
          radius: circleRadius,
        });
      } else {
        const minX = Math.min(newHoleStart.x, rawX);
        const minY = Math.min(newHoleStart.y, rawY);
        const w = Math.abs(dx);
        const h = Math.abs(dy);

        setTempHole({
          x: minX,
          y: minY,
          width: w,
          height: h,
          type: holeShape,
          points:
            holeShape === 'rect'
              ? [
                  { x: minX, y: minY },
                  { x: minX + w, y: minY },
                  { x: minX + w, y: minY + h },
                  { x: minX, y: minY + h },
                ]
              : undefined,
        });
      }
    } else if (activeCurveDragKey) {
      setCurveControls((prev) => ({ ...prev, [activeCurveDragKey]: { x: rawX, y: rawY } }));
    }
  };

  const toolsList = [
    { name: PANEL_TOOLS.UNDO, icon: assets.undo },
    { name: PANEL_TOOLS.REDO, icon: assets.redo },
    { name: PANEL_TOOLS.RESTORE, icon: assets.undo },
    { name: PANEL_TOOLS.PENCIL, icon: assets.pencil },
    {
      name: PANEL_TOOLS.DIG,
      icon: assets.dig,
      subTools: ['rect', 'polygon', 'circle'],
    },
  ];

  return (
    <div className={styles.designerContainer}>
      <PanelHeader
        tools={toolsList}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        holeShape={holeShape}
        setHoleShape={setHoleShape}
        handleCancel={handleCancel}
        handleComplete={handleComplete}
        handleRestoreDefault={handleRestoreDefault}
      />

      <HorizontalRuler
        stageSize={stageSize}
        stagePosition={stagePosition}
        stageScale={stageScale}
        activeTool={activeTool}
      />

      <div className={styles.canvasAndSidebar}>
        <div className={styles.canvasWrapper} style={{ marginTop: 0 }}>
          <VerticalRuler
            stageSize={stageSize}
            stagePosition={stagePosition}
            stageScale={stageScale}
            activeTool={activeTool}
          />
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            onWheel={handleWheel}
            draggable={!isDrawingHole && !isDrawingShape}
            onDragEnd={handleStageDrag}
            onMouseDown={onStageMouseDown}
            onMouseMove={onStageMouseMove}
            onMouseUp={() => {
              if (isDrawingHole && tempHole) {
                const holeToAdd = { ...tempHole, id: crypto.randomUUID() };
                if (holeToAdd.type === 'rect') {
                  holeToAdd.type = 'polygon';
                  holeToAdd.points = [
                    { x: holeToAdd.x, y: holeToAdd.y },
                    { x: holeToAdd.x + holeToAdd.width, y: holeToAdd.y },
                    { x: holeToAdd.x + holeToAdd.width, y: holeToAdd.y + holeToAdd.height },
                    { x: holeToAdd.x, y: holeToAdd.y + holeToAdd.height },
                  ];
                }
                setHoles((prev) => [...prev, holeToAdd]);
              }
              setIsDrawingHole(false);
              setTempHole(null);
              setNewHoleStart(null);
              setActiveCurveDragKey(null);
            }}
            style={{ backgroundColor: '#fff', display: 'block' }}
          >
            <Layer>
              {/* Background reset: clears hovers when mouse is not over any object */}
              <Rect
                width={stageSize.width * 5}
                height={stageSize.height * 5}
                x={-stageSize.width * 2}
                y={-stageSize.height * 2}
                fill="transparent"
                onMouseEnter={(e) => {
                  setHoveredHoleIndex(null);
                  setHoveredPanel(false);
                  setHoveredLineIndex(null);
                  setHoveredCornerIndex(null);
                  setHoveredHolePointIndex(null);
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                }}
              />
              <Path
                data={buildPathData(
                  shapePoints.length > 0 ? shapePoints : defaultPanelPoints,
                  cornerRadius,
                  cornerTypes,
                  curveControls
                )}
                fill="rgba(57, 37, 121, 0.15)"
                stroke="#392579"
                strokeWidth={1}
                hitStrokeWidth={20}
                fillRule="evenodd"
                onMouseEnter={(e) => {
                  setHoveredPanel(true);
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'pointer';
                }}
                onMouseLeave={() => {
                  setHoveredLineIndex(null);
                }}
              />
              {/* Dotted lines showing original corner when Round/Chamfer is active */}
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((_, i) => {
                const pts = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
                const r = cornerRadius[i] || 0;
                const type = cornerTypes[i] || 'default';
                if (r <= 0 || type === 'default') return null;
                const tangents = getTangents(pts, i, cornerRadius);
                const p1 = pts[i];
                if (
                  tangents.tp_in.x === p1.x &&
                  tangents.tp_in.y === p1.y &&
                  tangents.tp_out.x === p1.x &&
                  tangents.tp_out.y === p1.y
                )
                  return null;
                return (
                  <React.Fragment key={`corner-dotted-${i}`}>
                    <Line
                      points={[tangents.tp_in.x, tangents.tp_in.y, p1.x, p1.y]}
                      stroke="#718096"
                      strokeWidth={1}
                      dash={[4, 3]}
                      opacity={0.7}
                      listening={false}
                    />
                    <Line
                      points={[p1.x, p1.y, tangents.tp_out.x, tangents.tp_out.y]}
                      stroke="#718096"
                      strokeWidth={1}
                      dash={[4, 3]}
                      opacity={0.7}
                      listening={false}
                    />
                  </React.Fragment>
                );
              })}
              {/* Panel Edges Highlighting - listening={false} to avoid event theft */}
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p, i, arr) => {
                const nextP = arr[(i + 1) % arr.length];
                const isHovered = hoveredLineIndex === i && hoveredPanel;
                const isSelected = selectedLineIndex === i && selectedHoleIndex === null;
                return (
                  <Line
                    key={`panel-edge-${i}`}
                    points={[p.x, p.y, nextP.x, nextP.y]}
                    stroke={isHovered || isSelected ? '#12086f' : 'transparent'}
                    strokeWidth={3}
                    hitStrokeWidth={20}
                    listening={false}
                  />
                );
              })}
              {/* Invisible trigger lines for panel edges - rendered first so corner points take priority */}
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p, i, arr) => {
                const nextP = arr[(i + 1) % arr.length];
                return (
                  <Line
                    key={`panel-edge-trigger-${i}`}
                    points={[p.x, p.y, nextP.x, nextP.y]}
                    stroke="transparent"
                    strokeWidth={20 / stageScale}
                    hitStrokeWidth={20 / stageScale}
                    onMouseEnter={(e) => {
                      if (hoveredCornerIndex === null && selectedCornerIndex === null) {
                        setHoveredLineIndex(i);
                        setHoveredPanel(true);
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }
                    }}
                    onMouseLeave={() => setHoveredLineIndex(null)}
                    onClick={() => {
                      setSelectedLineIndex(i);
                      setSelectedHoleIndex(null);
                      setSelectedCornerIndex(null);
                      setSelectedPointIndex(null);
                    }}
                  />
                );
              })}
              {tempHole &&
                (tempHole.type === 'circle' ? (
                  <Circle
                    x={tempHole.x + tempHole.width / 2}
                    y={tempHole.y + tempHole.height / 2}
                    radius={tempHole.width / 2}
                    fill="rgba(0,0,0,0.2)"
                    stroke="black"
                  />
                ) : (
                  <Rect
                    x={tempHole.x}
                    y={tempHole.y}
                    width={tempHole.width}
                    height={tempHole.height}
                    fill="rgba(0,0,0,0.2)"
                    stroke="black"
                  />
                ))}
              {/* Panel corners rendered BEFORE holes so hole points take priority when overlapping */}
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p, i) => (
                <Rect
                  key={`panel-corner-vis-${i}`}
                  x={p.x - 5}
                  y={p.y - 5}
                  width={10}
                  height={10}
                  fill={
                    selectedCornerIndex === i
                      ? '#12086f'
                      : hoveredCornerIndex === i
                        ? '#12086f'
                        : 'white'
                  }
                  stroke="#12086f"
                  strokeWidth={1}
                  opacity={
                    selectedCornerIndex === i ||
                    hoveredCornerIndex === i ||
                    hoveredPanel ||
                    selectedHoleIndex !== null
                      ? 0.8
                      : 0
                  }
                  listening={false}
                />
              ))}
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p, i) => (
                <Rect
                  key={`panel-corner-trigger-${i}`}
                  x={p.x - 12 / stageScale}
                  y={p.y - 12 / stageScale}
                  width={24 / stageScale}
                  height={24 / stageScale}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    setHoveredCornerIndex(i);
                    setHoveredLineIndex(null);
                    setHoveredHolePointIndex(null);
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => setHoveredCornerIndex(null)}
                  draggable
                  onDragMove={(e) => {
                    const { snappedX, snappedY, guides } = getSnappedPosition(
                      e.target.x() + 12 / stageScale,
                      e.target.y() + 12 / stageScale,
                      getAllPoints(),
                      stageScale,
                      p
                    );
                    e.target.x(snappedX - 12 / stageScale);
                    e.target.y(snappedY - 12 / stageScale);
                    setSnappingGuides(guides);
                    setShapePoints((prev) => {
                      const next = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
                      next[i] = { x: snappedX, y: snappedY };
                      return next;
                    });
                  }}
                  onDragEnd={() => setSnappingGuides([])}
                  onClick={() => {
                    setSelectedCornerIndex(i);
                    setSelectedHoleIndex(null);
                    setSelectedPointIndex(null);
                    setSelectedLineIndex(null);
                  }}
                />
              ))}
              {holes.map((hole, index) => {
                const commonProps = {
                  key: index,
                  fill: 'rgba(0,0,0,0.2)',
                  stroke:
                    selectedHoleIndex === index || hoveredHoleIndex === index ? '#12086f' : 'black',
                  opacity: 0.7,
                  strokeWidth: hoveredHoleIndex === index ? 1.5 : 0.5,
                  onClick: () => {
                    setSelectedHoleIndex(index);
                    setSelectedPointIndex(null);
                    setSelectedLineIndex(null);
                    setSelectedCornerIndex(null);
                  },
                  onMouseEnter: (e: any) => {
                    setHoveredHoleIndex(index);
                    setHoveredCornerIndex(null);
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  },
                  onMouseLeave: () => {
                    // Do not set null here if we might be entering a trigger
                    // Instead, we let the stage or other objects handle the clear
                  },
                };
                if (hole.type === 'circle') {
                  const cx = hole.x + hole.width / 2;
                  const cy = hole.y + hole.height / 2;
                  const r = Math.min(hole.width, hole.height) / 2;
                  const corners = [
                    { x: hole.x, y: hole.y },
                    { x: hole.x + hole.width, y: hole.y },
                    { x: hole.x + hole.width, y: hole.y + hole.height },
                    { x: hole.x, y: hole.y + hole.height },
                  ];
                  return (
                    <React.Fragment key={`hole-circle-container-${index}`}>
                      <Circle {...commonProps} x={cx} y={cy} radius={r} />
                      {((selectedHoleIndex === index && selectedPointIndex !== null) ||
                        (selectedPointIndex === null &&
                          ((hoveredHoleIndex === index && hoveredHolePointIndex !== null) ||
                            ((selectedHoleIndex === index || hoveredHoleIndex === index) &&
                              hoveredHolePointIndex === null)))) &&
                        corners.map((p, pIdx, arr) => {
                          const nextP = arr[(pIdx + 1) % arr.length];
                          const isEdgeHovered =
                            hoveredLineIndex === pIdx && hoveredHoleIndex === index;
                          const isEdgeSelected =
                            selectedLineIndex === pIdx && selectedHoleIndex === index;
                          return (
                            <Line
                              key={`h-${index}-edge-${pIdx}`}
                              points={[p.x, p.y, nextP.x, nextP.y]}
                              stroke={isEdgeHovered || isEdgeSelected ? '#12086f' : 'transparent'}
                              strokeWidth={3}
                              hitStrokeWidth={20 / stageScale}
                              listening={false}
                            />
                          );
                        })}
                      {((selectedHoleIndex === index && selectedPointIndex !== null) ||
                        (selectedPointIndex === null &&
                          ((hoveredHoleIndex === index && hoveredHolePointIndex !== null) ||
                            ((selectedHoleIndex === index || hoveredHoleIndex === index) &&
                              hoveredHolePointIndex === null)))) &&
                        corners.map((p, pIdx, arr) => {
                          const nextP = arr[(pIdx + 1) % arr.length];
                          return (
                            <Line
                              key={`h-${index}-edge-trigger-${pIdx}`}
                              points={[p.x, p.y, nextP.x, nextP.y]}
                              stroke="transparent"
                              strokeWidth={20 / stageScale}
                              hitStrokeWidth={20 / stageScale}
                              onMouseEnter={(e) => {
                                if (hoveredHolePointIndex === null && selectedPointIndex === null) {
                                  setHoveredLineIndex(pIdx);
                                  setHoveredHoleIndex(index);
                                  setHoveredCornerIndex(null);
                                  const container = e.target.getStage()?.container();
                                  if (container) container.style.cursor = 'pointer';
                                }
                              }}
                              onMouseLeave={() => setHoveredLineIndex(null)}
                              onClick={() => {
                                setSelectedHoleIndex(index);
                                setSelectedLineIndex(pIdx);
                                setSelectedPointIndex(null);
                                setSelectedCornerIndex(null);
                              }}
                            />
                          );
                        })}
                      {(selectedHoleIndex === index || hoveredHoleIndex === index) &&
                        corners.map((p, pIdx) => (
                          <Rect
                            key={`h-${index}-p-${pIdx}`}
                            x={p.x - 5}
                            y={p.y - 5}
                            width={10}
                            height={10}
                            fill={hoveredHolePointIndex === pIdx ? '#12086f' : 'white'}
                            stroke="#12086f"
                            strokeWidth={1}
                            opacity={0.8}
                            listening={false}
                          />
                        ))}
                      {(selectedHoleIndex === index || hoveredHoleIndex === index) &&
                        corners.map((p, pIdx) => (
                          <Rect
                            key={`h-${index}-p-trigger-${pIdx}`}
                            x={p.x - 8 / stageScale}
                            y={p.y - 8 / stageScale}
                            width={16 / stageScale}
                            height={16 / stageScale}
                            fill="transparent"
                            onMouseEnter={(e) => {
                              setHoveredHoleIndex(index);
                              setHoveredHolePointIndex(pIdx);
                              setHoveredLineIndex(null);
                              setHoveredCornerIndex(null);
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'pointer';
                            }}
                            onMouseLeave={() => setHoveredHolePointIndex(null)}
                          />
                        ))}
                    </React.Fragment>
                  );
                } else if (hole.type === 'polygon' && hole.points) {
                  return (
                    <React.Fragment key={`hole-poly-container-${index}`}>
                      <Path
                        {...commonProps}
                        key={`hole-poly-${index}`}
                        data={buildPathData(
                          hole.points,
                          hole.cornerRadius ?? new Array(hole.points.length).fill(0),
                          hole.cornerTypes ?? Array(hole.points.length).fill('default'),
                          curveControls,
                          `hole_${index}`
                        )}
                        hitStrokeWidth={20}
                      />
                      {hole.points.map((_, pIdx) => {
                        const pts = hole.points!;
                        const radii = hole.cornerRadius ?? [];
                        const types = hole.cornerTypes ?? [];
                        const r = radii[pIdx] ?? 0;
                        const type = types[pIdx] ?? 'default';
                        if (r <= 0 || type === 'default') return null;
                        const tangents = getTangents(pts, pIdx, hole.cornerRadius ?? []);
                        const p1 = pts[pIdx];
                        if (
                          tangents.tp_in.x === p1.x &&
                          tangents.tp_in.y === p1.y &&
                          tangents.tp_out.x === p1.x &&
                          tangents.tp_out.y === p1.y
                        )
                          return null;
                        return (
                          <React.Fragment key={`hole-dotted-${index}-${pIdx}`}>
                            <Line
                              points={[tangents.tp_in.x, tangents.tp_in.y, p1.x, p1.y]}
                              stroke="#718096"
                              strokeWidth={1}
                              dash={[4, 3]}
                              opacity={0.7}
                              listening={false}
                            />
                            <Line
                              points={[p1.x, p1.y, tangents.tp_out.x, tangents.tp_out.y]}
                              stroke="#718096"
                              strokeWidth={1}
                              dash={[4, 3]}
                              opacity={0.7}
                              listening={false}
                            />
                          </React.Fragment>
                        );
                      })}
                      {((selectedHoleIndex === index && selectedPointIndex !== null) ||
                        (selectedPointIndex === null &&
                          ((hoveredHoleIndex === index && hoveredHolePointIndex !== null) ||
                            ((selectedHoleIndex === index || hoveredHoleIndex === index) &&
                              hoveredHolePointIndex === null)))) && (
                        <>
                          {hole.points.map((p, pIdx, arr) => {
                            const nextP = arr[(pIdx + 1) % arr.length];
                            const isEdgeHovered =
                              hoveredLineIndex === pIdx && hoveredHoleIndex === index;
                            const isEdgeSelected =
                              selectedLineIndex === pIdx && selectedHoleIndex === index;
                            return (
                              <Line
                                key={`h-${index}-edge-${pIdx}`}
                                points={[p.x, p.y, nextP.x, nextP.y]}
                                stroke={isEdgeHovered || isEdgeSelected ? '#12086f' : 'transparent'}
                                strokeWidth={3}
                                hitStrokeWidth={0}
                                listening={false}
                              />
                            );
                          })}
                          {hole.points.map((p, pIdx, arr) => {
                            const nextP = arr[(pIdx + 1) % arr.length];
                            return (
                              <Line
                                key={`h-${index}-edge-trigger-${pIdx}`}
                                points={[p.x, p.y, nextP.x, nextP.y]}
                                stroke="transparent"
                                strokeWidth={20 / stageScale}
                                hitStrokeWidth={20 / stageScale}
                                onMouseEnter={(e) => {
                                  if (
                                    hoveredHolePointIndex === null &&
                                    selectedPointIndex === null
                                  ) {
                                    setHoveredLineIndex(pIdx);
                                    setHoveredHoleIndex(index);
                                    setHoveredCornerIndex(null);
                                    const container = e.target.getStage()?.container();
                                    if (container) container.style.cursor = 'pointer';
                                  }
                                }}
                                onMouseLeave={() => setHoveredLineIndex(null)}
                                onClick={() => {
                                  setSelectedHoleIndex(index);
                                  setSelectedLineIndex(pIdx);
                                  setSelectedPointIndex(null);
                                  setSelectedCornerIndex(null);
                                }}
                                draggable={
                                  selectedHoleIndex === index && selectedLineIndex === pIdx
                                }
                                dragBoundFunc={() => ({ x: 0, y: 0 })}
                                onDragStart={(e) => {
                                  const stage = e.target.getStage();
                                  if (!stage) return;
                                  const pos = stage.getPointerPosition();
                                  if (!pos) return;
                                  const localPos = stage
                                    .getAbsoluteTransform()
                                    .copy()
                                    .invert()
                                    .point(pos);
                                  (e.target as any).setAttr('startPos', localPos);
                                  (e.target as any).setAttr(
                                    'startPoints',
                                    JSON.parse(JSON.stringify(hole.points))
                                  );
                                }}
                                onDragMove={(e) => {
                                  const stage = e.target.getStage();
                                  if (!stage) return;
                                  const pos = stage.getPointerPosition();
                                  if (!pos) return;
                                  const localPos = stage
                                    .getAbsoluteTransform()
                                    .copy()
                                    .invert()
                                    .point(pos);

                                  const startPos = (e.target as any).getAttr('startPos');
                                  const startPoints = (e.target as any).getAttr('startPoints');
                                  if (!startPos || !startPoints) return;

                                  const dx = localPos.x - startPos.x;
                                  const dy = localPos.y - startPos.y;

                                  const p1 = startPoints[pIdx];
                                  const p2 = startPoints[(pIdx + 1) % startPoints.length];
                                  const len = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                                  if (len === 0) return;
                                  const nx = -(p2.y - p1.y) / len;
                                  const ny = (p2.x - p1.x) / len;
                                  const dist = dx * nx + dy * ny;
                                  const moveX = nx * dist;
                                  const moveY = ny * dist;

                                  setHoles((prev: any) => {
                                    const next = [...prev];
                                    const h = { ...next[index] };
                                    if (h.points) {
                                      const pts = [...startPoints];
                                      pts[pIdx] = {
                                        x: pts[pIdx].x + moveX,
                                        y: pts[pIdx].y + moveY,
                                      };
                                      pts[(pIdx + 1) % pts.length] = {
                                        x: pts[(pIdx + 1) % pts.length].x + moveX,
                                        y: pts[(pIdx + 1) % pts.length].y + moveY,
                                      };
                                      h.points = pts;
                                      next[index] = h;
                                    }
                                    return next;
                                  });
                                }}
                              />
                            );
                          })}
                          {hole.points.map((p, pIdx) => (
                            <Rect
                              key={`h-${index}-p-${pIdx}`}
                              x={p.x - 5}
                              y={p.y - 5}
                              width={10}
                              height={10}
                              fill={
                                selectedPointIndex === pIdx
                                  ? '#12086f'
                                  : hoveredHolePointIndex === pIdx
                                    ? '#12086f'
                                    : 'white'
                              }
                              stroke="#12086f"
                              strokeWidth={1}
                              listening={false}
                            />
                          ))}
                          {hole.points.map((p, pIdx) => (
                            <Rect
                              key={`h-${index}-p-trigger-${pIdx}`}
                              x={p.x - 8 / stageScale}
                              y={p.y - 8 / stageScale}
                              width={16 / stageScale}
                              height={16 / stageScale}
                              fill="transparent"
                              onMouseEnter={(e) => {
                                setHoveredHoleIndex(index);
                                setHoveredHolePointIndex(pIdx);
                                setHoveredLineIndex(null);
                                setHoveredCornerIndex(null);
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'pointer';
                              }}
                              onMouseLeave={() => setHoveredHolePointIndex(null)}
                              onClick={() => {
                                setSelectedHoleIndex(index);
                                setSelectedPointIndex(pIdx);
                                setSelectedCornerIndex(null);
                                setSelectedLineIndex(null);
                                setHoveredHoleIndex(null);
                                setHoveredHolePointIndex(null);
                              }}
                              draggable
                              onDragMove={(e) => {
                                const { snappedX, snappedY } = getSnappedPosition(
                                  e.target.x() + 8 / stageScale,
                                  e.target.y() + 8 / stageScale,
                                  getAllPoints(),
                                  stageScale,
                                  p
                                );
                                e.target.x(snappedX - 8 / stageScale);
                                e.target.y(snappedY - 8 / stageScale);
                                setHoles((prev) => {
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
                } else if (hole.type === 'slotting' || hole.type === 'rect' || !hole.type) {
                  const r = hole.type === 'slotting' ? Math.min(hole.width, hole.height) / 2 : 0;
                  const corners = [
                    { x: hole.x, y: hole.y },
                    { x: hole.x + hole.width, y: hole.y },
                    { x: hole.x + hole.width, y: hole.y + hole.height },
                    { x: hole.x, y: hole.y + hole.height },
                  ];
                  return (
                    <React.Fragment key={`hole-rect-container-${index}`}>
                      <Rect
                        {...commonProps}
                        x={hole.x}
                        y={hole.y}
                        width={hole.width}
                        height={hole.height}
                        cornerRadius={r}
                        hitStrokeWidth={20}
                      />
                      {((selectedHoleIndex === index && selectedPointIndex !== null) ||
                        (selectedPointIndex === null &&
                          ((hoveredHoleIndex === index && hoveredHolePointIndex !== null) ||
                            ((selectedHoleIndex === index || hoveredHoleIndex === index) &&
                              hoveredHolePointIndex === null)))) && (
                        <>
                          {corners.map((p, pIdx, arr) => {
                            const nextP = arr[(pIdx + 1) % arr.length];
                            const isEdgeHovered =
                              hoveredLineIndex === pIdx && hoveredHoleIndex === index;
                            const isEdgeSelected =
                              selectedLineIndex === pIdx && selectedHoleIndex === index;
                            return (
                              <Line
                                key={`h-${index}-edge-${pIdx}`}
                                points={[p.x, p.y, nextP.x, nextP.y]}
                                stroke={isEdgeHovered || isEdgeSelected ? '#12086f' : 'transparent'}
                                strokeWidth={3}
                                hitStrokeWidth={0}
                                listening={false}
                              />
                            );
                          })}
                          {corners.map((p, pIdx, arr) => {
                            const nextP = arr[(pIdx + 1) % arr.length];
                            return (
                              <Line
                                key={`h-${index}-edge-trigger-${pIdx}`}
                                points={[p.x, p.y, nextP.x, nextP.y]}
                                stroke="transparent"
                                strokeWidth={20 / stageScale}
                                hitStrokeWidth={20 / stageScale}
                                onMouseEnter={(e) => {
                                  if (
                                    hoveredHolePointIndex === null &&
                                    selectedPointIndex === null
                                  ) {
                                    setHoveredLineIndex(pIdx);
                                    setHoveredHoleIndex(index);
                                    setHoveredCornerIndex(null);
                                    const container = e.target.getStage()?.container();
                                    if (container) container.style.cursor = 'pointer';
                                  }
                                }}
                                onMouseLeave={() => setHoveredLineIndex(null)}
                                onClick={() => {
                                  setSelectedHoleIndex(index);
                                  setSelectedLineIndex(pIdx);
                                  setSelectedPointIndex(null);
                                  setSelectedCornerIndex(null);
                                }}
                              />
                            );
                          })}
                          {corners.map((p, pIdx) => (
                            <Rect
                              key={`h-${index}-p-${pIdx}`}
                              x={p.x - 5}
                              y={p.y - 5}
                              width={10}
                              height={10}
                              fill={
                                selectedPointIndex === pIdx
                                  ? '#12086f'
                                  : hoveredHolePointIndex === pIdx
                                    ? '#12086f'
                                    : 'white'
                              }
                              stroke="#12086f"
                              strokeWidth={1}
                              opacity={0.8}
                              listening={false}
                            />
                          ))}
                          {corners.map((p, pIdx) => (
                            <Rect
                              key={`h-${index}-p-trigger-${pIdx}`}
                              x={p.x - 8 / stageScale}
                              y={p.y - 8 / stageScale}
                              width={16 / stageScale}
                              height={16 / stageScale}
                              fill="transparent"
                              onMouseEnter={(e) => {
                                setHoveredHoleIndex(index);
                                setHoveredHolePointIndex(pIdx);
                                setHoveredLineIndex(null);
                                setHoveredCornerIndex(null);
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'pointer';
                              }}
                              onMouseLeave={() => setHoveredHolePointIndex(null)}
                              onClick={() => {
                                setHoles((prev) => {
                                  const next = [...prev];
                                  const h = next[index];
                                  if (h.type === 'rect' || h.type === 'slotting' || !h.type) {
                                    next[index] = {
                                      ...h,
                                      type: 'polygon',
                                      points: [
                                        { x: h.x, y: h.y },
                                        { x: h.x + h.width, y: h.y },
                                        { x: h.x + h.width, y: h.y + h.height },
                                        { x: h.x, y: h.y + h.height },
                                      ],
                                    };
                                  }
                                  return next;
                                });
                                setSelectedHoleIndex(index);
                                setSelectedPointIndex(pIdx);
                                setSelectedCornerIndex(null);
                                setSelectedLineIndex(null);
                                setHoveredHoleIndex(null);
                                setHoveredHolePointIndex(null);
                              }}
                            />
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                }
              })}
              {snappingGuides.map((g, i) => (
                <Line
                  key={i}
                  points={
                    g.type === 'x'
                      ? [g.value, -10000, g.value, 10000]
                      : [-10000, g.value, 10000, g.value]
                  }
                  stroke="red"
                  strokeWidth={1 / stageScale}
                  dash={[4, 4]}
                />
              ))}
              {currentDrawingPoints.length > 0 && (
                <>
                  <Line
                    points={currentDrawingPoints
                      .flatMap((p) => [p.x, p.y])
                      .concat(mousePos ? [mousePos.x, mousePos.y] : [])}
                    stroke="green"
                    strokeWidth={0.5}
                  />
                  {currentDrawingPoints.map((p, i) => (
                    <Circle key={i} x={p.x} y={p.y} radius={3} fill={i === 0 ? 'orange' : 'blue'} />
                  ))}
                </>
              )}
              <DimensionHighlighter
                hoveredHoleIndex={hoveredHoleIndex}
                selectedHoleIndex={selectedHoleIndex}
                hoveredPanel={hoveredPanel}
                holes={holes}
                shapePoints={shapePoints}
                defaultPanelPoints={defaultPanelPoints}
                tempHole={
                  tempHole ||
                  (isDrawingShape && currentDrawingPoints.length > 0
                    ? {
                        x: 0,
                        y: 0,
                        width: 0,
                        height: 0,
                        type: 'polygon',
                        points: [...currentDrawingPoints, ...(mousePos ? [mousePos] : [])],
                      }
                    : undefined)
                }
                showSelectedHoleOffsets
              />
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(newBox) => newBox}
                anchorSize={8}
                anchorStroke="#000"
                anchorFill="#fff"
                anchorCornerRadius={2}
                listening={false}
              />
            </Layer>
          </Stage>

          {selectedHoleIndex !== null && holes[selectedHoleIndex] && (
            <HoleOffsetInputs
              hole={holes[selectedHoleIndex]}
              shapePoints={shapePoints}
              defaultPanelPoints={defaultPanelPoints}
              stageRef={stageRef}
              stagePosition={stagePosition}
              stageScale={stageScale}
              leftValue={holeLeftInput}
              topValue={holeTopInput}
              onLeftChange={setHoleLeftInput}
              onTopChange={setHoleTopInput}
              onCommit={() => {
                const l = parseMm(holeLeftInput);
                const t = parseMm(holeTopInput);
                if (l !== null && t !== null) commitSelectedHoleOffsets(l, t);
              }}
            />
          )}
        </div>
        <PreviewSidebar
          previewPos={previewPos}
          setIsDraggingPreview={setIsDraggingPreview}
          containerRef={containerRef}
          threeCanvasRef={threeCanvasRef}
        />
        <PropertiesSidebar
          drawingPos={drawingPos}
          setIsDraggingDrawing={setIsDraggingDrawing}
          selectedHoleIndex={selectedHoleIndex}
          selectedLineIndex={selectedLineIndex}
          selectedPointIndex={selectedPointIndex}
          selectedCornerIndex={selectedCornerIndex}
          holes={holes}
          setHoles={setHoles}
          shapePoints={shapePoints}
          defaultPanelPoints={defaultPanelPoints}
          setShapePoints={setShapePoints}
          panelWidth={panelWidth}
          isRotated2D={isRotated2D}
          setSelectedHoleIndex={setSelectedHoleIndex}
          cornerRadius={cornerRadius}
          setCornerRadius={setcornerRadius}
          cornerTypes={cornerTypes}
          setCornerTypes={setCornerTypes}
        />
      </div>

      <div className={styles.footer}>
        Origin at center • depth(T): {plankThickness.toFixed(1)} mm • width(W):{' '}
        {panelWidth.toFixed(1)} mm • height(H): {panelHeight.toFixed(1)} mm
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
                onClick={() => setShowConfirmExit(false)}
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
    </div>
  );
}
