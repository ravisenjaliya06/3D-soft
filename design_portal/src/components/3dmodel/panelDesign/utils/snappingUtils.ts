import { Axis2D, Point } from '../types';

export const SNAP_TOLERANCE = 15;

/**
 * Calculates a snapped position for a given point against a set of target points.
 * Provides alignment "guides" for X and Y axes if snapping occurs.
 *
 * @param x Raw X coordinate
 * @param y Raw Y coordinate
 * @param allPoints Array of target points to snap to
 * @param stageScale Current zoom scale of the stage
 * @param ignoreSelf Optional point to exclude from snapping comparison
 */
export const getSnappedPosition = (
  x: number,
  y: number,
  allPoints: Point[],
  stageScale: number,
  ignoreSelf?: Point
) => {
  let snappedX = x;
  let snappedY = y;
  let guides: { type: Axis2D; value: number }[] = [];

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
