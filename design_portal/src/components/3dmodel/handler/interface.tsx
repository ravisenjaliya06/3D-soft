import * as THREE from 'three';
import { Position } from '../store/interface';

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

export interface MinifixHole {
  type: 'SCREW' | 'CAM' | 'DOWEL' | 'BOLT_DRILL';
  connectorId: string;
  position: Position;
  direction: Position;
  diameter?: number;
  length?: number;
  depth?: number;
  localPosition2D: { x: number; y: number };
}

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
    grooves: [];
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
  grooves: [];
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
  grooves: [] | null;
  catalog_type: string | null;
}

export interface PlankDataItem {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  position: Position;
}

export interface MoveHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  movableObjects: THREE.Object3D[];
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

export interface UpdatedItemData {
  id: string;
  name: string;
  data: {
    name: string;
    width: number;
    height: number;
    depth: number;
    position: Position;
    material: { type: string; value: string };
    parent: string;
    child: string[];
    minifixHoles: MinifixHole[];
    grooves: Position[];
  };
  material: string;
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
    grooves: [];
    catalog_type: string;
    minifixHoles: [];
  };
}
