export interface Point {
  x: number;
  y: number;
}

export type CornerType = 'default' | 'round' | 'chamfer' | 'cut-round';

export interface Hole {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rect' | 'circle' | 'polygon' | 'slotting';
  points?: Point[];
  cornerRadius?: number[];
  cornerTypes?: CornerType[];
  lineTypes?: ('linear' | 'arc')[];
  lineRadii?: number[];
  id?: string;
}

export interface CurveControls {
  [key: string]: Point;
}
