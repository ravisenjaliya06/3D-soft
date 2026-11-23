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
export const getTangents = (points: Point[], index: number, cornerRadius: number[]) => {
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
 * Shared geometry traversal logic used by both SVG path and Three.js shape generation.
 */
const processGeometry = (
  points: Point[],
  cornerRadius: number[],
  cornerTypesArr: CornerType[],
  curveControls: CurveControls,
  prefix: string,
  callbacks: {
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void;
    arcTo: (tangents: ReturnType<typeof getTangents>, type: CornerType) => void;
  }
) => {
  const n = points.length;
  if (n < 3) return;

  const tangentsArr = points.map((_, i) => getTangents(points, i, cornerRadius));
  const t0 = tangentsArr[0];
  callbacks.moveTo(t0.tp_out.x, t0.tp_out.y);

  for (let i = 1; i <= n; i++) {
    const j = i % n;
    const prevJ = (i - 1 + n) % n;
    const tangents = tangentsArr[j];

    const ctrl = curveControls[`${prefix}_${prevJ}`];
    if (ctrl) {
      callbacks.quadraticCurveTo(ctrl.x, ctrl.y, tangents.tp_in.x, tangents.tp_in.y);
    } else {
      callbacks.lineTo(tangents.tp_in.x, tangents.tp_in.y);
    }

    const r = cornerRadius[j] || 0;
    const type = cornerTypesArr[j] || 'default';
    if (r > 0 && tangents.actual_r > 0) {
      callbacks.arcTo(tangents, type);
    }
  }
};

/**
 * Builds an SVG-like path string for a 2D shape with rounded corners.
 */
export const buildPathData = (
  points: Point[],
  cornerRadius: number[],
  cornerTypesArr: CornerType[] = [],
  curveControls: CurveControls = {},
  prefix: string = 'shape'
) => {
  let path = '';
  processGeometry(points, cornerRadius, cornerTypesArr, curveControls, prefix, {
    moveTo: (x, y) => (path += `M ${x} ${y}`),
    lineTo: (x, y) => (path += ` L ${x} ${y}`),
    quadraticCurveTo: (cpx, cpy, x, y) => (path += ` Q ${cpx} ${cpy} ${x} ${y}`),
    arcTo: (tangents, type) => {
      const sweep = (tangents.det ?? 1) >= 0 ? 1 : 0;
      if (type === 'round') {
        path += ` A ${tangents.actual_r} ${tangents.actual_r} 0 0 ${sweep} ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'chamfer') {
        path += ` L ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      } else if (type === 'cut-round') {
        path += ` A ${tangents.actual_r} ${tangents.actual_r} 0 0 ${1 - sweep} ${tangents.tp_out.x} ${tangents.tp_out.y}`;
      }
    },
  });
  return path ? path + ' Z' : '';
};

/**
 * Creates a THREE.Shape for a 2D geometry, handling rounded corners and curves.
 */
export const buildThreeShape = (
  points: Point[],
  cornerRadius: number[],
  curveControls: CurveControls = {},
  prefix: string = 'shape',
  cornerTypesArr: CornerType[] = []
) => {
  const shape = new THREE.Shape();
  processGeometry(points, cornerRadius, cornerTypesArr, curveControls, prefix, {
    moveTo: (x, y) => shape.moveTo(x, y),
    lineTo: (x, y) => shape.lineTo(x, y),
    quadraticCurveTo: (cpx, cpy, x, y) => shape.quadraticCurveTo(cpx, cpy, x, y),
    arcTo: (tangents, type) => {
      if (type === 'round' && tangents.center && tangents.start_angle !== undefined) {
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
    },
  });
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
    const radiusX = hole.width / 2;
    const radiusY = hole.height / 2;
    const c3d = getMappedPoint({ x: hole.x + radiusX, y: hole.y + radiusY });
    if (isRotated2D) {
      holePath.absellipse(c3d.x, c3d.y, radiusY, radiusX, 0, Math.PI * 2, false);
    } else {
      holePath.absellipse(c3d.x, c3d.y, radiusX, radiusY, 0, Math.PI * 2, false);
    }
  } else if (hole.type === 'rect' || hole.type === 'polygon' || hole.type === 'slotting') {
    let pts: Point[] = [];
    let radii: number[] = [];
    let types: CornerType[] = [];
    let prefix = `hole_${holeIndex}`;

    if (hole.type === 'rect' || hole.type === 'slotting') {
      const corners = [
        { x: hole.x, y: hole.y },
        { x: hole.x + hole.width, y: hole.y },
        { x: hole.x + hole.width, y: hole.y + hole.height },
        { x: hole.x, y: hole.y + hole.height },
      ];
      radii = hole.cornerRadius ?? [];
      types = hole.cornerTypes ?? [];

      if (!radii.some((r: number) => r > 0)) {
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
        return holePath;
      }
      pts = corners.map(getMappedPoint);
      radii = [...radii, 0, 0, 0, 0].slice(0, 4);
      types = [...types, 'default', 'default', 'default', 'default'].slice(0, 4) as CornerType[];
    } else {
      pts = hole.points.map(getMappedPoint);
      radii = hole.cornerRadius ?? new Array(pts.length).fill(0);
      types = hole.cornerTypes ?? new Array(pts.length).fill('default');
      prefix = `hole_${holeIndex}`;
    }

    processGeometry(pts, radii, types, curveControls, prefix, {
      moveTo: (x, y) => holePath.moveTo(x, y),
      lineTo: (x, y) => holePath.lineTo(x, y),
      quadraticCurveTo: (cpx, cpy, x, y) => {
        const mappedCtrl = getMappedPoint({ x: cpx, y: cpy });
        holePath.quadraticCurveTo(mappedCtrl.x, mappedCtrl.y, x, y);
      },
      arcTo: (tangents, type) => {
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
      },
    });
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

    const transX = oldCenter.x - newCenter.x;
    const transY = oldCenter.y - newCenter.y;
    const transZ = oldCenter.z - newCenter.z;

    geometry.translate(transX, transY, transZ);
    return new THREE.Vector3(transX, transY, transZ);
  }
  return new THREE.Vector3(0, 0, 0);
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
