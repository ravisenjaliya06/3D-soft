import { RecordOf } from 'immutable';
import { JSX } from 'react';
import { MeshObjectData } from '../sceneCreator/interface';

export interface Dimansions {
  width: number;
  height: number;
}

export interface GridsProps {
  width: number;
  height: number;
}

export interface GridProperties {
  step: number;
  color?: string;
  colors?: string[];
}

export interface GridData {
  id: string;
  type: string;
  properties: GridProperties;
}

export interface GridStreakProps extends GridComponentProps {
  loopLimit: number;
  renderLine: (pos: number, color: string) => JSX.Element;
}

export type GridRecord = RecordOf<GridData>;

export interface GridComponentProps {
  grid: GridRecord;
  key: string;
}

export interface WallPoint {
  id?: string;
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  startPoint: WallPoint;
  endPoint: WallPoint;
  width: number;
  height: number;
  thickness: number;
  depth: number;
  length: number;
  connectedTo: string[];
  selected?: boolean;
}

export interface Floor {
  id: string;
  points: WallPoint[];
  walls: string[];
}

export interface TwoDSidebarProps {
  object: MeshObjectData;
  pos: { x: number; y: number };
  onDragStart: () => void;
}
