import * as THREE from 'three';
import { ThreeDView } from '../design/interface';
import { MoveHandler } from '../handler/moveHandler';
import { Dimensions } from '../interface';
import { Position, Rotation } from '../store/interface';

// type const
export const FLOOR_PLAN_TYPES = {
  WALL: 'wall',
  CWALL: 'cwall',
};

export const OBJECT_TYPES = {
  CUPBOARD: 'cupboard',
};

export const PART_TYPES = {
  PLANK: 'plank',
  BACK_PLANK: 'backPlank',
  DRAWER: 'drawer',
  DOOR: 'door',
  VERTICAL_PLANK: 'verticalPlank',
  HORIZONTAL_PLANK: 'horizontalPlank',
};

export const DRAWER_TYPES = {
  INSET: 'inset',
  OVERLAY: 'overlay',
};

export const DRAWER_PLANK_TYPES = {
  DRAWER_FACE: 'DRAWER_FACE',
  FRONT_DRAWER_PLANK: 'FRONT_DRAWER_PLANK',
  BACK_DRAWER_PLANK: 'BACK_DRAWER_PLANK',
  BOTTOM_DRAWER_PLANK: 'BOTTOM_DRAWER_PLANK',
  RIGHT_DRAWER_PLANK: 'RIGHT_DRAWER_PLANK',
  LEFT_DRAWER_PLANK: 'LEFT_DRAWER_PLANK',
};

export const GEOMETRY = {
  BOX_GEOMETRY: 'BOX_GEOMETRY',
  EXTRUDE_GEOMETRY: 'ExtrudeGeometry',
  NONE: 'none',
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

export const TEXTURES = {
  LIGHT_WOOD: '/textures/light_wood.jpg',
  WHITE_TEXTURE: '/Texture0004.jpg',
};

export const MATERIAL_TYPES = {
  BANDING: 'Banding',
  BOARD_STOCK: 'Board Stock',
  CASTER: 'Caster',
  CONNECTOR: 'Connector',
  DRAWER_GUIDE: 'Drawer Guide',
  HINGE: 'Hinge',
  HINGE_PLATE: 'Hinge Plate',
  LAMINATE: 'Laminate',
  LEG: 'Leg',
  LEG_LEVELER: 'Leg Leveler',
  MISCELLANEOUS: 'Miscellaneous',
  MOLDING: 'Molding',
  PANEL_STOCK: 'Panel Stock',
  PULL: 'Pull',
  ROD: 'Rod',
  SLIDING_DOOR_RAIL: 'Sliding Door Rail',
  SLIDING_DOOR_ROLLER: 'Sliding Door Roller',
  WIRE_BASKET: 'Wire Basket',
};

export const EDGES = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  FRONT: 'front',
  BACK: 'back',
}

// type
type GeometryType = (typeof GEOMETRY)[keyof typeof GEOMETRY];
type DirectionType = (typeof DIRECTION_TYPES)[keyof typeof DIRECTION_TYPES];

interface Texture {
  id: string;
  name: string;
  texture: string;
  textureDetail: TextureDetails;
}

interface TextureDetails {
  decal: number;
  height: number;
  id: string;
  image: string;
  name: string;
  organization: string;
  title: number;
  type: string;
  url: string;
  width: number;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  company?: string;
  description?: string;
  isDeleted?: boolean;
  textures?: Texture[];
  properties?: any;
}

export interface MeshObjectData {
  // main properties
  id: string;
  name: string;
  type: string;
  geometryType: GeometryType;
  dimensions: Dimensions;
  position: Position;
  rotation: Rotation;

  //optional properties
  description?: string;
  parent?: string;
  scale?: Position;
  material?: Material[];
  isMain?: boolean;
  openDirection?: DirectionType;
  connectedTo?: string[];
  thickness?: number;
  selected?: boolean;
  drawerType?: string;
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

// TODO (HARSH): Created for temporary patching. Will update later when using SyncManager for lists.
export type MeshObjectPatch = Omit<
  Partial<MeshObjectData>,
  'dimensions' | 'position' | 'rotation'
> & {
  dimensions?: Partial<Dimensions>;
  position?: Partial<Position>;
  rotation?: Partial<Rotation>;
};
