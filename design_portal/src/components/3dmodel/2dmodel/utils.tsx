import { GRID_STEP } from './constants';

export const snapToGrid = (x: number, y: number) => ({
  x: Math.round(x / GRID_STEP) * GRID_STEP,
  y: Math.round(y / GRID_STEP) * GRID_STEP,
});
