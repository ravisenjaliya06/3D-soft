import React from 'react';
import { Text as KonvaText, Line } from 'react-konva';
import {
  CIRCLE_FONT_SIZE,
  DEFAULT_OFFSET,
  DIM_COLOR,
  DIM_STROKE_WIDTH,
  RADIAL_OFFSET,
  TEXT_FONT_SIZE,
  TEXT_OFFSET_X,
  TEXT_OFFSET_Y_BASE,
  TEXT_WIDTH,
  TICK_LENGTH,
} from '../constants';
import { DimensionHighlighterProps, DimensionLineProps, Hole, Point } from '../types';
import { calculatePolygonWinding } from '../utils/geometryUtils';
import { getPanelBounds, getHoleBounds } from '../utils/boundsUtils';

/**
 * A reusable component that renders a standard dimension line with tick marks and a rotated label.
 *
 * @param props {@link DimensionLineProps}
 */
const DimensionLine: React.FC<DimensionLineProps> = ({
  p1,
  p2,
  text = '',
  offset = DEFAULT_OFFSET,
  hideText = false,
}) => {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const perpAngle = angle + Math.PI / 2;
  const offX = Math.cos(perpAngle) * offset;
  const offY = Math.sin(perpAngle) * offset;

  const lp1 = { x: p1.x + offX, y: p1.y + offY };
  const lp2 = { x: p2.x + offX, y: p2.y + offY };

  /**
   * Helper function to calculate the start and end points of a tick mark line.
   * @param p The point on the dimension line where the tick is centered.
   * @returns An array of coordinates [x1, y1, x2, y2] for the Konva Line component.
   */
  const getTickLinePoints = (p: Point): number[] => [
    p.x - Math.cos(perpAngle) * TICK_LENGTH,
    p.y - Math.sin(perpAngle) * TICK_LENGTH,
    p.x + Math.cos(perpAngle) * TICK_LENGTH,
    p.y + Math.sin(perpAngle) * TICK_LENGTH,
  ];

  let normalizedAngle = (angle * 180) / Math.PI;
  // Position text "outside" the dimension line.
  // If offset is positive (line moved in perpAngle), textOffsetY should be negative to move further out.
  let textOffsetY = offset >= 0 ? -TEXT_OFFSET_Y_BASE : TEXT_OFFSET_Y_BASE;

  // Normalize angle to keep text right-side up (between -90 and 90 degrees)
  if (normalizedAngle > 90 || normalizedAngle < -90) {
    normalizedAngle += 180;
    textOffsetY = -textOffsetY; // Flip to stay on the same visual side
  }

  return (
    <>
      {/* Main dimension line - listening={false} prevents it from interfering with hover states */}
      <Line
        points={[lp1.x, lp1.y, lp2.x, lp2.y]}
        stroke={DIM_COLOR}
        strokeWidth={DIM_STROKE_WIDTH}
        listening={false}
      />
      {/* End tick marks */}
      <Line
        points={getTickLinePoints(lp1)}
        stroke={DIM_COLOR}
        strokeWidth={DIM_STROKE_WIDTH}
        listening={false}
      />
      <Line
        points={getTickLinePoints(lp2)}
        stroke={DIM_COLOR}
        strokeWidth={DIM_STROKE_WIDTH}
        listening={false}
      />
      {/* Dimension text - omitted when hideText or no text */}
      {!hideText && text && (
        <KonvaText
          x={(lp1.x + lp2.x) / 2}
          y={(lp1.y + lp2.y) / 2}
          text={text}
          fontSize={TEXT_FONT_SIZE}
          fill={DIM_COLOR}
          align="center"
          verticalAlign="middle"
          rotation={normalizedAngle}
          width={TEXT_WIDTH}
          offsetX={TEXT_OFFSET_X}
          offsetY={textOffsetY}
          listening={false}
        />
      )}
    </>
  );
};

/**
 * Component responsible for rendering dimension lines for panels and holes based on interaction state.
 *
 * @param props {@link DimensionHighlighterProps}
 */
