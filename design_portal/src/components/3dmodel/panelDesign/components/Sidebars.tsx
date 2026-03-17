import React from 'react';
import styles from '../panelDesign.module.css';
import { Point, Hole, CurveControls, CornerType, PreviewSidebarProps, PropertiesSidebarProps, BaseSidebarProps } from '../types';

/**
 * A reusable container for sidebar panels.
 * Includes a draggable header with a title and action icon.
 */
const SidebarContainer: React.FC<BaseSidebarProps> = ({ title, pos, height, onDragStart, children }) => (
  <div className={styles.sidebar} style={{ left: pos.x, top: pos.y, height }}>
    <div className={styles.panelHeader} onMouseDown={onDragStart}>
      <div className={styles.panelTitle}><span>⠿</span> {title}</div>
      <div className={styles.panelHeaderActions}><span>✥</span></div>
    </div>
    <div className={styles.propertiesContainer}>
      <div className={styles.sidebarContent}>{children}</div>
    </div>
  </div>
);

/**
 * A labeled section within the sidebar.
 */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className={styles.sidebarSection}>
    <div className={styles.sidebarTitle}>{title}</div>
    {children}
  </div>
);

/**
 * A standard row with a label and its associated control/content.
 */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.sidebarRow}>
    <span>{label}:</span>
    {children}
  </div>
);

/**
 * A standardized numeric input for consistent stepping and change handling.
 */
const NumberInput: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => (
  <input
    type="number"
    step="0.1"
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
  />
);

/**
 * Sidebar component that hosts the 3D local preview of the panel.
 */
export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  previewPos,
  setIsDraggingPreview,
  containerRef,
  threeCanvasRef,
}) => {
  return (
    <SidebarContainer
      title="Panel Design"
      pos={previewPos}
      height="260px"
      onDragStart={() => setIsDraggingPreview(true)}
    >
      <div className={styles.sidebarPreview} ref={containerRef}>
        <div className={styles.previewTitle}>3D Preview</div>
        <canvas ref={threeCanvasRef} />
      </div>
    </SidebarContainer>
  );
};

/**
 * Sidebar component for editing panel properties, vertex coordinates, and hole details.
 * Features conditional rendering based on what is currently selected (Point, Line, Hole, or Panel).
 */
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

  /**
   * Updates the coordinates of a specific vertex within a polygonal hole.
   */
  const updateHolePoint = (dim: 'x' | 'y', val: number) => {
    if (selectedHoleIndex === null || selectedPointIndex === null) return;
    setHoles((prev: any) => {
      const next = [...prev];
      const nextPoints = [...(next[selectedHoleIndex].points as any)];
      nextPoints[selectedPointIndex] = { ...nextPoints[selectedPointIndex], [dim]: val };
      next[selectedHoleIndex] = { ...next[selectedHoleIndex], points: nextPoints };
      return next;
    });
  };

  /**
   * Updates the top-left position (origin) of a hole.
   */
  const updateHolePos = (dim: 'x' | 'y', val: number) => {
    if (selectedHoleIndex === null) return;
    setHoles((prev: any) => {
      const next = [...prev];
      next[selectedHoleIndex] = { ...next[selectedHoleIndex], [dim]: val };
      return next;
    });
  };

  /**
   * Updates a vertex coordinate of the main panel outline.
   */
  const updatePanelPoint = (dim: 'x' | 'y', val: number) => {
    if (selectedCornerIndex === null) return;
    setShapePoints((prev: any) => {
      const pts = prev.length > 0 ? [...prev] : [...defaultPanelPoints];
      pts[selectedCornerIndex] = { ...pts[selectedCornerIndex], [dim]: val };
      return pts;
    });
  };

  return (
    <SidebarContainer
      title="Drawing"
      pos={drawingPos}
      onDragStart={() => setIsDraggingDrawing(true)}
    >
      {/* Line Editing (Arcs/Curves) */}
      {selectedHoleIndex !== null && selectedLineIndex !== null && (
        <Section title={`Line Editing (Hole #${selectedHoleIndex + 1})`}>
          <Row label="Type">
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
          </Row>
        </Section>
      )}

      {/* Point Editing */}
      {selectedHoleIndex !== null && selectedPointIndex !== null && (
        <Section title={`Point Editing (Hole #${selectedHoleIndex + 1})`}>
          <Row label="Point X">
            <NumberInput
              value={holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.x || 0}
              onChange={(v) => updateHolePoint('x', v)}
            />
          </Row>
          <Row label="Point Y">
            <NumberInput
              value={holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.y || 0}
              onChange={(v) => updateHolePoint('y', v)}
            />
          </Row>
        </Section>
      )}

      {/* Hole Position (Face) Editing */}
      {selectedHoleIndex !== null && selectedPointIndex === null && selectedLineIndex === null && (
        <Section title={`Face Editing (Hole #${selectedHoleIndex + 1})`}>
          <Row label="X">
            <NumberInput value={holes[selectedHoleIndex].x} onChange={(v) => updateHolePos('x', v)} />
          </Row>
          <Row label="Y">
            <NumberInput value={holes[selectedHoleIndex].y} onChange={(v) => updateHolePos('y', v)} />
          </Row>
          <button
            className={styles.sidebarDeleteButton}
            onClick={() => {
              setHoles((prev: any) => prev.filter((_: any, i: number) => i !== selectedHoleIndex));
              setSelectedHoleIndex(null);
            }}
          >
            Delete Hole
          </button>
        </Section>
      )}

      {/* Panel Vertex Editing */}
      {selectedCornerIndex !== null && (
        <Section title={`Vertex Editing (#${selectedCornerIndex + 1})`}>
          <Row label="Point X">
            <NumberInput
              value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].x}
              onChange={(v) => updatePanelPoint('x', v)}
            />
          </Row>
          <Row label="Point Y">
            <NumberInput
              value={(shapePoints.length > 0 ? shapePoints : defaultPanelPoints)[selectedCornerIndex].y}
              onChange={(v) => updatePanelPoint('y', v)}
            />
          </Row>
        </Section>
      )}

      {/* Default Panel Properties */}
      {selectedHoleIndex === null && selectedCornerIndex === null && (
        <Section title="Panel Properties">
          <Row label="Width">{panelWidth.toFixed(1)} mm</Row>
          <Row label="Rotated">{isRotated2D ? 'Yes' : 'No'}</Row>
        </Section>
      )}
    </SidebarContainer>
  );
};
