import { IEntity } from 'dxf-parser';
import { NextRouter } from 'next/router';
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ImageMetadata, Position } from '../store/interface';

export interface AppProps {
  router: NextRouter;
}

export interface ThreeDView {
  toggleZoomMode: (enable: boolean) => void;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  mount: HTMLDivElement | null;
  transformControls: TransformControls;
  toggleSky: () => void;
  isDay: boolean;
  isZoomMode: boolean;
  toggle2DMode: (enable: boolean) => void;
  activeTools?: {
    eraser: {
      isActive: boolean;
    };
    select: {
      isActive: boolean;
    };
  };
}

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

export interface CADData {
  mesh: THREE.Object3D;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface DxfEntity {
  type: string;
  start?: Position;
  end?: Position;
  center?: Position;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  vertices?: Array<Position>;
  points?: Array<Position>;
  closed?: boolean;
  color?: string;
  transformation?: THREE.Matrix4;
  block?: {
    entities: DxfEntity[];
  };
}

export interface DxfData {
  entities: DxfEntity[];
}
export interface CustomDesignProps {
  design3D: ThreeDView | null;
  onClose: () => void;
}

export interface HelperToolsProps {
  position: { x: number; y: number };
}

export interface customDesignProps {
  setDesign3D: (design3D: ThreeDView | null) => void;
}

export interface FooterProps {
  design3D: ThreeDView | null;
}

export interface footerShapeData {
  id: string;
  type: string;
  properties: {
    dimensions?: {
      width?: number;
      height?: number;
      depth?: number;
      radius?: number;
      segments?: number;
    };
    color?: number;
    imageUrl?: string;
    imageSize?: { width: number; height: number };
    aspectRatio?: number;
    fileName?: string;
    isImageMaterial?: boolean;
    [key: string]: unknown;
  };
  position: Position;
  rotation: Position;
  scale: Position;
}

export interface ViewModeTool {
  option: string;
  icon: { src: string };
  disabled: boolean;
  onClick: () => void;
  name?: string;
}

export interface CurveHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  onCurveCreated?: (curveData: ShapeData) => void;
}

export type GeometryType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'tetrahedron'
  | 'circle'
  | 'polygon'
  | 'rectangle'
  | 'arc'
  | 'steppedCube'
  | 'line'
  | 'image'
  | 'segmentedBox'
  | 'box2'
  | 'box3'
  | 'boxFromPoints'
  | `${string}`;

export interface GeometryData {
  type: GeometryType;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    radiusTop?: number;
    radiusBottom?: number;
    segments?: number;
    tube?: number;
    sides?: number;
    points?: THREE.Vector3[] | Position[];
    steps?: number;
    filletRadius?: number;
    cornerIndex?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
    radialSegments?: number;
    tubularSegments?: number;
    arc?: number;
    imageUrl?: string;
    imageSize?: { width: number; height: number };
    fileName?: string;
    aspectRatio?: number;
    // Arc specific properties
    start?: THREE.Vector3 | Position;
    end?: THREE.Vector3 | Position;
    bulge?: THREE.Vector3 | Position;
    curvePoints?: THREE.Vector3[] | Position[];
  };
  preloadedTexture?: THREE.Texture | null;
  position?: Position;
  rotation?: Position;
  scale?: Position;
  image?: string;
  imageData?: {
    dataUrl: string;
    fileName: string;
    aspectRatio: number;
    scaleFactor?: number;
  };
  color?: number;
  material?: THREE.Material;
}

export interface ShapeProperties {
  dimensions: Record<string, number>;
  color?: number;
}

export interface Shape {
  id: string;
  type: GeometryData['type'];
  properties: {
    width?: number;
    height?: number;
    dimensions: GeometryData['dimensions'];
    color: number;
    // Image specific properties
    imageUrl?: string;
    imageSize?: {
      width: number;
      height: number;
    };
    aspectRatio?: number;
    fileName?: string;
    isImageMaterial?: boolean;
    // Arc specific properties
    points?: {
      start?: Position;
      end?: Position;
      bulge?: Position;
    };
    curvePoints?: Position[];
    transparent?: boolean;
    opacity?: number;
  };
  position: Position;
  rotation: Position;
  scale: Position;
  parentId?: string;
}

export interface MeasureHandler {
  activate: () => void;
  deactivate: () => void;
}

export interface MoveHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  movableObjects: THREE.Object3D[];
  controls: OrbitControls;
  gridBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface ShapeData {
  id: string;
  type: GeometryData['type'];
  properties: {
    dimensions: GeometryData['dimensions'];
    color: number;
    // Image specific properties
    imageUrl?: string;
    imageSize?: {
      width: number;
      height: number;
    };
    aspectRatio?: number;
    fileName?: string;
    isImageMaterial?: boolean;
    // Arc specific properties
    points?: {
      start?: Position;
      end?: Position;
      bulge?: Position;
    };
    curvePoints?: Position[];
  };
  position: Position;
  rotation: Position;
  scale: Position;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface arcPoints {
  start: THREE.Vector3 | Position;
  end: THREE.Vector3 | Position;
  bulge: THREE.Vector3 | Position;
}

export interface DatabaseObject {
  name: string;
  is_custom: boolean;
  id: string;
  data: {
    originalType: GeometryType;
    height: number;
    width: number;
    imageUrl: string;
    depth: number;
    radius: number;
    filletRadius: number;
    imageSize: ImageSize;
    aspectRatio: number;
    position: Position;
    scale: Position;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    curvePoints?: Position[];
    cornerIndex?: number;
    points: arcPoints | Position[];
    imageMetadata: ImageMetadata;
    catalog: {
      name: string;
      data: {
        width: number;
        height: number;
        depth: number;
        radius: number;
        position: Position;
        rotateX: number;
        rotateY: number;
        rotateZ: number;
      };
    };
  };
}

export interface HandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export interface HeaderProps {
  router: NextRouter;
  design3D: ThreeDView | null;
}

export interface SidebarProps {
  design3D: ThreeDView | null;
}

export interface ObjectDimensions {
  points: number;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  segments?: number;
}

export interface sidebarShape {
  id: string;
  type: string;
  properties: {
    dimensions: ObjectDimensions;
    points?: number;
    color?: number;
    imageUrl?: string;
    imageSize?: { width: number; height: number };
    aspectRatio?: number;
    fileName?: string;
    isImageMaterial?: boolean;
  };
  position: Position;
  rotation: Position;
  scale: Position;
}

export interface UpdatedData {
  width?: number;
  height?: number;
  depth?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: Position;
  position?: Position;
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  aspectRatio?: number;
  fileName?: string;
  isImageMaterial?: boolean;
}

export interface ToolbarProps {
  threeDView: ThreeDView | null;
}

export type partsDataList = cupBoardData[];

export interface Line {
  a: Position;
  b: Position;
}

export interface OriginalSettings {
  depth: number;
  bevelEnabled: boolean;
}

export interface DXFEntity extends IEntity {
  start?: Position;
  end?: Position;

  center?: Position;
  radius?: number;
  startAngle?: number;
  endAngle?: number;

  vertices?: Array<Position>;
  points?: Array<Position>;
  closed?: boolean;

  block?: {
    entities?: DXFEntity[];
  };

  transformation?: THREE.Matrix4;
}

export interface CustomImageMaterial extends THREE.MeshBasicMaterial {
  imageUrl: string;
  isImageMaterial: boolean;
  originalUrl: string;
  aspectRatio: number;
}

export interface FaceLine {
  [uuid: string]: {
    a: Position;
    b: Position;
  };
}

export interface Face {
  faceId: string;
  points: Position[];
  lines: FaceLine;
}
