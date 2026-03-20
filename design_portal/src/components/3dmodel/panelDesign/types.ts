/**
 * Represents a basic 2D point in millimeter coordinates.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Supported corner treatments for panel vertices and polygonal holes.
 */
export type CornerType = 'default' | 'round' | 'chamfer' | 'cut-round';

/**
 * Data structure representing a cutout (hole) in a panel.
 * Supports various shapes and treatments like rounding and curves.
 */
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
  radius?: number;
}

export interface PanelDesignData {
  outline: Point[];
  cornerRadius: number[];
  cornerTypes: CornerType[];
  curveControls: CurveControls;
  holes: Hole[];
}

/**
 * A map of control points used for quadratic Bezier curves on panel edges.
 */
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
  handleRestoreDefault: () => void;
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
  cornerRadius: number[];
  setCornerRadius: (val: number[] | ((prev: number[]) => number[])) => void;
  cornerTypes: CornerType[];
  setCornerTypes: (val: CornerType[] | ((prev: CornerType[]) => CornerType[])) => void;
}

export interface BaseSidebarProps {
  title: string;
  pos: { x: number; y: number };
  height?: string;
  onDragStart: () => void;
  children: React.ReactNode;
}

/**
 * Props for the DimensionHighlighter component.
 */
export interface DimensionHighlighterProps {
  hoveredHoleIndex: number | null;
  selectedHoleIndex: number | null;
  hoveredPanel: boolean;
  holes: Hole[];
  shapePoints: Point[];
  defaultPanelPoints: Point[];
  /**
   * When true, renders additional dimensions that locate the selected hole:
   * - Left: panel left edge -> hole bounding-box left edge
   * - Top: panel top edge  -> hole bounding-box top edge
   */
  showSelectedHoleOffsets?: boolean;
  tempHole?: Hole | null;
}

/**
 * Props for the DimensionLine component.
 */
export interface DimensionLineProps {
  p1: Point;
  p2: Point;
  text?: string;
  offset?: number;
  /** When true, only the line and ticks are drawn; no text label. */
  hideText?: boolean;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BoundsMinMax {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface HoleOffsetInputsProps {
  hole: Hole;
  shapePoints: Point[];
  defaultPanelPoints: Point[];
  stageRef: React.RefObject<any>;
  stagePosition: { x: number; y: number };
  stageScale: number;
  leftValue: string;
  topValue: string;
  onLeftChange: (v: string) => void;
  onTopChange: (v: string) => void;
  onCommit: () => void;
}

/** Property field for dynamic property panel: subLabel (e.g. "W", "H", "x", "y") and value/onChange */
export interface PropertyFieldConfig {
  subLabel: string;
  getValue: () => number;
  onChange: (val: number) => void;
  readOnly?: boolean;
}

/** Property group: title (e.g. "Size", "Position") and 1 or 2 fields */
export interface PropertyGroupConfig {
  title: string;
  fields: PropertyFieldConfig[];
  noBorder?: boolean;
  inlineLayout?: boolean;
  hideSeparator?: boolean;
  infoLabel?: string;
}
