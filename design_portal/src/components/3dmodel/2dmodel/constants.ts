import { Record } from 'immutable';
import { Value } from 'react-svg-pan-zoom';
import { GridData } from './interface';

export const GRID_SIZE = {
  WIDTH: 10000,
  HEIGHT: 10000,
};

// step of grid which is snapping point (1 ft = 30.48 units)
export const GRID_STEP = 30.48;

// initial value of react-svg-pan-zoom
export const REACTSVGPANZOOM_INITIAL_VALUE: Value = {
  version: 2,
  mode: 'idle',
  focus: false,
  a: 1, // scale X (zoom horizontally)
  b: 0, // skew Y (always 0 for normal use)
  c: 0, // skew X (always 0 for normal use)
  d: 1, // scale Y (zoom vertically)
  e: 0, // translate X (pan horizontally)
  f: 0, // translate Y (pan vertically)
  viewerWidth: 0,
  viewerHeight: 0,
  SVGWidth: 0,
  SVGHeight: 0,
  startX: null,
  startY: null,
  endX: null,
  endY: null,
  miniatureOpen: false,
};

export const GridRecordFactory = Record<GridData>({
  id: '',
  type: 'horizontal-streak',
  properties: { step: 30.48 },
});

export const FEET_CHANGE = 30.48;
