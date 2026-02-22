import * as THREE from 'three';
import { ThreeDView } from '../design/interface';
import { MoveHandler } from '../handler/moveHandler';
import { Dimensions } from '../interface';
import { MinifixConnection, MinifixHole } from '../minifix/types';
import { Position, Rotation } from '../store/interface';

// type const
export const FLOOR_PLAN_TYPES = {
  WALL: 'wall',
  CWALL: 'cwall',
  FLOOR: 'floor',
};

export const OBJECT_TYPES = {
  CUPBOARD: 'cupboard',
  PLATFORM: 'platform',
  SINK: 'sink',
  MODEL: 'model',
};

export const PART_TYPES = {
  PLANK: 'plank',
  BACK_PLANK: 'backPlank',
  DRAWER: 'drawer',
  DOOR: 'door',
  DOUBLE_DOOR: 'doubleDoor',
  VERTICAL_PLANK: 'verticalPlank',
  HORIZONTAL_PLANK: 'horizontalPlank',
  L_SHAPE_OBJECT: 'lShapeObject',
  U_SHAPE_OBJECT: 'uShapeObject',
  HANDLE: 'handle',
};

export const INVISIBLE_BOXES = {
  INVISIBLE_BOX: 'invisibleBox',
};

export const DRAWER_TYPES = {
  INSET: 'inset',
  OVERLAY: 'overlay',
};

export const DRAWER_PLANK_TYPES = {
  DRAWER_FACE: 'DRAWER_FACE_PLANK',
  FRONT_DRAWER_PLANK: 'DRAWER_FRONT_PLANK',
  BACK_DRAWER_PLANK: 'DRAWER_BACK_PLANK',
  BOTTOM_DRAWER_PLANK: 'DRAWER_BOTTOM_PLANK',
  RIGHT_DRAWER_PLANK: 'DRAWER_RIGHT_PLANK',
  LEFT_DRAWER_PLANK: 'DRAWER_LEFT_PLANK',
};

export const DOUBLE_DOOR_PLANK_TYPES = {
  RIGHT_PLANK: 'DOUBLE_DOOR_RIGHT_PLANK',
  LEFT_PLANK: 'DOUBLE_DOOR_LEFT_PLANK',
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
  WALL: 'Wall',
};

export const EDGES = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  FRONT: 'front',
  BACK: 'back',
};

export const GROOVE_TYPE = {
  GROOVE: 'groove',
  PROTRUSION: 'protrusion',
};

// type
type GeometryType = (typeof GEOMETRY)[keyof typeof GEOMETRY];
type DirectionType = (typeof DIRECTION_TYPES)[keyof typeof DIRECTION_TYPES];

interface Texture {
  id: string;
  name: string;
  texture: string;
  textureDetail: TextureDetails;
}

export interface TextureDetails {
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

export interface EdgeBandingState {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  front?: boolean;
  back?: boolean;
  thickness?: number;
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
  path?: string;
  unique_id?: string;

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
  minifixHoles?: MinifixHole[];
  minifixConnections?: MinifixConnection[];
  edgeBanding?: EdgeBandingState;

  // Per-cupboard minifix settings (stored when cupboard is created)
  minifixDistance?: number;
  minifixDiameterHole?: number;
  camDepth?: number;
  camDiameter?: number;
  camHeight?: number;
  handleMode?: 'handle' | 'handleless';
  grooves?: GrooveData[];
  nailerEnabled?: boolean;
  nailerModel?: string;

  // Floor-specific data (when type === OBJECT_TYPES.FLOOR)
  floorData?: {
    points: { id?: string; x: number; y: number }[];
    walls: string[];
  };
  direction?: string;
  holes?: HoleData[];
}

export interface HoleData {
  id: string; // ID of the object creating the hole (e.g., sink ID)
  position: Position; // Local position relative to the platform
  dimensions: Dimensions;
  rotation: Rotation;
}

export interface GrooveData {
  id: string; // "6000" in example
  type: string; // "4"
  isGenCode: string; // "2"
  face: string; // "5"
  x: number;
  y: number;
  endX: number;
  endY: number;
  width: number;
  depth: number;
  toolOffset: string; // "ÖÐ" (Center?) - maybe use enum
  slotType: string; // "0"
  macIndex: string; // "1"
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
  setShowSavePopup: React.Dispatch<React.SetStateAction<boolean>>;
  setCatalogName: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// TODO (HARSH): Created for temporary patching. Will update later when using SyncManager for lists.
export type MeshObjectPatch = Omit<
  Partial<MeshObjectData>,
  'dimensions' | 'position' | 'rotation'
> & {
  dimensions?: Partial<Dimensions>;
  position?: Partial<Position>;
  rotation?: Partial<Rotation>;
  edgeBanding?: EdgeBandingState;
  material?: Material[];
};
