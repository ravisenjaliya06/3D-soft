import { MeshObjectData } from '../sceneCreator/interface';
import { GRID_STEP } from './constants';
import { WallPoint } from './interface';

const DEFAULT_WALL_THICKNESS = 20;

const sameGridPoint = (p: WallPoint, x: number, y: number) =>
  Math.round(p.x) === Math.round(x) && Math.round(p.y) === Math.round(y);

/**
 * After deletes, keep any point that lies on a wall's centerline OR reference edge.
 * Edge-drawn walls store user vertices on the reference edge; the old logic only matched
 * centerline, so floor reconciliation could strip all polyline points and break endless chains.
 */
export const removeWallsPoints = (points: WallPoint[], walls: MeshObjectData[]): WallPoint[] => {
  return points.filter((point) => {
    return walls.some((wall) => {
      if (!wall.position || !wall.dimensions) return false;
      const centerX = wall.position.x * 100;
      const centerY = wall.position.z * 100;
      const half = wall.dimensions.width / 2;
      const rotationY = wall.rotation?.y ?? 0;
      const cos = Math.cos(rotationY);
      const sin = Math.sin(rotationY);

      const csx = centerX - cos * half;
      const csy = centerY + sin * half;
      const cex = centerX + cos * half;
      const cey = centerY - sin * half;

      if (sameGridPoint(point, csx, csy) || sameGridPoint(point, cex, cey)) {
        return true;
      }

      if (wall.wallOffsetSign == null) {
        return false;
      }

      const t = wall.dimensions.depth ?? wall.thickness ?? DEFAULT_WALL_THICKNESS;
      const sign = wall.wallOffsetSign;
      const dx = cex - csx;
      const dy = cey - csy;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        return false;
      }
      const plx = -dy / len;
      const ply = dx / len;
      const off = (sign * t) / 2;
      const rsx = csx - plx * off;
      const rsy = csy - ply * off;
      const rex = cex - plx * off;
      const rey = cey - ply * off;

      return sameGridPoint(point, rsx, rsy) || sameGridPoint(point, rex, rey);
    });
  });
};

export const snapToGrid = (x: number, y: number) => ({
  x: Math.round(x / GRID_STEP) * GRID_STEP,
  y: Math.round(y / GRID_STEP) * GRID_STEP,
});
