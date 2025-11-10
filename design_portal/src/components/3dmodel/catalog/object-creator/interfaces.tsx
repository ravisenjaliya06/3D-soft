import { Position } from '../../store/interface';

export interface geoMetryData {
  id: string;
  name: string;
  type?: string;
  width: number;
  height: number;
  depth: number;
  position: Position;
  plankSize?: number;
  material: { type: string; value: string };
  catalog_type: string;
  openDirection: string;
  grooves?: GrooveDetail[];
}
export interface cylinderGeometryData {
  id: string;
  name: string;
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  position: Position;
  plankSize?: number;
  material: {
    type: string;
    value: string;
  };
  grooves: GrooveDetail[];
}

export interface elementData {
  type: 'GEOMETRY_DATA' | 'SHAPE_DATA' | 'CYLINDER_GEOMETRY_DATA';
  data: geoMetryData | cylinderGeometryData;
  minMax: 'MIN' | 'MAX' | 'BOTH';
}

export type elementDataList = elementData[];

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

export type ConvertInputElement = {
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  position: { x: number; y: number; z?: number };
  material?: { type: string; value: string };
  grooves?: GrooveDetail[];
  openDirection?: string;
  catalog_type?: string;
};

export interface SimpleGeometryData {
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  position: { x: number; y: number; z: number };
  material: { type: 'COLOR' | 'TEXTURE'; value: string };
  grooves: GrooveDetail[];
  openDirection: string;
  catalog_type: string;
}

export interface SimpleElementData {
  type: 'GEOMETRY_DATA';
  data: SimpleGeometryData;
  minMax: 'BOTH';
}

export type SimpleElementDataList = SimpleElementData[];
