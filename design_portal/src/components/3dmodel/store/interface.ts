import * as THREE from 'three';
import { CatalogRule } from '../handler/interface';
import { ShapeData } from '../interface';
import { MinifixConnection, MinifixHole } from '../minifix';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface Material {
  type: string;
  value: string;
}

export interface ApiData {
  position: Position;
}

export interface Object3D {
  x?: undefined;
  y?: undefined;
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize?: number;
  layer: number;
  altitude?: number;
  position: Position;
  rotation?: Position;
  center_point?: Position;
  material: Material;
  parent?: string | null;
  child: string[];
  grooves?: Position[];
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  minifixSpacing?: number;
  catalog_type?: string;
  minifixConnections?: MinifixConnection[];
  minifixHoles?: MinifixHole[];
  handlePosition?: string;
  // Optional server/API enrichment
  apiData?: ApiData;
  rules?: [];
  length?: number | null;
  type?: string;
  description?: string;
  additional_data?: { texture: string; color?: string };
  catalog_rules?: CatalogRule[];
  children?: Object3D[];
}

// New interfaces for API requests
export interface CatalogItem {
  id?: string;
  name: string;
  data: {
    width: number;
    height: number;
    depth: number;
    layer: number;
    altitude: number;
    plankSize?: number;
    position: Position;
    material: Material;
    parent: string;
    child: string[];
    grooves: [];
  };
  material: string;
}

export interface CatalogData {
  catalog: {
    id?: string;
    name: string;
    data: {
      width: number;
      height: number;
      depth: number;
      position: Position;
      rotateX: number;
      rotateY: number;
      rotateZ: number;
    };
  };
  items?: CatalogItem[];
  child_catalogs?: CatalogData[];
}

// Interface for catalog ID based creation
export interface CatalogIdRequest {
  name: string;
  catalog_id: string;
}

// Interface for full data based creation
export interface FullDataRequest {
  name: string;
  data: CatalogData;
}

export interface History {
  id: string;
  action: string;
  data?: Object3D;
}
export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageDimensions {
  imageUrl?: string;
  fileName?: string;
  aspectRatio?: number;
  imageSize?: ImageSize;
}

export interface ImageMetadata {
  url: string;
  fileName: string;
  aspectRatio: number;
  size: ImageSize;
}

export interface ImageDataMap {
  [id: string]: ImageMetadata;
}

export interface PropertyChange {
  property: string;
  oldValue: number | Position | string;
  newValue: number | Position | string;
}
export interface Shape {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  position: Position;
  rotation: Position;
  scale: Position;
}

export interface CustomDesignState {
  shapes: ShapeData[];
  selectedShapeId: string | null;
  sceneState: {
    gridVisible: boolean;
    gridSize: number;
    cameraPosition: Position;
    scene: THREE.Scene;
  };
}
export interface DataState {
  objects: Object3D[];
  selectedObject: string | null;
  selectedChildObject: string | null;
  selectedInvisibleBox: string | null;
  mainCupboardId: string | null;
  isQuickHideActive: boolean;
  isMeasurementActive: boolean;
  currentUnitType: 'mm' | 'cm' | 'in';
  showCreationCancelHint: boolean;
  isAlignmentActive: boolean;
  hoverdMesh: THREE.Mesh | null;
}
export interface HistoryAction {
  id: string;
  type: 'ADD' | 'REMOVE' | 'UPDATE' | 'PROPERTY_CHANGE' | 'CLEAR';
  data: {
    object?: Object3D;
    previousState?: Object3D;
    mesh?: THREE.Mesh;
    objects?: Object3D[];
    meshes?: THREE.Mesh[];
    propertyChanges?: {
      property: string;
      oldValue: number;
      newValue: number;
    }[];
    childObjects?: Object3D[];
  };
}

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
}

export type UnitType = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export interface MeasurementState {
  isActive: boolean;
  unitType: UnitType;
  lastMeasurement: number | null;
}
export interface SceneState {
  scene: THREE.Scene;
}
