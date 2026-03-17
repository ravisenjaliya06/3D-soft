import React from 'react';
import styles from '../panelDesign.module.css';
import { Point, Hole, CurveControls, CornerType } from '../types';

interface PreviewSidebarProps {
  previewPos: { x: number; y: number };
  setIsDraggingPreview: (val: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  threeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  previewPos,
  setIsDraggingPreview,
  containerRef,
  threeCanvasRef,
}) => {
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

interface PropertiesSidebarProps {
  drawingPos: { x: number; y: number };
  setIsDraggingDrawing: (val: boolean) => void;
  selectedHoleIndex: number | null;
  selectedLineIndex: number | null;
  selectedPointIndex: number | null;
  selectedCornerIndex: number | null;
  holes: Hole[];
  setHoles: any;
  curveControls: CurveControls;
  setCurveControls: any;
  shapePoints: Point[];
  defaultPanelPoints: Point[];
  setShapePoints: any;
  panelWidth: number;
  isRotated2D: boolean;
  setSelectedHoleIndex: (val: number | null) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  drawingPos,
  setIsDraggingDrawing,
  selectedHoleIndex,
  selectedLineIndex,
  selectedPointIndex,
  selectedCornerIndex,
  holes,
  setHoles,
  curveControls,
  setCurveControls,
  shapePoints,
  defaultPanelPoints,
  setShapePoints,
  panelWidth,
  isRotated2D,
  setSelectedHoleIndex,
}) => {
  return (
    <div className={styles.sidebar} style={{ left: drawingPos.x, top: drawingPos.y }}>
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
                        setCurveControls((prev: any) => ({
                          ...prev,
                          [curveKey]: { x: (p1.x + p2.x) / 2 + 10, y: (p1.y + p2.y) / 2 + 10 },
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
                <input
                  type="number"
                  step="0.1"
                  value={holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.x || 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setHoles((prev: any) => {
                      const next = [...prev];
                      const nextPoints = [...(next[selectedHoleIndex].points as any)];
                      nextPoints[selectedPointIndex] = { ...nextPoints[selectedPointIndex], x: val };
                      next[selectedHoleIndex] = { ...next[selectedHoleIndex], points: nextPoints };
                      return next;
                    });
                  }}
                />
              </div>
              <div className={styles.sidebarRow}>
                <span>Point Y:</span>
                <input
                  type="number"
                  step="0.1"
                  value={holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.y || 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setHoles((prev: any) => {
                      const next = [...prev];
                      const nextPoints = [...(next[selectedHoleIndex].points as any)];
                      nextPoints[selectedPointIndex] = { ...nextPoints[selectedPointIndex], y: val };
                      next[selectedHoleIndex] = { ...next[selectedHoleIndex], points: nextPoints };
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          )}

          {selectedHoleIndex !== null && selectedPointIndex === null && selectedLineIndex === null && (
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Face Editing (Hole #{selectedHoleIndex + 1})</div>
              <div className={styles.sidebarRow}>
                <span>X:</span>
                <input
                  type="number"
                  step="0.1"
                  value={holes[selectedHoleIndex].x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setHoles((prev: any) => {
                      const next = [...prev];
                      next[selectedHoleIndex] = { ...next[selectedHoleIndex], x: val };
                      return next;
                    });
                  }}
                />
              </div>
              <div className={styles.sidebarRow}>
                <span>Y:</span>
                <input
                  type="number"
                  step="0.1"
                  value={holes[selectedHoleIndex].y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setHoles((prev: any) => {
                      const next = [...prev];
                      next[selectedHoleIndex] = { ...next[selectedHoleIndex], y: val };
                      return next;
                    });
                  }}
                />
              </div>
              <button
                className={styles.sidebarDeleteButton}
                onClick={() => {
                  setHoles((prev: any) => prev.filter((_: any, i: number) => i !== selectedHoleIndex));
                  setSelectedHoleIndex(null);
                }}
              >
                Delete Hole
              </button>
            </div>
          )}

          {selectedCornerIndex !== null && (
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Vertex Editing (#{selectedCornerIndex + 1})</div>
              <div className={styles.sidebarRow}>
                <span>Point X:</span>
                <input
                  type="number"
                  step="0.1"
                  value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setShapePoints((prev: any) => {
                      const pts = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
                      pts[selectedCornerIndex] = { ...pts[selectedCornerIndex], x: val };
                      return pts;
                    });
                  }}
                />
              </div>
              <div className={styles.sidebarRow}>
                <span>Point Y:</span>
                <input
                  type="number"
                  step="0.1"
                  value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setShapePoints((prev: any) => {
                      const pts = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
                      pts[selectedCornerIndex] = { ...pts[selectedCornerIndex], y: val };
                      return pts;
                    });
                  }}
                />
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
        </div>
      </div>
    </div>
  );
};
