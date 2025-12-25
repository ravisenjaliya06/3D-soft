import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { MoveHandler } from '../handler/moveHandlerInterface';
import { SelectObjectController } from '../sceneCreator/tools/selectTool';
import { Axis } from '../sidebar/interface';

export interface CreateDistanceLineParams {
  group: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  viewOffsetDir: THREE.Vector3;
  label: string;
  meta?: DimensionMeta | null;
}

export interface CreateSideDistanceParams {
  side: 'min' | 'max';
  refPos: number | null;
  mainAxis: Axis;
  offsetDir: THREE.Vector3;
  group: THREE.Group;
  unit: string;
  fixed: { x: number | null; y: number | null; z: number | null };
}

export interface AxisConfig {
  secondaryAxes: Axis[];
  offsetDir: THREE.Vector3;
}

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

export enum Priority {
  NONE,
  WALL,
  PLANK,
}

export interface ReferenceParam {
  pos: number;
  priority: Priority;
  box?: THREE.Box3;
}

export interface CreateAxisDistanceParams {
  group: THREE.Group;
  mainAxis: Axis;
  secondaryAxes: Array<Axis>;
  offsetDirFn: (mesh: THREE.Mesh, box: THREE.Box3) => THREE.Vector3;
}

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
