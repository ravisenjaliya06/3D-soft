import { ITEM, PLANK } from '../handler/interface';
import { DRAWER_PLANK_TYPES } from '../sceneCreator/interface';
import { JOINER_THRESHOLD } from './constant';
import type { Axis, PlankConnection, PlankData } from './types';
import { Bounds } from './types';

export function detect90DegreeConnections(planks: PlankData[]): PlankConnection[] {
  const drawerTypes = [
    DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK,
    DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK,
    DRAWER_PLANK_TYPES.BOTTOM_DRAWER_PLANK,
    DRAWER_PLANK_TYPES.FRONT_DRAWER_PLANK,
    DRAWER_PLANK_TYPES.BACK_DRAWER_PLANK,
  ];

  const relevantPlanks = planks.filter((plank) => {
    const name = plank.name;

    const isDrawer = name.includes('DRAWER') || drawerTypes.some((t) => name.includes(t));

    const isIncluded = name.includes(ITEM.PLANK) || drawerTypes.some((t) => name.includes(t));

    if (!isIncluded) return false;

    if (
      (!isDrawer && (name.includes(PLANK.BACK_SIDE) || name.includes(PLANK.FRONT_SIDE))) ||
      name.includes(DRAWER_PLANK_TYPES.DRAWER_FACE)
    ) {
      return false;
    }

    return true;
  });

  const connections: PlankConnection[] = [];

  for (let i = 0; i < relevantPlanks.length; i++) {
    for (let j = i + 1; j < relevantPlanks.length; j++) {
      const connection = analyzeConnection(relevantPlanks[i], relevantPlanks[j]);
      if (connection) connections.push(connection);
    }
  }

  return connections;
}

function analyzeConnection(plankA: PlankData, plankB: PlankData): PlankConnection | null {
  const boundsA = getPlankBounds(plankA);
  const boundsB = getPlankBounds(plankB);

  const joint = findJointPosition(boundsA, boundsB);
  if (!joint) return null;

  const orientationA = determinePlankOrientation(plankA);
  const orientationB = determinePlankOrientation(plankB);

  const connectionType = determine90DegreeConnection(orientationA, orientationB);
  if (!connectionType) return null;

  const isAHorizontal = orientationA === 'HORIZONTAL';

  const finalPlankA = isAHorizontal ? plankB : plankA; // Bolt (usually)
  const finalPlankB = isAHorizontal ? plankA : plankB; // Housing (usually)

  // Recalculate Normal strictly based on Final A -> Final B geometric relationship.
  // We want Normal of A touching B.
  // If A is Left of B, Normal is +X.
  // If A is Right of B, Normal is -X.
  // If A is Bottom of B, Normal is +Y.
  // If A is Top of B, Normal is -Y.
  // If A is Back of B, Normal is +Z.
  // If A is Front of B, Normal is -Z.

  const bA = getPlankBounds(finalPlankA);
  const bB = getPlankBounds(finalPlankB);
  const t = JOINER_THRESHOLD;

  let robustNormal = joint.normal; // Fallback

  // Check X
  if (Math.abs(bA.maxX - bB.minX) < t) robustNormal = { x: 1, y: 0, z: 0 };
  else if (Math.abs(bA.minX - bB.maxX) < t) robustNormal = { x: -1, y: 0, z: 0 };
  // Check Y
  else if (Math.abs(bA.maxY - bB.minY) < t) robustNormal = { x: 0, y: 1, z: 0 };
  else if (Math.abs(bA.minY - bB.maxY) < t) robustNormal = { x: 0, y: -1, z: 0 };
  // Check Z
  else if (Math.abs(bA.maxZ - bB.minZ) < t) robustNormal = { x: 0, y: 0, z: 1 };
  else if (Math.abs(bA.minZ - bB.maxZ) < t) robustNormal = { x: 0, y: 0, z: -1 };

  return {
    plankA: finalPlankA,
    plankB: finalPlankB,
    jointPosition: joint,
    touchingFaceNormal: robustNormal,
    connectionType,
  };
}

/**
 * Get 3D bounds of a plank
 */
