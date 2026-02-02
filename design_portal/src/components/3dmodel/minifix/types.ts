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
  connectorId: string;
  position: Position;
  direction: Position;
  diameter?: number;
  length?: number;
  depth?: number;
  height?: number;
  localPosition2D: { x: number; y: number };
}

export interface MinifixConnection {
  id: string;
  cupboardId: string;
  plankAId: string;
  plankBId: string;
  jointPosition: Position;
  connectionType: 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL' | 'VERTICAL_TO_VERTICAL';
  screw: {
    position: Position;
    direction: Position;
    diameter: number;
    length: number;
    localPosition2D: { x: number; y: number }; // Now mandatory
  };
  cam: {
    position: Position;
    direction: Position;
    diameter: number;
    depth: number;
    localPosition2D: { x: number; y: number }; // Now mandatory
  };
  dowel: {
    position: Position;
    direction: Position;
    diameter: number;
    length: number;
    localPosition2D: { x: number; y: number }; // Now mandatory
  };
  boltDrill: {
    position: Position;
    direction: Position;
    diameter?: number;
    length?: number;
    localPosition2D: { x: number; y: number }; // Now mandatory
  };
}

export type Axis = 'x' | 'y' | 'z';
