import * as THREE from 'three';
import { Point, CornerType, CurveControls } from '../types';

export const getTangents = (
  points: Point[],
  index: number,
  cornerRadius: number[],
  cornerTypes?: CornerType[],
  isMapped: boolean = false
) => {
  const n = points.length;
  const p0 = points[(index - 1 + n) % n];
  const p1 = points[index];
  const p2 = points[(index + 1) % n];
  const r = cornerRadius[index] || 0;

  if (r <= 0) {
    return {
      tp_in: { x: p1.x, y: p1.y },
      tp_out: { x: p1.x, y: p1.y },
      center: { x: p1.x, y: p1.y },
      start_angle: 0,
      end_angle: 0,
      det: 0,
    };
  }

  let dx = p1.x - p0.x;
  let dy = p1.y - p0.y;
  let len = Math.hypot(dx, dy);
  const u_in_x = dx / len;
  const u_in_y = dy / len;

  dx = p2.x - p1.x;
  dy = p2.y - p1.y;
  len = Math.hypot(dx, dy);
  const u_out_x = dx / len;
  const u_out_y = dy / len;

  const dot = u_in_x * u_out_x + u_in_y * u_out_y;
  const alpha = Math.acos(Math.max(-1, Math.min(1, dot)));

  const det = u_in_x * u_out_y - u_in_y * u_out_x;
  if (det <= 0 || alpha === 0) {
    return {
      tp_in: { x: p1.x, y: p1.y },
      tp_out: { x: p1.x, y: p1.y },
      center: { x: p1.x, y: p1.y },
      start_angle: 0,
      end_angle: 0,
      det: det,
    };
  }

  const half_alpha = alpha / 2;
  const tan_half = Math.tan(half_alpha);
  let l = r * tan_half;

  const len_prev = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const len_next = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (l > len_prev / 2 || l > len_next / 2) {
    l = Math.min(len_prev / 2, len_next / 2);
  }

  const tp_in_x = p1.x - u_in_x * l;
  const tp_in_y = p1.y - u_in_y * l;
  const tp_out_x = p1.x + u_out_x * l;
  const tp_out_y = p1.y + u_out_y * l;

  if (!isMapped) {
      return {
          tp_in: { x: tp_in_x, y: tp_in_y },
          tp_out: { x: tp_out_x, y: tp_out_y },
          det,
      };
  }

  const n_in_x = -u_in_y;
  const n_in_y = u_in_x;
  const n_out_x = -u_out_y;
  const n_out_y = u_out_x;

  let bis_x = n_in_x + n_out_x;
  let bis_y = n_in_y + n_out_y;
  len = Math.hypot(bis_x, bis_y);
  bis_x /= len;
  bis_y /= len;

  const sin_half = Math.sin(half_alpha);
  const d = r / sin_half;

  const center_x = p1.x + bis_x * d;
  const center_y = p1.y + bis_y * d;

  let vec_x = tp_in_x - center_x;
  let vec_y = tp_in_y - center_y;
  const start_angle = Math.atan2(vec_y, vec_x);

  vec_x = tp_out_x - center_x;
  vec_y = tp_out_y - center_y;
  let end_angle = Math.atan2(vec_y, vec_x);
  if (end_angle < start_angle) end_angle += 2 * Math.PI;

  return {
    tp_in: { x: tp_in_x, y: tp_in_y },
    tp_out: { x: tp_out_x, y: tp_out_y },
    center: { x: center_x, y: center_y },
    start_angle,
    end_angle,
    det,
  };
};

export const buildPathData = (
  points: Point[],
  cornerRadius: number[],
  cornerTypesArr: CornerType[] = [],
  curveControls: CurveControls = {},
  prefix: string = 'shape'
) => {
  const n = points.length;
  if (n < 3) return '';

  const tangents0 = getTangents(points, 0, cornerRadius);
  let path = `M ${tangents0.tp_out.x} ${tangents0.tp_out.y}`;

  for (let i = 1; i <= n; i++) {
    const j = i % n;
    const prevJ = (i - 1 + n) % n;
    const tangents = getTangents(points, j, cornerRadius);

    const ctrl = curveControls[`${prefix}_${prevJ}`];
    if (ctrl) {
      path += ` Q ${ctrl.x} ${ctrl.y} ${tangents.tp_in.x} ${tangents.tp_in.y}`;
    } else {
      path += ` L ${tangents.tp_in.x} ${tangents.tp_in.y}`;
    }

    const r = cornerRadius[j] || 0;
    const type = cornerTypesArr[j] || 'default';
    if (r > 0) {
      if (type === 'round') {
        path += ` A ${r} ${r} 0 0 1 ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'chamfer') {
        path += ` L ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'cut-round') {
        path += ` A ${r} ${r} 0 0 0 ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      }
    }
  }

  path += ' Z';
  return path;
};

export const buildThreeShape = (
  points: Point[],
  cornerRadius: number[],
  cornerTypesArr: CornerType[] = [],
  curveControls: CurveControls = {},
  prefix: string = 'shape'
) => {
  const n = points.length;
  if (n < 3) return new THREE.Shape();

  const shape = new THREE.Shape();

  const tangents0 = getTangents(points, 0, cornerRadius);
  shape.moveTo(tangents0.tp_out.x, tangents0.tp_out.y);

  for (let i = 1; i <= n; i++) {
    const j = i % n;
    const prevJ = (i - 1 + n) % n;
    const tangents = getTangents(points, j, cornerRadius);

    const ctrl = curveControls[`${prefix}_${prevJ}`];
    if (ctrl) {
      shape.quadraticCurveTo(ctrl.x, ctrl.y, tangents.tp_in.x, tangents.tp_in.y);
    } else {
      shape.lineTo(tangents.tp_in.x, tangents.tp_in.y);
    }

    const r = cornerRadius[j] || 0;
    const type = cornerTypesArr[j] || 'default';
    if (r > 0) {
      // For Three.js, simple lineTo for now as in the original code
      // To improve sync, we could implement arc logic here as well
      shape.lineTo(tangents.tp_out.x, tangents.tp_out.y);
    }
  }

  return shape;
};
