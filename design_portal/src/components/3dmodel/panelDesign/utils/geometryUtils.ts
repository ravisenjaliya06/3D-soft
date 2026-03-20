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
) => {
  const n = points.length;
  const p0 = points[(index - 1 + n) % n];
  const p1 = points[index];
  const p2 = points[(index + 1) % n];
  const r_requested = cornerRadius[index] || 0;

  if (r_requested <= 0) {
    return {
      tp_in: { x: p1.x, y: p1.y },
      tp_out: { x: p1.x, y: p1.y },
      center: { x: p1.x, y: p1.y },
      start_angle: 0,
      end_angle: 0,
      det: 0,
      actual_r: 0,
    };
  }

  const v1x = p0.x - p1.x;
  const v1y = p0.y - p1.y;
  const v2x = p2.x - p1.x;
  const v2y = p2.y - p1.y;

  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);

  if (len1 < 1e-6 || len2 < 1e-6) {
    return {
      tp_in: { x: p1.x, y: p1.y },
      tp_out: { x: p1.x, y: p1.y },
      center: { x: p1.x, y: p1.y },
      start_angle: 0,
      end_angle: 0,
      det: 0,
      actual_r: 0,
    };
  }

  const v1_nx = v1x / len1;
  const v1_ny = v1y / len1;
  const v2_nx = v2x / len2;
  const v2_ny = v2y / len2;

  const dot = Math.max(-1, Math.min(1, v1_nx * v2_nx + v1_ny * v2_ny));
  const theta = Math.acos(dot);

  const cross = v1_nx * v2_ny - v1_ny * v2_nx;
  const det = -cross; // Compatibility flag for CCW/CW matching

  if (theta < 1e-6 || Math.abs(theta - Math.PI) < 1e-6) {
    return {
      tp_in: { x: p1.x, y: p1.y },
      tp_out: { x: p1.x, y: p1.y },
      center: { x: p1.x, y: p1.y },
      start_angle: 0,
      end_angle: 0,
      det,
      actual_r: 0,
    };
  }

  const half_theta = theta / 2;
  let l = r_requested / Math.tan(half_theta);

  const prevHasRound = (cornerRadius[(index - 1 + n) % n] || 0) > 0;
  const nextHasRound = (cornerRadius[(index + 1) % n] || 0) > 0;
  const maxL =
    prevHasRound || nextHasRound ? Math.min(len1 / 2.01, len2 / 2.01) : Math.min(len1, len2);

  let actual_r = r_requested;
  if (l > maxL) {
    l = maxL;
    actual_r = l * Math.tan(half_theta);
  }

  const tp_in = { x: p1.x + v1_nx * l, y: p1.y + v1_ny * l };
  const tp_out = { x: p1.x + v2_nx * l, y: p1.y + v2_ny * l };

  const bis_x = v1_nx + v2_nx;
  const bis_y = v1_ny + v2_ny;
  const len_bis = Math.hypot(bis_x, bis_y);

  if (len_bis < 1e-6) {
    return { tp_in, tp_out, center: tp_in, start_angle: 0, end_angle: 0, det, actual_r };
  }

  const bis_nx = bis_x / len_bis;
  const bis_ny = bis_y / len_bis;

  const d_c = actual_r / Math.sin(half_theta);
  const center = { x: p1.x + bis_nx * d_c, y: p1.y + bis_ny * d_c };

  const vec_in_x = tp_in.x - center.x;
  const vec_in_y = tp_in.y - center.y;
  const vec_out_x = tp_out.x - center.x;
  const vec_out_y = tp_out.y - center.y;

  const start_angle = Math.atan2(vec_in_y, vec_in_x);
  const end_angle = Math.atan2(vec_out_y, vec_out_x);

  return { tp_in, tp_out, center, start_angle, end_angle, det, actual_r };
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
    const sweep = (tangents.det ?? 1) >= 0 ? 1 : 0;
    if (r > 0 && tangents.actual_r > 0) {
      if (type === 'round') {
        path += ` A ${tangents.actual_r} ${tangents.actual_r} 0 0 ${sweep} ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'chamfer') {
        path += ` L ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'cut-round') {
        path += ` A ${tangents.actual_r} ${tangents.actual_r} 0 0 ${1 - sweep} ${tangents.tp_out.x} ${tangents.tp_out.y}`;
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
  prefix: string = 'shape',
  cornerTypesArr: CornerType[] = []
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
    if (r > 0 && tangents.actual_r > 0) {
      if (type === 'round' && tangents.center && tangents.start_angle !== undefined) {
        // 3D extrusion: use clockwise if det < 0, otherwise CCW for interior arcs
        const arcCw = (tangents.det ?? 1) < 0;
        shape.absarc(
          tangents.center.x,
          tangents.center.y,
          tangents.actual_r,
          tangents.start_angle,
          tangents.end_angle!,
          arcCw
        );
      } else {
        shape.lineTo(tangents.tp_out.x, tangents.tp_out.y);
      }
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
  holeIndex: number,
  curveControls: CurveControls,
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
    const corners = [
      { x: hole.x, y: hole.y },
      { x: hole.x + hole.width, y: hole.y },
      { x: hole.x + hole.width, y: hole.y + hole.height },
      { x: hole.x, y: hole.y + hole.height },
    ];
    const radii = hole.cornerRadius ?? [];
    const types: CornerType[] = hole.cornerTypes ?? [];
    if (radii.some((r: number) => r > 0)) {
      const pts = corners.map(getMappedPoint);
      const rArr = [...radii, 0, 0, 0, 0].slice(0, 4);
      const tArr = [...types, 'default', 'default', 'default', 'default'].slice(
        0,
        4
      ) as CornerType[];
      const tangents0 = getTangents(pts, 0, rArr);
      holePath.moveTo(tangents0.tp_out.x, tangents0.tp_out.y);
      for (let i = 1; i <= 4; i++) {
        const j = i % 4;
        const tangents = getTangents(pts, j, rArr);
        holePath.lineTo(tangents.tp_in.x, tangents.tp_in.y);
        const r = rArr[j] ?? 0;
        const type = tArr[j] ?? 'default';
        if (r > 0 && tangents.actual_r > 0) {
          if (type === 'round' && tangents.center && tangents.start_angle !== undefined) {
            const arcCw = (tangents.det ?? 1) < 0;
            holePath.absarc(
              tangents.center.x,
              tangents.center.y,
              tangents.actual_r,
              tangents.start_angle,
              tangents.end_angle!,
              arcCw
            );
          } else {
            holePath.lineTo(tangents.tp_out.x, tangents.tp_out.y);
          }
        }
      }
    } else {
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
      holePath.lineTo(hminX, hminY);
    }
  } else if (hole.type === 'polygon' && hole.points && hole.points.length >= 3) {
    const pts = hole.points.map(getMappedPoint);
    const radii = hole.cornerRadius ?? new Array(pts.length).fill(0);
    const types: CornerType[] = hole.cornerTypes ?? new Array(pts.length).fill('default');
    const tangents0 = getTangents(pts, 0, radii);
    holePath.moveTo(tangents0.tp_out.x, tangents0.tp_out.y);

    for (let i = 1; i <= pts.length; i++) {
      const j = i % pts.length;
      const prevJ = (i - 1 + pts.length) % pts.length;
      const tangents = getTangents(pts, j, radii);

      holePath.lineTo(tangents.tp_in.x, tangents.tp_in.y);

      const r = radii[j] ?? 0;
      const type = types[j] ?? 'default';
      if (r > 0 && tangents.actual_r > 0) {
        if (type === 'round' && tangents.center && tangents.start_angle !== undefined) {
          const arcCw = (tangents.det ?? 1) < 0;
          holePath.absarc(
            tangents.center.x,
            tangents.center.y,
            tangents.actual_r,
            tangents.start_angle,
            tangents.end_angle!,
            arcCw
          );
        } else {
          holePath.lineTo(tangents.tp_out.x, tangents.tp_out.y);
        }
      }
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
