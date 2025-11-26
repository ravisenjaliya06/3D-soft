// Import necessary modules
import * as THREE from 'three';
import { Object3D, Position } from './interface';

// Define scene state interface
export interface SceneState {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
}

// Define metadata interface
export interface MetaData {
  updatedShapes: Record<string, Shape>;
}

// Define shape interface
export interface Shape {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  position: Position;
  rotation: Position;
  scale: Position;
}

// Define custom design state interface
export interface CustomDesignState {
  shapes: Shape[];
  sceneState: SceneState;
  metaData?: MetaData;
}

interface historyData {
  ChildObjects: Object3D[];
  mesh: THREE.Mesh;
  object: Object3D;
}

interface HistorySlice {
  id: string;
  type: string;
  data: historyData;
}
// Define history state interface
export interface HistoryState {
  past: HistorySlice[];
  future: HistorySlice[];
}

// Define the structure of your store's state
export interface RootState {
  data: {
    objects: Object3D[];
    points: [];
    walls: [];
  };
  customDesign: CustomDesignState;
  customDesignHistory: HistoryState;
  history: HistoryState;
}
