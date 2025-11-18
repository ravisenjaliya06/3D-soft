import { Position, Rotation } from '../store/interface';

// type const
export const GEOMETRY = {
  BOX_GEOMETRY: 'BoxGeometry',
  EXTRUDE_GEOMETRY: 'ExtrudeGeometry',
} as const;

export const MATERIAL_TYPE = {
  COLOR: 'COLOR',
  TEXTURE: 'TEXTURE',
};

// type
type GeometryType = (typeof GEOMETRY)[keyof typeof GEOMETRY];
type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

// interface
interface Material {
  type: MaterialType;
  value: string;
  repeatX?: number;
  repeatY?: number;
}

export interface InitialDataForCreateMesh {
  id: string;
  name: string;
  geometryType: GeometryType;
  width: number;
  height: number;
  depth: number;
  position: Position;
  rotation: Rotation;
  material: Material;
}
