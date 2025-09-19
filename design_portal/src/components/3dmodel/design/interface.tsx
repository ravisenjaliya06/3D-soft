import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export interface ThreeDView {
  toggle2DMode: (is2D: boolean) => void;
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
  // addBaseCabinetsUnderPlatform: () => void;
  // addFullKitchenSetup: () => Promise<void>;
  loadSinkModel: (url: string) => Promise<void>;
  // loadHandleModel: (url: string) => Promise<void>;
}

export const itemType = {
  CUPBOARD: 'CUPBOARD',
  DOOR: 'DOOR',
  DRAWER: 'DRAWER',
  PLANK: 'PLANK',
  VERTICAL_PLANK: 'VERTICAL_PLANK',
  HORIZONTAL_PLANK: 'HORIZONTAL_PLANK',
  VERTICAL: 'VERTICAL',
  HORIZONTAL: 'HORIZONTAL',
  INVISIBLE_BOX: 'invisibleBox',
};

export interface HelperToolsProps {
  position: { x: number; y: number };
  onCopy: () => void;
  onDelete: () => void;
  onMove?: () => void;
  onLock: () => void;
  onUnlock: () => void;
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
