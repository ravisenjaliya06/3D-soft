import { Position } from '../store/interface';

export interface MinifixStandards {
  SCREW_DIAMETER: number;
  SCREW_LENGTH: number;
  CAM_DIAMETER: number;
  CAM_DEPTH: number;
  DOWEL_DIAMETER: number;
  DOWEL_LENGTH: number;
  SPACING: number;
}

export interface PlankData {
  id: string;
  name: string;
  position: Position;
  width: number;
  height: number;
  depth: number;
}

export interface PlankConnection {
  plankA: PlankData;
  plankB: PlankData;
  jointPosition: Position;
  connectionType: 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL';
}

export interface MinifixHole {
  type: 'SCREW' | 'CAM' | 'DOWEL' | 'BOLT_DRILL';
  connectorId: string;
  position: Position;
  direction: Position;
  diameter?: number;
  length?: number;
  depth?: number;
  localPosition2D: { x: number; y: number };
}

export interface MinifixConnection {
  id: string;
  cupboardId: string;
  plankAId: string;
  plankBId: string;
  jointPosition: Position;
  connectionType: 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL';
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
