import React from 'react';
import styles from '../panelDesign.module.css';
import {
  BaseSidebarProps,
  CornerType,
  Point,
  PreviewSidebarProps,
  PropertiesSidebarProps,
  PropertyGroupConfig,
} from '../types';
import { getHoleBounds, getPanelBounds } from '../utils/boundsUtils';

/**
 * A reusable container for sidebar panels.
 * Includes a draggable header with a title and action icon.
 */
const SidebarContainer: React.FC<BaseSidebarProps> = ({
  title,
  pos,
  height,
  onDragStart,
  children,
}) => (
  <div className={styles.sidebar} style={{ left: pos.x, top: pos.y, height }}>
    <div className={styles.panelHeader} onMouseDown={onDragStart}>
      <div className={styles.panelTitle}>
        <span>⠿</span> {title}
      </div>
      <div className={styles.panelHeaderActions}>
        <span>✥</span>
      </div>
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
const NumberInput: React.FC<{ value: number; onChange: (val: number) => void }> = ({
  value,
  onChange,
}) => (
  <input
    type="number"
    step="0.1"
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
  />
);

/**
 * Renders a property section with the reference layout: title, input row(s) with sub-labels underneath.
 * For 2 fields: [input] [input] with sub-labels centered under each.
 * For 1 field with inlineLayout: title and input on same line.
 */
const PropertySection: React.FC<{ group: PropertyGroupConfig }> = ({ group }) => (
  <div className={group.noBorder ? styles.propertyGroupNoBorder : styles.propertyGroup}>
    {group.inlineLayout && group.fields.length === 1 ? (
      <div className={styles.propertyGroupInline}>
        <span className={styles.propertyGroupTitle}>
          {group.title}
          {group.infoLabel && (
            <span
              className={styles.propertyInfoIcon}
              title={group.infoLabel}
              aria-label={group.infoLabel}
            >
              i
            </span>
          )}
        </span>
        <div className={styles.propertyGroupInlineField}>
          <input
            type="number"
            step="0.1"
            className={styles.propertyInput}
            value={group.fields[0].getValue().toFixed(1)}
            onChange={(e) =>
              !group.fields[0].readOnly && group.fields[0].onChange(parseFloat(e.target.value) || 0)
            }
            readOnly={group.fields[0].readOnly}
          />
          <span className={styles.propertySubLabelInline}>{group.fields[0].subLabel}</span>
        </div>
      </div>
    ) : (
      <>
        <div className={styles.propertyGroupTitle}>
          {group.title}
          {group.infoLabel && (
            <span
              className={styles.propertyInfoIcon}
              title={group.infoLabel}
              aria-label={group.infoLabel}
            >
              i
            </span>
          )}
        </div>
        <div className={styles.propertyInputRow}>
          {group.fields.map((field, idx) => (
            <React.Fragment key={idx}>
              <div className={styles.propertyFieldWrapper}>
                <input
                  type="number"
                  step="0.1"
                  className={styles.propertyInput}
                  value={field.getValue().toFixed(1)}
                  onChange={(e) =>
                    !field.readOnly && field.onChange(parseFloat(e.target.value) || 0)
                  }
                  readOnly={field.readOnly}
                />
                <div className={styles.propertySubLabel}>{field.subLabel}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </>
    )}
  </div>
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
const CORNER_TYPE_OPTIONS: { value: CornerType; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'round', label: 'Round' },
  { value: 'chamfer', label: 'Chamfer' },
];

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
  cornerRadius,
  setCornerRadius,
  cornerTypes,
  setCornerTypes,
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
   * Updates corner radius for a hole point.
   */
  const updateHoleCornerRadius = (val: number) => {
    if (selectedHoleIndex === null || selectedPointIndex === null) return;
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      const ptsLen = h.points?.length ?? 0;
      const radii = [...(h.cornerRadius ?? Array(ptsLen).fill(0))];
      if (selectedPointIndex < radii.length) radii[selectedPointIndex] = Math.max(0, val);
      next[selectedHoleIndex] = { ...h, cornerRadius: radii };
      return next;
    });
  };

  /**
   * Updates corner type for a hole point.
   */
  const updateHoleCornerType = (type: CornerType) => {
    if (selectedHoleIndex === null || selectedPointIndex === null) return;
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      const ptsLen = h.points?.length ?? 0;
      const types = [...(h.cornerTypes ?? Array(ptsLen).fill('default'))];
      if (selectedPointIndex < types.length) types[selectedPointIndex] = type;
      next[selectedHoleIndex] = { ...h, cornerTypes: types };
      if (type === 'default') {
        const radii = [...(h.cornerRadius ?? Array(ptsLen).fill(0))];
        if (selectedPointIndex < radii.length) radii[selectedPointIndex] = 0;
        next[selectedHoleIndex].cornerRadius = radii;
      } else if ((h.cornerRadius?.[selectedPointIndex] ?? 0) === 0) {
        const radii = [...(h.cornerRadius ?? Array(ptsLen).fill(0))];
        if (selectedPointIndex < radii.length) radii[selectedPointIndex] = 50;
        next[selectedHoleIndex].cornerRadius = radii;
      }
      return next;
    });
  };

  /**
   * Updates the center position of a hole (translates the whole shape).
   */
  const updateHoleCenter = (dim: 'x' | 'y', newCenterVal: number) => {
    if (selectedHoleIndex === null) return;
    const hole = holes[selectedHoleIndex];
    const bounds = getHoleBounds(hole);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const dx = dim === 'x' ? newCenterVal - centerX : 0;
    const dy = dim === 'y' ? newCenterVal - centerY : 0;
    if (dx === 0 && dy === 0) return;
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      if (h.type === 'circle') {
        next[selectedHoleIndex] = { ...h, x: h.x + dx, y: h.y + dy };
      } else if (h.points?.length) {
        next[selectedHoleIndex] = {
          ...h,
          x: h.x + dx,
          y: h.y + dy,
          points: h.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy })),
        };
      } else {
        next[selectedHoleIndex] = { ...h, x: h.x + dx, y: h.y + dy };
      }
      return next;
    });
  };

  /**
   * Updates the width or height of a rect hole.
   */
  const updateRectSize = (dim: 'width' | 'height', val: number) => {
    if (selectedHoleIndex === null) return;
    const hole = holes[selectedHoleIndex];
    if (hole.type !== 'rect') return;
    const size = Math.max(0.1, val);
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      next[selectedHoleIndex] = { ...h, [dim]: size };
      return next;
    });
  };

  /**
   * Updates the radius of a circle hole.
   */
  const updateCircleRadius = (val: number) => {
    if (selectedHoleIndex === null) return;
    const hole = holes[selectedHoleIndex];
    if (hole.type !== 'circle') return;
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      const r = Math.max(0.1, val);
      next[selectedHoleIndex] = { ...h, radius: r, width: r * 2, height: r * 2 };
      return next;
    });
  };

  /**
   * Updates a coordinate point at index i in a polygonal/rect hole.
   */
  const updateHoleCoordinate = (pointIndex: number, dim: 'x' | 'y', val: number) => {
    if (selectedHoleIndex === null) return;
    setHoles((prev: any) => {
      const next = [...prev];
      const h = next[selectedHoleIndex];
      let pts = h.points && h.points.length > 0 ? [...h.points] : [];
      if (pts.length === 0 && (h.type === 'rect' || h.type === 'polygon')) {
        const b = getHoleBounds(h);
        pts = [
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.minY },
          { x: b.maxX, y: b.maxY },
          { x: b.minX, y: b.maxY },
        ];
      }
      if (pointIndex >= pts.length) return prev;
      pts[pointIndex] = { ...pts[pointIndex], [dim]: val };
      const { minX, minY, maxX, maxY } = (() => {
        let mx = Infinity,
          my = Infinity,
          Mx = -Infinity,
          My = -Infinity;
        pts.forEach((p: Point) => {
          mx = Math.min(mx, p.x);
          my = Math.min(my, p.y);
          Mx = Math.max(Mx, p.x);
          My = Math.max(My, p.y);
        });
        return { minX: mx, minY: my, maxX: Mx, maxY: My };
      })();
      next[selectedHoleIndex] = {
        ...h,
        points: pts,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
      return next;
    });
  };

  /**
   * Build dynamic property groups for the selected hole based on its type.
   * Values are displayed as panel-relative (positive, from top-left of panel).
   */
  const buildHolePropertyGroups = (): PropertyGroupConfig[] => {
    if (selectedHoleIndex === null) return [];
    const hole = holes[selectedHoleIndex];
    if (!hole) return [];

    const panelBounds = getPanelBounds(shapePoints, defaultPanelPoints);
    const toDisplay = (val: number, dim: 'x' | 'y') =>
      dim === 'x' ? val - panelBounds.minX : val - panelBounds.minY;
    const fromDisplay = (display: number, dim: 'x' | 'y') =>
      dim === 'x' ? display + panelBounds.minX : display + panelBounds.minY;

    if (hole.type === 'circle') {
      const centerX = hole.x + (hole.radius ?? hole.width / 2);
      const centerY = hole.y + (hole.radius ?? hole.height / 2);
      const radius = Math.abs(hole.radius ?? hole.width / 2);
      return [
        {
          title: 'Position',
          infoLabel: 'Center point of the hole (from panel top-left)',
          fields: [
            {
              subLabel: 'x',
              getValue: () => toDisplay(centerX, 'x'),
              onChange: (v) => updateHoleCenter('x', fromDisplay(v, 'x')),
            },
            {
              subLabel: 'y',
              getValue: () => toDisplay(centerY, 'y'),
              onChange: (v) => updateHoleCenter('y', fromDisplay(v, 'y')),
            },
          ],
        },
        {
          title: 'Radius',
          infoLabel: 'Radius of the circular hole in mm',
          fields: [
            {
              subLabel: 'mm',
              getValue: () => radius,
              onChange: updateCircleRadius,
            },
          ],
          inlineLayout: true,
        },
      ];
    }

    const bounds = getHoleBounds(hole);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.abs(bounds.width);
    const height = Math.abs(bounds.height);
    const points: Point[] =
      hole.type === 'polygon' && hole.points && hole.points.length > 0 ? hole.points : [];

    const groups: PropertyGroupConfig[] = [
      {
        title: 'Size',
        infoLabel: 'Width and height of the hole bounding box',
        fields: [
          {
            subLabel: 'W',
            getValue: () => width,
            onChange: hole.type === 'rect' ? (v) => updateRectSize('width', v) : () => {},
            readOnly: hole.type !== 'rect',
          },
          {
            subLabel: 'H',
            getValue: () => height,
            onChange: hole.type === 'rect' ? (v) => updateRectSize('height', v) : () => {},
            readOnly: hole.type !== 'rect',
          },
        ],
      },
      {
        title: 'Position',
        infoLabel: 'Center point of the hole (from panel top-left)',
        fields: [
          {
            subLabel: 'x',
            getValue: () => toDisplay(centerX, 'x'),
            onChange: (v) => updateHoleCenter('x', fromDisplay(v, 'x')),
          },
          {
            subLabel: 'y',
            getValue: () => toDisplay(centerY, 'y'),
            onChange: (v) => updateHoleCenter('y', fromDisplay(v, 'y')),
          },
        ],
      },
    ];

    points.forEach((p, i) => {
      groups.push({
        title: `Coordinate${i + 1}`,
        infoLabel: 'Vertex coordinates of the hole in order',
        fields: [
          {
            subLabel: 'x',
            getValue: () => toDisplay(p.x, 'x'),
            onChange: (v) => updateHoleCoordinate(i, 'x', fromDisplay(v, 'x')),
          },
          {
            subLabel: 'y',
            getValue: () => toDisplay(p.y, 'y'),
            onChange: (v) => updateHoleCoordinate(i, 'y', fromDisplay(v, 'y')),
          },
        ],
        noBorder: true,
        hideSeparator: true,
      });
    });

    return groups;
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
      {/* Line Editing (Arcs/Curves) - only when no panel corner selected */}
      {selectedCornerIndex === null &&
        selectedHoleIndex !== null &&
        selectedLineIndex !== null && (
        <Section title={`Line Editing (Hole #${selectedHoleIndex + 1})`}>
          <Row label="Type">
            <select
              className={styles.sidebarSelect}
              value={
                curveControls[`hole_${selectedHoleIndex}_${selectedLineIndex}`] ? 'arc' : 'linear'
              }
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

      {/* Hole Point Editing - same layout as main panel Corner Point */}
      {selectedCornerIndex === null &&
        selectedHoleIndex !== null &&
        selectedPointIndex !== null &&
        holes[selectedHoleIndex]?.points && (
        <div className={styles.cornerPointPanel}>
          <Section title={`Corner Point (Hole #${selectedHoleIndex + 1})`}>
            <div className={styles.coordinateSection}>
              <div className={styles.coordinateLabel}>Coordinate</div>
              <div className={styles.coordinateInputs}>
                <div className={styles.coordinateField}>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.propertyInputSmall}
                    value={(
                      holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.x ?? 0
                    ).toFixed(1)}
                    onChange={(e) =>
                      updateHolePoint('x', parseFloat(e.target.value) || 0)
                    }
                  />
                  <span className={styles.coordinateSubLabel}>x</span>
                </div>
                <div className={styles.coordinateField}>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.propertyInputSmall}
                    value={(
                      holes[selectedHoleIndex]?.points?.[selectedPointIndex]?.y ?? 0
                    ).toFixed(1)}
                    onChange={(e) =>
                      updateHolePoint('y', parseFloat(e.target.value) || 0)
                    }
                  />
                  <span className={styles.coordinateSubLabel}>y</span>
                </div>
              </div>
            </div>
            <div className={styles.cornerTypeSection}>
              <div className={styles.cornerTypeLabel}>Corner Point Type</div>
              <div className={styles.cornerTypeButtons}>
                {CORNER_TYPE_OPTIONS.map((opt) => {
                  const hole = holes[selectedHoleIndex];
                  const ptsLen = hole?.points?.length ?? 0;
                  const types = hole?.cornerTypes ?? Array(ptsLen).fill('default');
                  const currentType = types[selectedPointIndex] ?? 'default';
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.cornerTypeBtn} ${
                        currentType === opt.value ? styles.cornerTypeBtnActive : ''
                      }`}
                      onClick={() => updateHoleCornerType(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(() => {
              const hole = holes[selectedHoleIndex];
              const radii = hole?.cornerRadius ?? Array(hole?.points?.length ?? 0).fill(0);
              const types = hole?.cornerTypes ?? Array(hole?.points?.length ?? 0).fill('default');
              const currentType = types[selectedPointIndex] ?? 'default';
              const currentRadius = radii[selectedPointIndex] ?? 0;
              if (currentType !== 'round') return null;
              return (
                <div className={styles.radiusSection}>
                  <div className={styles.radiusLabel}>Radius</div>
                  <div className={styles.radiusInputRow}>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className={styles.propertyInputSmall}
                      value={currentRadius.toFixed(1)}
                      onChange={(e) =>
                        updateHoleCornerRadius(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                    />
                    <span className={styles.radiusUnit}>mm</span>
                  </div>
                  <div className={styles.cornerDiagram}>
                    <svg viewBox="0 0 60 60" className={styles.diagramSvg}>
                      <path
                        d="M 10 50 L 10 10 L 50 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        opacity={0.6}
                      />
                      <path
                        d="M 10 50 A 40 40 0 0 1 50 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <circle cx="10" cy="50" r="2" fill="#00bcd4" />
                      <circle cx="50" cy="10" r="2" fill="#00bcd4" />
                      <text x="30" y="38" className={styles.diagramLabel}>
                        r
                      </text>
                    </svg>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const hole = holes[selectedHoleIndex];
              const radii = hole?.cornerRadius ?? Array(hole?.points?.length ?? 0).fill(0);
              const types = hole?.cornerTypes ?? Array(hole?.points?.length ?? 0).fill('default');
              const currentType = types[selectedPointIndex] ?? 'default';
              const currentRadius = radii[selectedPointIndex] ?? 0;
              if (currentType !== 'chamfer') return null;
              return (
                <div className={styles.chamferSection}>
                  <div className={styles.chamferLabel}>Chamfer Distance</div>
                  <div className={styles.chamferInputs}>
                    <div className={styles.chamferField}>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        className={styles.propertyInputSmall}
                        value={currentRadius.toFixed(1)}
                        onChange={(e) =>
                          updateHoleCornerRadius(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                      />
                      <span className={styles.chamferSubLabel}>d1</span>
                    </div>
                    <div className={styles.chamferField}>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        className={styles.propertyInputSmall}
                        value={currentRadius.toFixed(1)}
                        onChange={(e) =>
                          updateHoleCornerRadius(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                      />
                      <span className={styles.chamferSubLabel}>d2</span>
                    </div>
                  </div>
                  <div className={styles.cornerDiagram}>
                    <svg viewBox="0 0 60 60" className={styles.diagramSvg}>
                      <path
                        d="M 10 50 L 10 10 L 50 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        opacity={0.6}
                      />
                      <path
                        d="M 10 50 L 50 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <circle cx="10" cy="50" r="2" fill="#00bcd4" />
                      <circle cx="50" cy="10" r="2" fill="#00bcd4" />
                      <text x="18" y="48" className={styles.diagramLabel}>
                        d1
                      </text>
                      <text x="42" y="14" className={styles.diagramLabel}>
                        d2
                      </text>
                    </svg>
                  </div>
                </div>
              );
            })()}
          </Section>
        </div>
      )}

      {/* Hole Properties - only when no panel corner selected, no point/line selected */}
      {selectedCornerIndex === null &&
        selectedHoleIndex !== null &&
        selectedPointIndex === null &&
        selectedLineIndex === null &&
        holes[selectedHoleIndex] &&
        (() => {
          const groups = buildHolePropertyGroups();
          return (
            <div className={styles.holePropertiesPanel}>
              {groups.map((group, idx) => (
                <React.Fragment key={idx}>
                  <PropertySection group={group} />
                  {group.noBorder && (idx === groups.length - 1 || !groups[idx + 1]?.noBorder) && (
                    <div className={styles.coordinatesGroupEnd} />
                  )}
                </React.Fragment>
              ))}
              <button
                className={styles.sidebarDeleteButton}
                onClick={() => {
                  setHoles((prev: any) =>
                    prev.filter((_: any, i: number) => i !== selectedHoleIndex)
                  );
                  setSelectedHoleIndex(null);
                }}
              >
                Delete Hole
              </button>
            </div>
          );
        })()}

      {/* Panel Corner Point Editing */}
      {selectedCornerIndex !== null && (
        <div className={styles.cornerPointPanel}>
          <Section title="Corner Point">
            <div className={styles.coordinateSection}>
              <div className={styles.coordinateLabel}>Coordinate</div>
              <div className={styles.coordinateInputs}>
                <div className={styles.coordinateField}>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.propertyInputSmall}
                    value={(
                      shapePoints.length > 0 ? shapePoints : defaultPanelPoints
                    )[selectedCornerIndex].x.toFixed(1)}
                    onChange={(e) =>
                      updatePanelPoint('x', parseFloat(e.target.value) || 0)
                    }
                  />
                  <span className={styles.coordinateSubLabel}>x</span>
                </div>
                <div className={styles.coordinateField}>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.propertyInputSmall}
                    value={(
                      shapePoints.length > 0 ? shapePoints : defaultPanelPoints
                    )[selectedCornerIndex].y.toFixed(1)}
                    onChange={(e) =>
                      updatePanelPoint('y', parseFloat(e.target.value) || 0)
                    }
                  />
                  <span className={styles.coordinateSubLabel}>y</span>
                </div>
              </div>
            </div>
            <div className={styles.cornerTypeSection}>
              <div className={styles.cornerTypeLabel}>Corner Point Type</div>
              <div className={styles.cornerTypeButtons}>
                {CORNER_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.cornerTypeBtn} ${
                      (cornerTypes[selectedCornerIndex] || 'default') === opt.value
                        ? styles.cornerTypeBtnActive
                        : ''
                    }`}
                    onClick={() => {
                      setCornerTypes((prev) => {
                        const next = [...(prev.length ? prev : Array(4).fill('default'))];
                        if (selectedCornerIndex < next.length) {
                          next[selectedCornerIndex] = opt.value;
                          if (opt.value === 'default') {
                            setCornerRadius((r) => {
                              const nr = [...(r.length ? r : Array(4).fill(0))];
                              if (selectedCornerIndex < nr.length)
                                nr[selectedCornerIndex] = 0;
                              return nr;
                            });
                          } else if (
                            (opt.value === 'round' || opt.value === 'chamfer') &&
                            (cornerRadius[selectedCornerIndex] || 0) === 0
                          ) {
                            setCornerRadius((r) => {
                              const nr = [...(r.length ? r : Array(4).fill(0))];
                              if (selectedCornerIndex < nr.length)
                                nr[selectedCornerIndex] = 50;
                              return nr;
                            });
                          }
                        }
                        return next;
                      });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {(cornerTypes[selectedCornerIndex] || 'default') === 'round' && (
              <div className={styles.radiusSection}>
                <div className={styles.radiusLabel}>Radius</div>
                <div className={styles.radiusInputRow}>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className={styles.propertyInputSmall}
                    value={(cornerRadius[selectedCornerIndex] || 0).toFixed(1)}
                    onChange={(e) => {
                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                      setCornerRadius((prev) => {
                        const next = [...(prev.length ? prev : Array(4).fill(0))];
                        if (selectedCornerIndex < next.length)
                          next[selectedCornerIndex] = v;
                        return next;
                      });
                    }}
                  />
                  <span className={styles.radiusUnit}>mm</span>
                </div>
                <div className={styles.cornerDiagram}>
                  <svg viewBox="0 0 60 60" className={styles.diagramSvg}>
                    <path
                      d="M 10 50 L 10 10 L 50 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                      opacity={0.6}
                    />
                    <path
                      d="M 10 50 A 40 40 0 0 1 50 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="10" cy="50" r="2" fill="#00bcd4" />
                    <circle cx="50" cy="10" r="2" fill="#00bcd4" />
                    <text x="30" y="38" className={styles.diagramLabel}>
                      r
                    </text>
                  </svg>
                </div>
              </div>
            )}
            {(cornerTypes[selectedCornerIndex] || 'default') === 'chamfer' && (
              <div className={styles.chamferSection}>
                <div className={styles.chamferLabel}>Chamfer Distance</div>
                <div className={styles.chamferInputs}>
                  <div className={styles.chamferField}>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className={styles.propertyInputSmall}
                      value={(cornerRadius[selectedCornerIndex] || 0).toFixed(1)}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setCornerRadius((prev) => {
                          const next = [...(prev.length ? prev : Array(4).fill(0))];
                          if (selectedCornerIndex < next.length)
                            next[selectedCornerIndex] = v;
                          return next;
                        });
                      }}
                    />
                    <span className={styles.chamferSubLabel}>d1</span>
                  </div>
                  <div className={styles.chamferField}>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className={styles.propertyInputSmall}
                      value={(cornerRadius[selectedCornerIndex] || 0).toFixed(1)}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setCornerRadius((prev) => {
                          const next = [...(prev.length ? prev : Array(4).fill(0))];
                          if (selectedCornerIndex < next.length)
                            next[selectedCornerIndex] = v;
                          return next;
                        });
                      }}
                    />
                    <span className={styles.chamferSubLabel}>d2</span>
                  </div>
                </div>
                <div className={styles.cornerDiagram}>
                  <svg viewBox="0 0 60 60" className={styles.diagramSvg}>
                    <path
                      d="M 10 50 L 10 10 L 50 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                      opacity={0.6}
                    />
                    <path
                      d="M 10 50 L 50 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="10" cy="50" r="2" fill="#00bcd4" />
                    <circle cx="50" cy="10" r="2" fill="#00bcd4" />
                    <text x="18" y="48" className={styles.diagramLabel}>
                      d1
                    </text>
                    <text x="42" y="14" className={styles.diagramLabel}>
                      d2
                    </text>
                  </svg>
                </div>
              </div>
            )}
          </Section>
        </div>
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
