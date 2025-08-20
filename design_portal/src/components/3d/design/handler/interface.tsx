export interface designObjectData {
  uuid: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plankSize: number;
  center_point: { x: number; y: number };
  up_down_space: number;
  left_right_space: number;
}

export interface objectHandlerInterface {
  id: string;
  data: designObjectData[];
  action: string;
  type: string;
  item: string;
}

export interface editObjectHandlerInterface {
  id: string;
  action: string;
  data: designObjectData[];
  type: string;
  item: string;
  width: number | null;
  height: number | null;
}

export interface APIResponseData {
  id: string;
}
