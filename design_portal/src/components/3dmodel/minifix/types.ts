import { Position } from '../store/interface';

export interface MinifixStandards {
  minifixDistance: number;
  minifixDiameterHole: number;
  camDepth: number;
  camHeight: number;
  edgeBandingDistance: number;
  screwDiameter: number;
  screwLength: number;
  camDiameter: number;
  dowelDiameter: number;
  dowelLength: number;
  dowelDistance: number;
  SPACING?: number; // Keep for backward compatibility or remove if unused
}

export interface PlankData {
  id: string;
  name: string;
  position: Position;
  width: number;
  height: number;
  depth: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface PlankConnection {
  plankA: PlankData;
  plankB: PlankData;
  jointPosition: Position;
  touchingFaceNormal: Position; // Normal of the face on plankA that touches plankB
  connectionType: 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL' | 'VERTICAL_TO_VERTICAL';
}

export interface MinifixHole {
  type: 'SCREW' | 'CAM' | 'DOWEL' | 'BOLT_DRILL';
  connectorId: string; // ID of the parent connection
  position: Position; // World position
  direction: Position; // Normal vector pointing INTO the hole
  drillType: '1' | '2'; // '1' = Vertical (Face), '2' = Horizontal (Edge)
  face: string; // '1' through '6'
  diameter?: number;
  length?: number;
  depth?: number;
  height?: number; // Needed?
  localPosition2D: { x: number; y: number }; // Relative to plank origin (bottom-left or center)
}

export interface MinifixConnection {
  id: string;
  cupboardId: string;
  plankAId: string;
  plankBId: string;
  jointPosition: Position;
  connectionType: 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL' | 'VERTICAL_TO_VERTICAL';

  // Housing Plank = The plank that contains the Cam and the Through-holes (Usually Top/Bottom)
  // Bolt Plank = The plank that contains the Thread insert (Usually Side/Vertical)

  screwHousing: MinifixHole; // 30mm hole in Housing Plank (Edge)
  screwMating: MinifixHole;  // 10mm hole in Bolt Plank (Face)
  dowelHousing: MinifixHole; // 20mm hole in Housing Plank (Edge)
  dowelMating: MinifixHole;  // 10mm hole in Bolt Plank (Face)
  cam: MinifixHole;          // Cam hole in Housing Plank (Face)
}

export type Axis = 'x' | 'y' | 'z';
