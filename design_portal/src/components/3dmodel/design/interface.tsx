import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SelectObjectController } from '../sceneCreator/tools/selectTool';
import { MoveHandler } from '../handler/moveHandlerInterface';

export interface ThreeDView {
  toggleZoomMode: (enable: boolean) => void;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  mount: HTMLDivElement | null;
  transformControls: TransformControls;
  toggleSky: () => void;
  isDay: boolean;
  isZoomMode: boolean;
  addSimpleCabinet: () => void;
  addSimpleCabinet1?: () => void;
  loadSinkModel: (url: string) => Promise<void>;
  selector: SelectObjectController | null;
  moveHandler?: MoveHandler;
}

export const itemType = {
  WALL: 'WALL',
  CUPBOARD: 'CUPBOARD',
  DOOR: 'DOOR',
  DRAWER: 'DRAWER',
  PLANK: 'PLANK',
  VERTICAL_PLANK: 'VERTICAL_PLANK',
  HORIZONTAL_PLANK: 'HORIZONTAL_PLANK',
  VERTICAL: 'VERTICAL',
  HORIZONTAL: 'HORIZONTAL',
  INVISIBLE_BOX: 'invisibleBox',
  Drawer: 'Drawer',
};

export interface HelperToolsProps {
  onCopy: () => void;
  onDelete: () => void;
  onMove?: () => void;
  isLocked?: boolean;
}
export interface DesignProps {
  setDesign3D: (design3D: ThreeDView | null) => void;
}
export interface MeasurementToolProps {
  design3D: ThreeDView;
  isActive: boolean;
  unitType: 'mm' | 'cm' | 'in' | 'ft' | 'mi' | 'm';
  onComplete?: (distance: number) => void;
}

export interface Part {
  name: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  material: THREE.MeshStandardMaterialParameters | THREE.Material;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  userData?: {
    objectId: string;
    type: string;
  };
}

export interface DimensionMeta {
  targetUuid: string;
  side: string;
  ref: number;
  axis: 'x' | 'y' | 'z';
}
