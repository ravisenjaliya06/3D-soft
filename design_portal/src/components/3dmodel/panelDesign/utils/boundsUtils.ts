import { Bounds, BoundsMinMax, Hole, Point } from '../types';

/** Compute bounding box of a polygon from points. */
export function getBoundsFromPoints(points: Point[]): BoundsMinMax {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return { minX, minY, maxX, maxY };
}

/** Get panel bounds from shape points or default. */
export function getPanelBounds(shapePoints: Point[], defaultPanelPoints: Point[]): Bounds {
  const pts = shapePoints.length > 0 ? shapePoints : defaultPanelPoints;
  const { minX, minY, maxX, maxY } = getBoundsFromPoints(pts);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Get hole bounding box. */
export function getHoleBounds(hole: Hole): Bounds {
  if (hole.type === 'polygon' && hole.points?.length) {
    const { minX, minY, maxX, maxY } = getBoundsFromPoints(hole.points);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }
  return {
    minX: hole.x,
    minY: hole.y,
    maxX: hole.x + hole.width,
    maxY: hole.y + hole.height,
    width: hole.width,
    height: hole.height,
  };
}
