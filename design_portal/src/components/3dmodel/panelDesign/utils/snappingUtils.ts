import { Point } from '../types';

export const SNAP_TOLERANCE = 15;

export const getSnappedPosition = (
  x: number,
  y: number,
  allPoints: Point[],
  stageScale: number,
  ignoreSelf?: Point
) => {
  let snappedX = x;
  let snappedY = y;
  let guides: { type: 'x' | 'y'; value: number }[] = [];

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
