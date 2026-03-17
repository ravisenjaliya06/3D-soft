import * as THREE from 'three';
import { CornerType, CurveControls, Point } from '../types';

/**
 * Calculates tangent points and arc parameters for a rounded corner.
 * Used to smoothly connect two line segments with a circular arc.
 *
 * @param points Array of shape vertices
 * @param index Index of the corner to calculate
 * @param cornerRadius Array of radii for each corner
 * @param cornerTypes Array of types for each corner (e.g., 'round', 'chamfer')
 * @param isMapped Whether the points are already mapped to 3D orientation
 * @returns Object containing tangent points (tp_in, tp_out) and optional arc center/angles
 */
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

/**
 * Builds an SVG-like path string for a 2D shape with rounded corners.
 * This is primarily used for Konva rendering in the 2D stage.
 *
 * @param points Array of shape vertices
 * @param cornerRadius Array of radii for each corner
 * @param cornerTypesArr Array of types for each corner
 * @param curveControls Mapping of quadratic curve control points
 * @param prefix Prefix for path identifiers
 * @returns An SVG path data string (e.g., "M x y L x y Z")
 */
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

/**
 * Creates a THREE.Shape for a 2D geometry, handling rounded corners and curves.
 * This shape can later be extruded into a 3D Mesh.
 *
 * @param points Array of shape vertices
 * @param cornerRadius Array of radii for each corner
 * @param cornerTypesArr Array of types for each corner
 * @param curveControls Mapping of quadratic curve control points
 * @param prefix Prefix for shape identifiers
 * @returns A THREE.Shape object
 */
export const buildThreeShape = (
  points: Point[],
  cornerRadius: number[],
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
    if (r > 0) {
      // For Three.js, simple lineTo for now as in the original code
      // To improve sync, we could implement arc logic here as well
      shape.lineTo(tangents.tp_out.x, tangents.tp_out.y);
    }
  }

  return shape;
};

/**
 * Computes the center point of a THREE.BufferGeometry based on its bounding box.
 *
 * @param geometry The Three.js geometry to analyze
 * @returns A THREE.Vector3 representing the geometric center
 */
export const getGeometryCenter = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox?.getCenter(center);
  return center;
};

/**
 * Creates a THREE.Path representing a hole for a 3D Shape.
 * Handles circular, rectangular, polygonal, and rounded slot holes.
 *
 * @param hole The hole data object
 * @param getMappedPoint Function to map 2D coordinates to 3D orientation
 * @param isRotated2D Whether the panel is rotated in 2D view
 */
export const createHolePath = (
  hole: any,
  getMappedPoint: (p: Point) => Point,
  isRotated2D: boolean
): THREE.Path => {
  const holePath = new THREE.Path();

  if (hole.type === 'circle') {
    // For circles/ovals, calculate radius and center
    const radiusX = hole.width / 2;
    const radiusY = hole.height / 2;
    const c3d = getMappedPoint({ x: hole.x + radiusX, y: hole.y + radiusY });

    // Use absellipse to draw the hole.
    // If the view is rotated, we swap the radii to maintain correctly oriented oval holes.
    if (isRotated2D) {
      holePath.absellipse(c3d.x, c3d.y, radiusY, radiusX, 0, Math.PI * 2, false);
    } else {
      holePath.absellipse(c3d.x, c3d.y, radiusX, radiusY, 0, Math.PI * 2, false);
    }
  } else if (hole.type === 'rect') {
    // For rectangles, map the corners and draw a closed loop
    const hp1 = getMappedPoint({ x: hole.x, y: hole.y });
    const hp2 = getMappedPoint({ x: hole.x + hole.width, y: hole.y + hole.height });
    const hminX = Math.min(hp1.x, hp2.x),
      hmaxX = Math.max(hp1.x, hp2.x);
    const hminY = Math.min(hp1.y, hp2.y),
      hmaxY = Math.max(hp1.y, hp2.y);

    holePath.moveTo(hminX, hminY);
    holePath.lineTo(hmaxX, hminY);
    holePath.lineTo(hmaxX, hmaxY);
    holePath.lineTo(hminX, hmaxY);
    holePath.lineTo(hminX, hminY); // Close the path
  } else if (hole.type === 'polygon' && hole.points) {
    // For polygons, map each point and connect them
    const hp = hole.points.map(getMappedPoint);
    if (hp.length > 0) {
      holePath.moveTo(hp[0].x, hp[0].y);
      hp.slice(1).forEach((p: Point) => holePath.lineTo(p.x, p.y));
      holePath.closePath();
    }
  }

  return holePath;
};

/**
 * Aligns an extruded geometry to match a specific thickness axis and
 * optionally centers it relative to an original geometry.
 *
 * @param geometry The new ExtrudeGeometry to align
 * @param thickness The depth/thickness of the extrusion
 * @param axis The axis ('x', 'y', or 'z') representing the thickness
 * @param originalOptional Optional original geometry to match the center position
 */
export const alignExtrudedGeometry = (
  geometry: THREE.BufferGeometry,
  thickness: number,
  axis: 'x' | 'y' | 'z',
  originalOptional?: THREE.BufferGeometry
) => {
  // 1. Center the depth so Z=0 is in the middle of thickness (standard forfurniture panels)
  geometry.translate(0, 0, -thickness / 2);

  // 2. Rotate geometry to match the detected thickness axis of the original plank
  if (axis === 'x') {
    geometry.rotateY(Math.PI / 2);
  } else if (axis === 'y') {
    geometry.rotateX(Math.PI / 2);
  }
  // No rotation needed for 'z' as it's the default extrusion axis

  // 3. Match the 3D position with the original geometry's center
  if (originalOptional) {
    const oldCenter = getGeometryCenter(originalOptional);
    const newCenter = getGeometryCenter(geometry);

    geometry.translate(
      oldCenter.x - newCenter.x,
      oldCenter.y - newCenter.y,
      oldCenter.z - newCenter.z
    );
  }
};

/**
 * Calculates the signed area of a polygon to determine its winding order.
 * In a Y-down coordinate system (like browser/Konva):
 * - Positive area: Clockwise (CW) winding
 * - Negative area: Counter-clockwise (CCW) winding
 * 
 * @param points Array of polygon vertices
 * @returns The signed area of the polygon
 */
export const calculatePolygonWinding = (points: Point[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
};
