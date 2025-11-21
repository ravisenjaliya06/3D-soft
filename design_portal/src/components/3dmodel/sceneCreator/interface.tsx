import * as THREE from 'three';
import { Dimensions } from '../interface';
import { Position, Rotation } from '../store/interface';

// type const
export const GEOMETRY = {
  BOX_GEOMETRY: 'BoxGeometry',
  EXTRUDE_GEOMETRY: 'ExtrudeGeometry',
};

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

export interface MeshObjectData {
  id: string;
  name: string;
  geometryType: GeometryType;
  parent?: string;
  dimensions: Dimensions;
  position: Position;
  rotation: Rotation;
  material?: Material;
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