function getPlankBounds(plank: PlankData) {
  return {
    minX: plank.position.x - plank.width / 2,
    maxX: plank.position.x + plank.width / 2,
    minY: plank.position.y - plank.height / 2,
    maxY: plank.position.y + plank.height / 2,
    minZ: plank.position.z - plank.depth / 2,
    maxZ: plank.position.z + plank.depth / 2,
  };
}

function findJointPosition(
  a: Bounds,
  b: Bounds
): { x: number; y: number; z: number; normal: { x: number; y: number; z: number } } | null {
  const t = JOINER_THRESHOLD;

  const axes: Axis[] = ['x', 'y', 'z'];

  const min = (obj: Bounds, axis: Axis) => obj[`min${axis.toUpperCase() as 'X' | 'Y' | 'Z'}`];
  const max = (obj: Bounds, axis: Axis) => obj[`max${axis.toUpperCase() as 'X' | 'Y' | 'Z'}`];

  const overlapsOn = (axis1: Axis, axis2: Axis) =>
    min(a, axis1) < max(b, axis1) &&
    max(a, axis1) > min(b, axis1) &&
    min(a, axis2) < max(b, axis2) &&
    max(a, axis2) > min(b, axis2);

  for (const axis of axes) {
    const otherAxes = axes.filter((ax) => ax !== axis);

    // A.max touches B.min
    if (Math.abs(max(a, axis) - min(b, axis)) < t && overlapsOn(otherAxes[0], otherAxes[1])) {
      return {
        ...centerPosition(a, b, axis, max(a, axis)),
        normal: axisNormal(axis, +1),
      };
    }

    // B.max touches A.min
    if (Math.abs(max(b, axis) - min(a, axis)) < t && overlapsOn(otherAxes[0], otherAxes[1])) {
      return {
        ...centerPosition(a, b, axis, max(b, axis)),
        normal: axisNormal(axis, -1),
      };
    }
  }

  return null;
}

function centerPosition(
  a: Bounds,
  b: Bounds,
  fixedAxis: Axis,
  fixedValue: number
): { x: number; y: number; z: number } {
  const center = (minA: number, maxA: number, minB: number, maxB: number) =>
    (Math.max(minA, minB) + Math.min(maxA, maxB)) / 2;

  return {
    x: fixedAxis === 'x' ? fixedValue : center(a.minX, a.maxX, b.minX, b.maxX),
    y: fixedAxis === 'y' ? fixedValue : center(a.minY, a.maxY, b.minY, b.maxY),
    z: fixedAxis === 'z' ? fixedValue : center(a.minZ, a.maxZ, b.minZ, b.maxZ),
  };
}

function axisNormal(axis: Axis, dir: 1 | -1): { x: number; y: number; z: number } {
  return {
    x: axis === 'x' ? dir : 0,
    y: axis === 'y' ? dir : 0,
    z: axis === 'z' ? dir : 0,
  };
}

function determinePlankOrientation(plank: PlankData): 'HORIZONTAL' | 'VERTICAL' {
  const { width, height, name } = plank;

  // Drawer planks (Front/Back/Sides) are semantically Vertical for V-V joints
  if (
    name.includes(DRAWER_PLANK_TYPES.FRONT_DRAWER_PLANK) ||
    name.includes(DRAWER_PLANK_TYPES.BACK_DRAWER_PLANK) ||
    name.includes(DRAWER_PLANK_TYPES.LEFT_DRAWER_PLANK) ||
    name.includes(DRAWER_PLANK_TYPES.RIGHT_DRAWER_PLANK)
  ) {
    return 'VERTICAL';
  }

  // If height is larger than width, it's vertical
  return height > width ? 'VERTICAL' : 'HORIZONTAL';
}

function determine90DegreeConnection(
  orientationA: string,
  orientationB: string
): 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL' | 'VERTICAL_TO_VERTICAL' | null {
  if (orientationA === 'HORIZONTAL' && orientationB === 'VERTICAL') {
    return 'HORIZONTAL_TO_VERTICAL';
  }

  if (orientationA === 'VERTICAL' && orientationB === 'HORIZONTAL') {
    return 'VERTICAL_TO_HORIZONTAL';
  }

  if (orientationA === 'VERTICAL' && orientationB === 'VERTICAL') {
    return 'VERTICAL_TO_VERTICAL';
  }

  return null;
}