export const DimensionHighlighter: React.FC<DimensionHighlighterProps> = ({
  hoveredHoleIndex,
  selectedHoleIndex,
  hoveredPanel,
  holes,
  shapePoints,
  defaultPanelPoints,
  showSelectedHoleOffsets = false,
}) => {
  // Determine what object to show dimensions for.
  // IMPORTANT: selection must take precedence over hover so selected dimensions stay visible.
  const selectedHole = selectedHoleIndex !== null ? holes[selectedHoleIndex] : null;
  const hoveredHole = hoveredHoleIndex !== null ? holes[hoveredHoleIndex] : null;

  const showPanelDims = !selectedHole && !hoveredHole && hoveredPanel;

  if (!selectedHole && !hoveredHole && !showPanelDims) return null;

  /**
   * Renders dimensions for the main panel outline.
   */
  const renderPanelDimensions = () => {
    const pts = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
    if (pts.length < 2) return null;
    return (
      <>
        {pts.map((p, i) => {
          const nextP = pts[(i + 1) % pts.length];
          const dist = Math.hypot(nextP.x - p.x, nextP.y - p.y);
          return (
            <DimensionLine
              key={`panel-dim-${i}`}
              p1={p}
              p2={nextP}
              text={`${dist.toFixed(1)} mm`}
              offset={-DEFAULT_OFFSET}
            />
          );
        })}
      </>
    );
  };

  /**
   * Renders dimensions for a specific hole.
   */
  const renderHoleDimensions = (hole: Hole) => {
    if (hole.type === 'circle') {
      const r = hole.width / 2;
      const cx = hole.x + r;
      const cy = hole.y + r;
      const radialAngle = -Math.PI / 4;
      return (
        <>
          <Line
            points={[cx, cy, cx + r * Math.cos(radialAngle), cy + r * Math.sin(radialAngle)]}
            stroke={DIM_COLOR}
            strokeWidth={DIM_STROKE_WIDTH}
            listening={false}
          />
          <KonvaText
            x={cx + (r / 2) * Math.cos(radialAngle) + RADIAL_OFFSET}
            y={cy + (r / 2) * Math.sin(radialAngle) - RADIAL_OFFSET}
            text={`R: ${r.toFixed(1)} mm`}
            fontSize={CIRCLE_FONT_SIZE}
            fill={DIM_COLOR}
            fontStyle="bold"
            listening={false}
          />
        </>
      );
    }

    if (hole.type === 'polygon' && hole.points) {
      // For polygon holes, calculate winding to determine "outside" direction
      const area = calculatePolygonWinding(hole.points);
      const isCW = area > 0;
      const polyOffset = isCW ? -DEFAULT_OFFSET : DEFAULT_OFFSET;

      return (
        <>
          {hole.points.map((p, i) => {
            const nextP = hole.points![(i + 1) % hole.points!.length];
            const dist = Math.hypot(nextP.x - p.x, nextP.y - p.y);
            return (
              <DimensionLine
                key={`hole-dim-${i}`}
                p1={p}
                p2={nextP}
                text={`${dist.toFixed(1)} mm`}
                offset={polyOffset}
              />
            );
          })}
        </>
      );
    }

    // Rectangle or slotting: 4 edges (top, right, bottom, left)
    const { x, y, width, height } = hole;
    const edges: [Point, Point, string][] = [
      [{ x, y }, { x: x + width, y }, `${width.toFixed(1)} mm`],
      [{ x: x + width, y }, { x: x + width, y: y + height }, `${height.toFixed(1)} mm`],
      [{ x: x + width, y: y + height }, { x, y: y + height }, `${width.toFixed(1)} mm`],
      [{ x, y: y + height }, { x, y }, `${height.toFixed(1)} mm`],
    ];
    return (
      <>
        {edges.map(([p1, p2, text], i) => (
          <DimensionLine key={i} p1={p1} p2={p2} text={text} offset={-DEFAULT_OFFSET} />
        ))}
      </>
    );
  };

  const renderSelectedHoleOffsetDimensions = () => {
    if (!showSelectedHoleOffsets || selectedHoleIndex === null || !holes[selectedHoleIndex]) return null;

    const panelB = getPanelBounds(shapePoints, defaultPanelPoints);
    const holeB = getHoleBounds(holes[selectedHoleIndex]);

    // Left distance: along the hole's top edge (horizontal)
    const leftP1 = { x: panelB.minX, y: holeB.minY };
    const leftP2 = { x: holeB.minX, y: holeB.minY };

    // Top distance: along the hole's left edge (vertical)
    const topP1 = { x: holeB.minX, y: panelB.minY };
    const topP2 = { x: holeB.minX, y: holeB.minY };

    return (
      <>
        <DimensionLine
          p1={leftP1}
          p2={leftP2}
          offset={-DEFAULT_OFFSET}
          hideText
        />
        <DimensionLine
          p1={topP1}
          p2={topP2}
          offset={-DEFAULT_OFFSET}
          hideText
        />
      </>
    );
  };

  return (
    <>
      {selectedHole && renderHoleDimensions(selectedHole)}
      {hoveredHole &&
        (selectedHoleIndex === null || hoveredHoleIndex !== selectedHoleIndex) &&
        renderHoleDimensions(hoveredHole)}
      {showPanelDims ? renderPanelDimensions() : null}
      {renderSelectedHoleOffsetDimensions()}
    </>
  );
};
