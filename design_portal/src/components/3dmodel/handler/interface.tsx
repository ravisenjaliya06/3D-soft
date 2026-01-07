import * as THREE from 'three';
import { Dimensions } from '../interface';
import { MinifixConnection, MinifixHole } from '../minifix/types';
import { MaterialForUpdate } from '../sidebar/interface';
import { Object3D, Position, Rotation } from '../store/interface';

export const ITEM = {
  DRAWER: 'DRAWER',
  PLANK: 'PLANK',
  DOOR: 'DOOR',
};

export const PLANK = {
  HORIZONTAL_PLANK: 'HORIZONTAL_PLANK',
  VERTICAL_PLANK: 'VERTICAL_PLANK',
  BACK_SIDE: 'BACK_PLANK',
  BOTTOM_SIDE: 'BOTTOM_PLANK',
  DRAWER_BACK_SIDE: 'DRAWER_BACK_SIDE_PLANK',
  DRAWER_BOTTOM_SIDE: 'DRAWER_BOTTOM_SIDE_PLANK',
  DRAWER_FRONT_SIDE: 'DRAWER_FRONT_SIDE_PLANK',
  DRAWER_HANDLE: 'DRAWER_HANDLE',
  DRAWER_LEFT_SIDE: 'DRAWER_LEFT_SIDE_PLANK',
  DRAWER_RIGHT_SIDE: 'DRAWER_RIGHT_SIDE_PLANK',
  FRONT_SIDE: 'FRONT_PLANK',
  LEFT_SIDE: 'LEFT_PLANK',
  RIGHT_SIDE: 'RIGHT_PLANK',
  TOP_SIDE: 'TOP_PLANK',
};

export interface CatalogItemData {
  id: string;
  name: string;
  data: {
    name: string;
    width: number;
    height: number;
    depth: number;
    layer: number;
    altitude: number;
    plankSize: number;
    position: Position;
    material: { type: string; value: string };
    parent: string;
    child: string[];
    grooves: Position[];
    catalog_type: string;
    minifixHoles: [];
  };
}

export interface CatalogResponseData {
  id?: string;
  width?: number;
  height?: number;
  depth?: number;
  position?: Position;
  name?: string;
  altitude?: number;
  material?: { type: string; value: string };
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  plankSize?: number;
  grooves: Position[];
  catalog_type?: string;
  minifixHoles: [];
  minifixConnections: [];
  minifixSpacing?: number;
}

export interface CatalogResponse {
  id: string;
  design: string;
  data: CatalogResponseData;
  catalog: string;
  name?: string;
  parent: string | null;
  parent_name: string | null;
  design_catalog_items: CatalogItemData[] | null;
  grooves: Position[] | null;
  catalog_type: string | null;
}

export interface PlankDataItem {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  position: Position;
  parent?: string | undefined;
  material?: { type: string; value: string };
}

export interface MoveHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  movableObjects?: THREE.Object3D[];
  gridBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface ItemData {
  id: string;
  name: string;
  data: {
    width: number;
    height: number;
    depth: number;
    position: Position;
    material: { type: string; value: string };
  };
  material: null;
}

export interface AllItemsData {
  id: string;
  name: string;
  data: {
    name: string;
    width: number;
    height: number;
    depth: number;
    layer: number;
    altitude: number;
    plankSize: number;
    position: Position;
    material: { type: string; value: string };
    parent: string;
    child: string[];
    grooves: Position[];
    catalog_type: string;
    minifixHoles: MinifixHole[];
    minifixConnections: MinifixConnection[];
  };
}

export type Material = { type: string; value: string };

export interface CatalogItem {
  id: string;
  name: string;
  data: {
    name: string;
    width: number;
    height: number;
    depth: number;
    position: Position;
    material: Material;
    parent?: string;
    child?: string[];
    id?: string;
    layer?: number;
    altitude?: number;
    plankSize?: number;
    rotateX?: number;
    rotateY?: number;
    rotateZ?: number;
    catalog_type?: string;
    grooves?: Position[];
    minifixHoles?: MinifixHole[];
    minifixConnections?: MinifixConnection[];
  };
  material: string | null;
}

export type UpdatedItemData = CatalogItem;

export interface CatalogItemData {
  id: string;
  name: string;
  data: {
    name: string;
    width: number;
    height: number;
    depth: number;
    layer: number;
    altitude: number;
    plankSize: number;
    position: Position;
    material: Material;
    parent: string;
    child: string[];
    grooves: Position[];
    catalog_type: string;
    minifixHoles: [];
  };
}

interface RulePartMaterial {
  id?: string;
  name?: string;
}

export interface RulePart {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  length?: number;
  icon?: string;
  material?: RulePartMaterial | null;
  thickness: number | null;
  position: Position;
  handle_position: Position | null;
  additional_data: { texture: string };
}

export interface CatalogRule {
  id: string;
  name: string;
  rule_parts?: RulePart[];
}

export interface AddItemDatabasePayload {
  catalogId: string;
  type: string;
  name: string;
  description: string;
  design_id: string;
  parent?: string;
  width?: number;
  height?: number;
  depth?: number;
  position?: { x: number; y: number; z: number };
  additional_data?: { texture: string; color?: string };
  parts?: Array<{
    name: string;
    rule_parts: RulePart[];
  }>;
}

export interface GrooveDetail {
  type: 'groove' | 'fitment';
  x: number;
  y: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
  connectedTo: string;
  groove_gap: number;
  groove_dig: number;
  position: Position;
}

export interface CatalogData {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  material: {
    type: string;
    value: string;
  };
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  plankSize: number;
  catalog_type: string;
  grooves?: GrooveDetail[];
  openDirection: string;
  [key: string]: unknown;
}

interface CreateResult {
  objectsList: Object3D[];
  mainObjects: Object3D[];
  catalogMap: Record<string, Object3D[]>;
}

interface CreateItemResponse {
  id: string;
  status: number;
  data: {
    id: string;
    name: string;
    data: CatalogData;
  };
}

export interface MoveObjectResult {
  createResult?: CreateResult | CreateItemResponse | null;
  threeDObject?: THREE.Mesh;
}

export interface CatalogWithChildren {
  catalog: {
    name: string;
    id: string;
    data: CatalogData;
  };
  items?: Array<{
    id: string;
    name: string;
    data: CatalogData;
  }>;
  child_catalogs?: Array<{
    catalog: {
      name: string;
      id: string;
      data: CatalogData;
    };
    items?: Array<{
      id: string;
      name: string;
      data: CatalogData;
    }>;
  }>;
}

export interface UpdatePayload {
  dimensions?: Partial<Dimensions>;
  position?: Partial<Position>;
  rotation?: Partial<Rotation>;
  material?: MaterialForUpdate;
  textureRotation?: number;
}

export interface UpdateDimensionsParams {
  newWidth: number;
  newHeight: number;
  newDepth: number;
  oldWidth: number;
  oldHeight: number;
  oldDepth: number;
}
