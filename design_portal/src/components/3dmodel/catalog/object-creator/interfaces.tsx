import { Position } from '../../store/interface';

export interface geoMetryData {
  width: number;
  height: number;
  depth: number;
  position: Position;
  material: {
    type: 'COLOR' | 'TEXTURE';
    value: string;
  };
  name: string;
}

export interface cylinderGeometryData {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  position: Position;
  material: {
    type: 'COLOR' | 'TEXTURE';
    value: string;
  };
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
}
