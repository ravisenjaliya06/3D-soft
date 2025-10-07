import type { ThreeDView } from '@/components/3dmodel/design/interface';
import type { NextRouter } from 'next/router';
import * as THREE from 'three';
import { CatalogWithChildren } from './handler/items';
import { MinifixConnection, MinifixHole } from './minifix';
import { Material, Position } from './store/interface';

export interface DesignProps {
  isReady: boolean;
  scene?: THREE.Scene | null;
  selectedObject?: THREE.Object3D | null;
  selectedObjectLine?: THREE.LineSegments | null;
  selectedEgdeLine?: THREE.LineSegments | null;
  cupBoardData?: cupBoardData[];
  setIsReady: (isReady: boolean) => void;
  setScene?: (scene: THREE.Scene) => void | null;
  setSelectedObject: (object: THREE.Object3D | null) => void;
  setSelectedObjectLine?: (line: THREE.LineSegments | null) => void;
  setSelectedEgdeLine?: (line: THREE.LineSegments | null) => void;
  setcupBoardData?: (parts: cupBoardData[]) => void;
}

export interface cupBoardObjectData {
  uuid: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  center_point: { x: number; y: number };
  up_down_space: { up: number; down: number } | null;
  left_right_space: { left: number; right: number } | null;
  texture: string | null;
}

export interface cupBoardData {
  type: string;
  data: cupBoardObjectData[];
  childs: string[];
}
export interface Design {
  id: string;
  design_name: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface HeaderProps {
  router: NextRouter;
  design3D: ThreeDView | null;
}

export interface ToolbarProps {
  threeDView: ThreeDView;
}

export interface ComponentData {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  layer: number;
  altitude: number;
  plankSize: number;
  position: Position;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  material: Material;
  parent: string;
  child: string[];
  minifixHoles: MinifixHole[];
  minifixConnections: MinifixConnection[];
  grooves: Position[];
}

export interface CatalogItem {
  id: string;
  name: string;
  data: ComponentData;
}

export interface ChildCatalog {
  catalog: CatalogItem;
  items: CatalogItem[];
}

export interface CADImportOptions {
  file: File;
  scene: THREE.Scene;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (error: Error) => void;
}

export interface CADObjectData {
  mesh: THREE.Mesh | THREE.Group;
  boundingBox: THREE.Box3;
  center: THREE.Vector3;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export type partsDataList = cupBoardData[];

export interface DesignIDData {
  id: string;
  unit: string;
  sheet_width: number;
  sheet_height: number;
  minifix_distance: number;
  groove_gap: number;
  groove_dig: number;
}

export interface DefaultMaterial {
  type: string;
  value: string;
}

export interface DefaultCatalogItemData {
  name: string;
  child: object; // If there's a specific type, replace `any[]`
  depth: number;
  layer: number;
  width: number;
  height: number;
  parent: string;
  altitude: number;
  material: Material;
  position: Position;
  plankSize: number;
}

export interface DefaultCatalogItem {
  id: string;
  name: string;
  data: DefaultCatalogItemData;
  material: string;
  catalog: string;
  parent_catalog: string | null;
  catalog_image: string;
}

export interface DefaultCatalogData {
  id: string;
  name: string;
  organization: string | null;
  design: string | null;
  data: {
    type: string;
    depth: number;
    width: number;
    height: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    position: Position;
    catalog_type: string;
  };
  image: string;
  is_default: boolean;
  is_custom: boolean;
  parent: string | null;
  parent_name: string | null;
  design_catalog_items: CatalogItem[];
}

export interface CatalogApiResponse {
  catalog: DefaultCatalogData;
  items: CatalogItem[];
  child_catalogs: CatalogApiResponse[];
}

export interface PlankSegment {
  fromId: string;
  toId: string;
  items: string[];
  ratio: number | null;
}

export interface InitialState {
  catalog: CatalogWithChildren[][];
}

export interface ResponseStatus {
  status: number;
}

export type PositionKey = 'x' | 'y' | 'z';

interface CatalogPart {
  name: string;
  width: number;
  height: number;
  depth: number;
}

interface CatalogItemData {
  type: string;
  name: string;
  description: string;
  design_id: string;
  width?: number;
  height?: number;
  depth?: number;
  position?: Position;
  additional_data?: any;
  parts?: CatalogPart;
}

export interface CatalogItem {
  catalogId: string,
  itemData: CatalogItemData
}