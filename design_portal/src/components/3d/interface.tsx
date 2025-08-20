import * as THREE from 'three';
import { Position } from '../3dmodel/store/interface';

export interface DesignProps {
  isReady: boolean;
  scene?: THREE.Scene | null;
  selectedObject?: THREE.Object3D | null;
  selectedObjectLine?: THREE.LineSegments | null;
  selectedEgdeLine?: THREE.LineSegments | null;
  cupBoardData?: cupBoardData[];
  setIsReady: (isReady: boolean) => void;
  setScene?: (scene: THREE.Scene) => void | null;
  setSelectedObject: (object: THREE.Object3D | null) => void;
  setSelectedObjectLine?: (line: THREE.LineSegments | null) => void;
  setSelectedEgdeLine?: (line: THREE.LineSegments | null) => void;
  setcupBoardData?: (parts: cupBoardData[]) => void;
}

export interface Plank {
  position: Position;
  uuid: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  center_point: { x: number; y: number };
  up_down_space: { up: number; down: number } | null;
  left_right_space: { left: number; right: number } | null;
  texture: string | null;
}

export interface cupBoardObjectData {
  uuid: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  center_point: { x: number; y: number };
  up_down_space: { up: number; down: number } | null;
  left_right_space: { left: number; right: number } | null;
  texture: string | null;
}

export interface cupBoardData {
  type: string;
  data: cupBoardObjectData[];
  childs: string[];
}

export type partsDataList = cupBoardData[];
