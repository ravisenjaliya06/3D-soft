import { assets } from '@/svgPaths';
import Konva from 'konva';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Circle, Layer, Line, Path, Rect, Stage, Transformer, Text as KonvaText } from 'react-konva';
import * as THREE from 'three';
import { detectPlankByBoundingBox } from '../../utils/plankUtils';
import { RootState } from '../store';
import styles from './panelDesign.module.css';

import { Hole, Point, CurveControls, CornerType } from './types';
import { buildPathData, buildThreeShape, getGeometryCenter, createHolePath, alignExtrudedGeometry } from './utils/geometryUtils';
import { getSnappedPosition } from './utils/snappingUtils';
import { useStageManager } from './hooks/useStageManager';
import { useThreeScene } from './hooks/useThreeScene';

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
  const designId = window.location.pathname.split('/')[2];
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const panelRef = useRef<Konva.Rect | null>(null);

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
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [isRotated2D, setIsRotated2D] = useState(false);
  const [thicknessAxis, setThicknessAxis] = useState<'x' | 'y' | 'z'>('y');

  const [activeTab] = useState<'3D' | 'Drawing'>('Drawing');
  const [previewPos, setPreviewPos] = useState({ x: window.innerWidth - 350, y: 110 });
  const [drawingPos, setDrawingPos] = useState({ x: window.innerWidth - 350, y: 400 });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [isDraggingDrawing, setIsDraggingDrawing] = useState(false);

  const [isDrawingHole, setIsDrawingHole] = useState(false);
  const [newHoleStart, setNewHoleStart] = useState<Point | null>(null);
  const [tempHole, setTempHole] = useState<Hole | null>(null);
  const [holeShape, setHoleShape] = useState<'rect' | 'circle' | 'polygon' | 'slotting'>('rect');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState<number | null>(null);
  const [showRadiusInput, setShowRadiusInput] = useState(false);

  // Refs for persistent Three.js objects
  const selectedChildMeshRef = useRef<THREE.Mesh | null>(null);

  // Pen Tool & Curve Tool States
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [activeCurveDragKey, setActiveCurveDragKey] = useState<string | null>(null);
  const [curveControls, setCurveControls] = useState<CurveControls>({});
  const [snappingGuides, setSnappingGuides] = useState<{ type: 'x' | 'y', value: number }[]>([]);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<{ prefix: string, index: number } | null>(null);

  const defaultPanelPoints = [
    { x: -panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: -panelHeight / 2 },
    { x: panelWidth / 2, y: panelHeight / 2 },
    { x: -panelWidth / 2, y: panelHeight / 2 },
  ];

  // Hooks
  const {
    stageRef,
    stageSize,
    stageScale,
    stagePosition,
    setStagePosition,
    handleWheel
  } = useStageManager(panelWidth, panelHeight);

  const { threeCanvasRef, containerRef } = useThreeScene(
    shapePoints,
    defaultPanelPoints,
    cornerRadius,
    cornerTypes,
    holes,
    plankThickness,
    isRotated2D,
    state,
    activeTab
  );

  // Logic extracted from original useEffects
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
      }

      const plankInfo = detectPlankByBoundingBox(mesh);
      const { size, thicknessAxis: detectedAxis } = plankInfo;
      setThicknessAxis(detectedAxis);

      let w = 0, h = 0;
      if (detectedAxis === 'y') { w = size.x; h = size.z; }
      else if (detectedAxis === 'x') { w = size.z; h = size.y; }
      else { w = size.x; h = size.y; }

      if (h > w) { setpanelWidth(h); setpanelHeight(w); setIsRotated2D(true); }
      else { setpanelWidth(w); setpanelHeight(h); setIsRotated2D(false); }
      setPlankThickness(size[detectedAxis]);

      // Optimization: Clone material once upon selection to avoid cloning in the update loop
      const mainMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mainMat && !mainMat.userData.isCloned) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => {
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
    const mappedPoints = isRotated2D ? points.map(p => ({ x: -p.y, y: p.x })) : points;
    const getMappedPoint = (p: Point) => (isRotated2D ? { x: -p.y, y: p.x } : p);

    // Build the 2D shape with holes
    const mainShape = buildThreeShape(mappedPoints, cornerRadius, cornerTypes, curveControls);
    holes.forEach((hole) => {
      mainShape.holes.push(createHolePath(hole, getMappedPoint, isRotated2D));
    });

    // Create 3D geometry and align it
    const newGeometry = new THREE.ExtrudeGeometry(mainShape, { depth: plankThickness, bevelEnabled: false });
    alignExtrudedGeometry(newGeometry, plankThickness, thicknessAxis, originalGeometry);

    // Update mesh metadata and swap geometry
    newGeometry.userData.oldGeometry = originalGeometry;
    newGeometry.userData.isModified = true;

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
  };

  useEffect(() => {
    updateMeshGeometry();
  }, [shapePoints, holes, cornerRadius, curveControls, isRotated2D]);

  // Event Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPreview) setPreviewPos(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      else if (isDraggingDrawing) setDrawingPos(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    };
    const handleMouseUp = () => { setIsDraggingPreview(false); setIsDraggingDrawing(false); };
    if (isDraggingPreview || isDraggingDrawing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDraggingPreview, isDraggingDrawing]);

  const handleCancel = () => setShowConfirmExit(true);
  const confirmExit = () => {
    const scene = state?.scene?.scene;
    const selectedChildMesh = scene?.children.find((obj: any) => obj.userData?.objectId === state?.data?.selectedObject)
      ?.children.find((obj: any) => obj.userData?.objectId === state?.data?.selectedChildObject);
    if (selectedChildMesh instanceof THREE.Mesh && originalGeometry) {
      selectedChildMesh.geometry.dispose();
      selectedChildMesh.geometry = originalGeometry;
    }
    router.push(`/design/${designId}`);
  };

  /**
   * Finalizes the editing process by applying the geometry changes to the 
   * main design scene and navigating back.
   */
  const handleComplete = () => {
    updateMeshGeometry();
    router.push(`/design/${designId}`);
  };

  /**
   * Aggregates all relevant points (panel vertices, hole vertices) 
   * to be used by the proximity snapping system.
   */
  const getAllPoints = () => {
    const pts = shapePoints.length > 0 ? [...shapePoints] : [...defaultPanelPoints];
    holes.forEach(h => h.type === 'polygon' && h.points && pts.push(...h.points));
    if (currentDrawingPoints.length > 0) pts.push(...currentDrawingPoints);
    return pts;
  };

  /**
   * Handles mouse down events on the Konva stage for drawing and digging operations.
   */
  const onStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const rawX = (pointer.x - stagePosition.x) / stageScale;
    const rawY = (pointer.y - stagePosition.y) / stageScale;

    if (activeTool === 'Draw the outline of the board') {
      const { snappedX, snappedY } = getSnappedPosition(rawX, rawY, getAllPoints(), stageScale);
      if (currentDrawingPoints.length > 0) {
        const dist = Math.hypot(currentDrawingPoints[0].x - snappedX, currentDrawingPoints[0].y - snappedY);
        if (dist < 15 / stageScale) {
          if (shapePoints.length === 0) setShapePoints(currentDrawingPoints);
          else setHoles(prev => [...prev, { x: 0, y: 0, width: 0, height: 0, type: 'polygon', points: currentDrawingPoints, id: `hole-${Date.now()}` }]);
          setCurrentDrawingPoints([]); setIsDrawingShape(false); setSnappingGuides([]); setMousePos(null);
          return;
        }
      }
      setCurrentDrawingPoints(prev => [...prev, { x: snappedX, y: snappedY }]);
      setIsDrawingShape(true);
    } else if (activeTool === 'Dig') {
      if (holeShape === 'polygon') {
        const { snappedX, snappedY } = getSnappedPosition(rawX, rawY, getAllPoints(), stageScale);
        if (currentDrawingPoints.length > 0 && Math.hypot(currentDrawingPoints[0].x - snappedX, currentDrawingPoints[0].y - snappedY) < 15 / stageScale) {
          setHoles(prev => [...prev, { x: 0, y: 0, width: 0, height: 0, type: 'polygon', points: currentDrawingPoints, id: `hole-${Date.now()}` }]);
          setCurrentDrawingPoints([]); setIsDrawingShape(false); setSnappingGuides([]);
          return;
        }
        setCurrentDrawingPoints(prev => [...prev, { x: snappedX, y: snappedY }]);
        setIsDrawingShape(true);
      } else {
        setNewHoleStart({ x: rawX, y: rawY }); setTempHole(null); setIsDrawingHole(true);
      }
    }
  };

  const onStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const rawX = (pointer.x - stagePosition.x) / stageScale;
    const rawY = (pointer.y - stagePosition.y) / stageScale;

    if (isDrawingShape && currentDrawingPoints.length > 0) {
      const { snappedX, snappedY, guides } = getSnappedPosition(rawX, rawY, getAllPoints(), stageScale);
      setMousePos({ x: snappedX, y: snappedY }); setSnappingGuides(guides);
    } else if (isDrawingHole && newHoleStart) {
      const dx = rawX - newHoleStart.x, dy = rawY - newHoleStart.y;
      if (holeShape === 'circle') {
        const r = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
        setTempHole({ x: newHoleStart.x + dx / 2 - r, y: newHoleStart.y + dy / 2 - r, width: r * 2, height: r * 2, type: 'circle' });
      } else setTempHole({ x: Math.min(newHoleStart.x, rawX), y: Math.min(newHoleStart.y, rawY), width: Math.abs(dx), height: Math.abs(dy), type: holeShape });
    } else if (activeCurveDragKey) {
      setCurveControls(prev => ({ ...prev, [activeCurveDragKey]: { x: rawX, y: rawY } }));
    }
  };

  const renderHoverDimensions = () => {
    const currentHoveredIdx = hoveredHoleIndex !== null ? hoveredHoleIndex : selectedHoleIndex;
    if (currentHoveredIdx === null || !holes[currentHoveredIdx]) return null;
    const hole = holes[currentHoveredIdx];
    const pts = hole.type === 'polygon' && hole.points ? hole.points : [{ x: hole.x, y: hole.y }, { x: hole.x + hole.width, y: hole.y + hole.height }];
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX, h = maxY - minY;
    return (
      <>
        <Line points={[minX, minY - 15, maxX, minY - 15]} stroke="#9e9e9e" strokeWidth={0.5} />
        <Line points={[minX - 15, minY, minX - 15, maxY]} stroke="#9e9e9e" strokeWidth={0.5} />
        <KonvaText x={minX + w / 2 - 28} y={minY - 26} text={`${w.toFixed(1)} mm`} fontSize={10} fill="#424242" />
        <KonvaText x={minX - 58} y={minY + h / 2 - 4} text={`${h.toFixed(1)} mm`} fontSize={10} fill="#424242" />
      </>
    );
  };

  const toolsList = [
    { name: 'Undo', icon: assets.undo },
    { name: 'Redo', icon: assets.redo },
    { name: 'Draw the outline of the board', icon: assets.pencil },
    { name: 'Dig', icon: assets.dig, subTools: ['rect', 'polygon', 'circle', 'slotting'] },
    { name: 'Curve', icon: assets.curve },
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
      />

      <HorizontalRuler stageSize={stageSize} stagePosition={stagePosition} stageScale={stageScale} activeTool={activeTool} />

      <div className={styles.canvasAndSidebar}>
        <div className={styles.canvasWrapper} style={{ marginTop: activeTool === 'Dig' ? '35px' : '0' }}>
          <VerticalRuler stageSize={stageSize} stagePosition={stagePosition} stageScale={stageScale} activeTool={activeTool} />
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
            onMouseDown={onStageMouseDown}
            onMouseMove={onStageMouseMove}
            onMouseUp={() => {
              if (isDrawingHole && tempHole) setHoles(prev => [...prev, { ...tempHole, id: `hole-${Date.now()}` }]);
              setIsDrawingHole(false); setTempHole(null); setNewHoleStart(null); setActiveCurveDragKey(null);
            }}
            style={{ backgroundColor: '#fff', display: 'block' }}
          >
            <Layer>
              <Path
                data={buildPathData(shapePoints.length > 0 ? shapePoints : defaultPanelPoints, cornerRadius, cornerTypes, curveControls)}
                fill="rgba(57, 37, 121, 0.15)"
                stroke="#392579"
                strokeWidth={1}
                fillRule="evenodd"
              />
              {tempHole && (tempHole.type === 'circle' ?
                <Circle x={tempHole.x + tempHole.width / 2} y={tempHole.y + tempHole.height / 2} radius={tempHole.width / 2} fill="rgba(0,0,0,0.2)" stroke="black" /> :
                <Rect x={tempHole.x} y={tempHole.y} width={tempHole.width} height={tempHole.height} fill="rgba(0,0,0,0.2)" stroke="black" />
              )}
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
                        data={buildPathData(hole.points, hole.cornerRadius || new Array(hole.points.length).fill(0), hole.cornerTypes, curveControls, `hole_${index}`)}
                      />
                      {selectedHoleIndex === index && (
                        <>
                          {hole.points.map((p, pIdx) => (
                            <Rect
                              key={`h-${index}-p-${pIdx}`}
                              x={p.x - 3} y={p.y - 3} width={6} height={6}
                              onClick={() => {
                                setSelectedPointIndex(pIdx);
                              }}
                              draggable
                              onDragMove={(e) => {
                                const { snappedX, snappedY } = getSnappedPosition(e.target.x() + 3, e.target.y() + 3, getAllPoints(), stageScale, p);
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
              {(shapePoints.length > 0 ? shapePoints : defaultPanelPoints).map((p, i) => (
                <Rect key={i} x={p.x - 3} y={p.y - 3} width={6} height={6} fill="grey" opacity={0.7} draggable onDragMove={(e) => {
                  const { snappedX, snappedY, guides } = getSnappedPosition(e.target.x() + 3, e.target.y() + 3, getAllPoints(), stageScale, p);
                  e.target.x(snappedX - 3); e.target.y(snappedY - 3); setSnappingGuides(guides);
                  setShapePoints(prev => { const next = prev.length > 0 ? [...prev] : [...defaultPanelPoints]; next[i] = { x: snappedX, y: snappedY }; return next; });
                }} onDragEnd={() => setSnappingGuides([])} onClick={() => { setSelectedCornerIndex(i); setSelectedHoleIndex(null); }} />
              ))}
              {snappingGuides.map((g, i) => <Line key={i} points={g.type === 'x' ? [g.value, -10000, g.value, 10000] : [-10000, g.value, 10000, g.value]} stroke="red" strokeWidth={1 / stageScale} dash={[4, 4]} />)}
              {currentDrawingPoints.length > 0 && (
                <>
                  <Line points={currentDrawingPoints.flatMap(p => [p.x, p.y]).concat(mousePos ? [mousePos.x, mousePos.y] : [])} stroke="green" strokeWidth={0.5} />
                  {currentDrawingPoints.map((p, i) => <Circle key={i} x={p.x} y={p.y} radius={3} fill={i === 0 ? "orange" : "blue"} />)}
                </>
              )}
              {renderHoverDimensions()}
              <Transformer ref={transformerRef} boundBoxFunc={(newBox) => newBox} anchorSize={8} anchorStroke="#000" anchorFill="#fff" anchorCornerRadius={2} />
            </Layer>
          </Stage>
        </div>
        <PreviewSidebar previewPos={previewPos} setIsDraggingPreview={setIsDraggingPreview} containerRef={containerRef} threeCanvasRef={threeCanvasRef} />
        <PropertiesSidebar
          drawingPos={drawingPos}
          setIsDraggingDrawing={setIsDraggingDrawing}
          selectedHoleIndex={selectedHoleIndex}
          selectedLineIndex={selectedLineIndex}
          selectedPointIndex={selectedPointIndex}
          selectedCornerIndex={selectedCornerIndex}
          holes={holes}
          setHoles={setHoles}
          curveControls={curveControls}
          setCurveControls={setCurveControls}
          shapePoints={shapePoints}
          defaultPanelPoints={defaultPanelPoints}
          setShapePoints={setShapePoints}
          panelWidth={panelWidth}
          isRotated2D={isRotated2D}
          setSelectedHoleIndex={setSelectedHoleIndex}
        />
      </div>

      <div className={styles.footer}>
        Origin at center • depth(T): {plankThickness.toFixed(1)} mm • width(W): {panelWidth.toFixed(1)} mm • height(H): {panelHeight.toFixed(1)} mm
      </div>

      {showConfirmExit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.popupHeader}><FaExclamationTriangle className={styles.warningIcon} /><h2 className={styles.popupTitle}>The results of this edit will not be saved, will you confirm the exit editing?</h2></div>
            <div className={styles.buttonContainer}>
              <button className={`${styles.button} ${styles.popupCancelButton}`} onClick={() => setShowConfirmExit(false)}>Cancel</button>
              <button className={`${styles.button} ${styles.popupConfirmButton}`} onClick={confirmExit}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
