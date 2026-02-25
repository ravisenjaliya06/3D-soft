import { MeshObjectData } from '../sceneCreator/interface';
import { GRID_STEP } from './constants';
import { WallPoint } from './interface';

export const snapToGrid = (x: number, y: number) => ({
  x: Math.round(x / GRID_STEP) * GRID_STEP,
  y: Math.round(y / GRID_STEP) * GRID_STEP,
});

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

      const startX = centerX - cos * half;
      const startY = centerY + sin * half;
      const endX = centerX + cos * half;
      const endY = centerY - sin * half;

      const matchStart =
        Math.round(point.x) === Math.round(startX) && Math.round(point.y) === Math.round(startY);
      const matchEnd =
        Math.round(point.x) === Math.round(endX) && Math.round(point.y) === Math.round(endY);

      return matchStart || matchEnd;
    });
  });
};
