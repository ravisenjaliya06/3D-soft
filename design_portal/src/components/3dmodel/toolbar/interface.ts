import * as THREE from 'three';
import { RulePart } from '../handler/interface';
import { Position, Rotation } from '../store/interface';
export interface Datastate {
  isQuickHideActive: boolean;
  isMeasurementActive: boolean;
  isAlignmentActive: boolean;
  isWallDrawingActive: boolean;
}

export interface PlatformReturn {
  addedMeshes: {
    name: string;
    width: number;
    height: number;
    depth: number;
    position: Position;
    data: { rotation: Rotation; wall: string };
  }[];
  platformGroup: THREE.Group;
}
export interface platformData {
  name: string;
  width: number;
  height: number;
  depth: number;
  position: Position;
  data: { rotation: Rotation; wall: string };
}
export interface CabinetItem {
  id: string;
  name: string;
  type: string;
  description: string;
  additional_data: string[];
  catalog_rule: string[];
  children: string[];
  depth: number | null;
  height: number | null;
  length: number | null;
  width: number | null;
  parent: string | null;
  design: string | null;
  position: Position | null;
  icon: string;
}

export interface parts {
  id: string;
  name: string;
  rule_parts: RulePart[];
}

export interface ResultType {
  id: string;
  name: string;
  type: string;
  icon: string;
  onClick?: () => void;
  isAlwaysField?: boolean;
  description?: string;
  catalog_id?: string;
}

export interface SelectedCabinetItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  catalog_id?: string;
}
export interface IconMap {
  [key: string]: string;
}

export interface CatalogItem {
  type: string;
}
