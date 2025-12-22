import * as THREE from 'three';
import { ThreeDView } from '../design/interface';
import { MoveHandler } from '../handler/moveHandler';
import { Dimensions } from '../interface';
import { Position, Rotation } from '../store/interface';

// type const
export const FLOOR_PLAN_TYPES = {
  WALL: 'wall',
};

export const OBJECT_TYPES = {
  CUPBOARD: 'cupboard',
};

export const PART_TYPES = {
  PLANK: 'plank',
  BACK_PLANK: 'backPlank',
  DRAWER: 'drawer',
  DOOR: 'door',
};

export const GEOMETRY = {
  BOX_GEOMETRY: 'BOX_GEOMETRY',
  EXTRUDE_GEOMETRY: 'ExtrudeGeometry',
};

export const MATERIAL_TYPE = {
  COLOR: 'COLOR',
  TEXTURE: 'TEXTURE',
};

export const DIRECTION_TYPES = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
};

// type
type geometry_type = (typeof GEOMETRY)[keyof typeof GEOMETRY];
type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];
type DirectionType = (typeof DIRECTION_TYPES)[keyof typeof DIRECTION_TYPES];

// interface
interface Material {
  type: MaterialType;
  value: string;
  repeatX?: number;
  repeatY?: number;
}

export interface MeshObjectData {
  id: string;
  name: string;
  type: string;
  geometry_type: geometry_type;
  parent?: string;
  dimensions: Dimensions;
  position: Position;
  rotation: Rotation;
  scale?: Position;
  material?: Material;
  isMain?: boolean;
  openDirection?: DirectionType;
}

export interface userData {
  objectId: string;
}

export interface SceneBuilderConfig {
  mount: HTMLDivElement;
  cameraConfig?: {
    fov?: number;
    near?: number;
    far?: number;
    position?: THREE.Vector3;
  };
  rendererConfig?: {
    antialias?: boolean;
    alpha?: boolean;
    preserveDrawingBuffer?: boolean;
  };
  lightingConfig?: {
    ambientIntensity?: number;
    directionalIntensity?: number;
    hemiIntensity?: number;
  };
  gridConfig?: {
    size?: number;
    divisions?: number;
  };
  controlsConfig?: {
    enableDamping?: boolean;
    dampingFactor?: number;
    enableZoom?: boolean;
    enablePan?: boolean;
  };
}

export interface HelperToolProps {
  design3D: ThreeDView;
  selectedObject: THREE.Mesh | null;
  moveHandler: MoveHandler | null;
}
