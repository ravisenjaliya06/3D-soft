export interface Point {
  x: number;
  y: number;
}

export type CornerType = 'default' | 'round' | 'chamfer' | 'cut-round';

export interface Hole {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rect' | 'circle' | 'polygon' | 'slotting';
  points?: Point[];
  cornerRadius?: number[];
  cornerTypes?: CornerType[];
  lineTypes?: ('linear' | 'arc')[];
  lineRadii?: number[];
  id?: string;
}

export interface CurveControls {
  [key: string]: Point;
}

export interface PreviewSidebarProps {
  previewPos: { x: number; y: number };
  setIsDraggingPreview: (val: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  threeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface PanelHeaderProps {
  tools: { name: string; icon: string; subTools?: string[] }[];
  activeTool: string | null;
  setActiveTool: (name: string | null) => void;
  holeShape: string;
  setHoleShape: (shape: any) => void;
  handleCancel: () => void;
  handleComplete: () => void;
}

export interface PropertiesSidebarProps {
  drawingPos: { x: number; y: number };
  setIsDraggingDrawing: (val: boolean) => void;
  selectedHoleIndex: number | null;
  selectedLineIndex: number | null;
  selectedPointIndex: number | null;
  selectedCornerIndex: number | null;
  holes: Hole[];
  setHoles: any;
  curveControls: CurveControls;
  setCurveControls: any;
  shapePoints: Point[];
  defaultPanelPoints: Point[];
  setShapePoints: any;
  panelWidth: number;
  isRotated2D: boolean;
  setSelectedHoleIndex: (val: number | null) => void;
}

export interface BaseSidebarProps {
  title: string;
  pos: { x: number; y: number };
  height?: string;
  onDragStart: () => void;
  children: React.ReactNode;
}
