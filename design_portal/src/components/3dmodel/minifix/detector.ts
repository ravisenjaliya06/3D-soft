import { ITEM, PLANK } from '../handler/interface';
import type { PlankConnection, PlankData } from './types';

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function detect90DegreeConnections(
  planks: PlankData[],
): PlankConnection[] {
  const relevantPlanks = planks.filter((plank) => {
    const name = plank.name;
    const include =
      name.includes(ITEM.PLANK) ||
      name.includes(PLANK.DRAWER_LEFT_SIDE) ||
      name.includes(PLANK.DRAWER_RIGHT_SIDE) ||
      name.includes(PLANK.DRAWER_BOTTOM_SIDE) ||
      name.includes(PLANK.DRAWER_FRONT_SIDE) ||
      name.includes(PLANK.DRAWER_BACK_SIDE);

    const exclude =
      name.includes(PLANK.BACK_SIDE) || name.includes(PLANK.FRONT_SIDE);

    return include && !exclude;
  });

  const connections: PlankConnection[] = [];

  // Check every pair of planks
  for (let i = 0; i < relevantPlanks.length; i++) {
    for (let j = i + 1; j < relevantPlanks.length; j++) {
      const plankA = relevantPlanks[i];
      const plankB = relevantPlanks[j];
      const connection = analyzeConnection(plankA, plankB);
      if (connection) {
        connections.push(connection);
      }
    }
  }

  return connections;
}

function analyzeConnection(
  plankA: PlankData,
  plankB: PlankData,
): PlankConnection | null {
  // Get plank bounds
  const boundsA = getPlankBounds(plankA);
  const boundsB = getPlankBounds(plankB);

  // Check if planks form a 90-degree connection
  const jointPosition = findJointPosition(boundsA, boundsB);

  if (!jointPosition) {
    return null;
  }

  // Determine plank orientations dynamically
  const orientationA = determinePlankOrientation(plankA);
  const orientationB = determinePlankOrientation(plankB);

  // Check if they form a 90-degree connection
  const connectionType = determine90DegreeConnection(
    orientationA,
    orientationB,
  );
  if (!connectionType) {
    return null;
  }

  // Determine bolt and cam plank based on orientation
  const boltPlank = orientationA === 'HORIZONTAL' ? plankB : plankA;
  const camPlank = orientationA === 'HORIZONTAL' ? plankA : plankB;

  return {
    plankA: boltPlank,
    plankB: camPlank,
    jointPosition,
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
  boundsA: Bounds,
  boundsB: Bounds,
): { x: number; y: number; z: number } | null {
  const threshold = 1; // For floating-point precision

  // Check touching conditions
  const touchingX =
    Math.abs(boundsA.maxX - boundsB.minX) < threshold ||
    Math.abs(boundsB.maxX - boundsA.minX) < threshold;
  const touchingY =
    Math.abs(boundsA.maxY - boundsB.minY) < threshold ||
    Math.abs(boundsB.maxY - boundsA.minY) < threshold;
  const touchingZ =
    Math.abs(boundsA.maxZ - boundsB.minZ) < threshold ||
    Math.abs(boundsB.maxZ - boundsA.minZ) < threshold;

  // Check overlap conditions
  const overlapX = boundsA.minX < boundsB.maxX && boundsA.maxX > boundsB.minX;
  const overlapY = boundsA.minY < boundsB.maxY && boundsA.maxY > boundsB.minY;
  const overlapZ = boundsA.minZ < boundsB.maxZ && boundsA.maxZ > boundsB.minZ;

  // A 90-degree connection requires touching on one axis and overlapping on the other two
  const is90Connection =
    (touchingX && overlapY && overlapZ) ||
    (touchingY && overlapX && overlapZ) ||
    (touchingZ && overlapX && overlapY);

  if (!is90Connection) {
    return null;
  }

  // Calculate joint position based on touching axis
  if (touchingX) {
    return {
      x:
        Math.abs(boundsA.maxX - boundsB.minX) < threshold
          ? boundsA.maxX
          : boundsB.maxX,
      y:
        (Math.max(boundsA.minY, boundsB.minY) +
          Math.min(boundsA.maxY, boundsB.maxY)) /
        2,
      z:
        (Math.max(boundsA.minZ, boundsB.minZ) +
          Math.min(boundsA.maxZ, boundsB.maxZ)) /
        2,
    };
  } else if (touchingY) {
    return {
      x:
        (Math.max(boundsA.minX, boundsB.minX) +
          Math.min(boundsA.maxX, boundsB.maxX)) /
        2,
      y:
        Math.abs(boundsA.maxY - boundsB.minY) < threshold
          ? boundsA.maxY
          : boundsB.maxY,
      z:
        (Math.max(boundsA.minZ, boundsB.minZ) +
          Math.min(boundsA.maxZ, boundsB.maxZ)) /
        2,
    };
  } else if (touchingZ) {
    return {
      x:
        (Math.max(boundsA.minX, boundsB.minX) +
          Math.min(boundsA.maxX, boundsB.maxX)) /
        2,
      y:
        (Math.max(boundsA.minY, boundsB.minY) +
          Math.min(boundsA.maxY, boundsB.maxY)) /
        2,
      z:
        Math.abs(boundsA.maxZ - boundsB.minZ) < threshold
          ? boundsA.maxZ
          : boundsB.maxZ,
    };
  }

  return null;
}

function determinePlankOrientation(
  plank: PlankData,
): 'HORIZONTAL' | 'VERTICAL' {
  const { width, height } = plank;

  // If height is larger than width, it's vertical
  return height > width ? 'VERTICAL' : 'HORIZONTAL';
}

function determine90DegreeConnection(
  orientationA: string,
  orientationB: string,
): 'HORIZONTAL_TO_VERTICAL' | 'VERTICAL_TO_HORIZONTAL' | null {
  if (orientationA === 'HORIZONTAL' && orientationB === 'VERTICAL') {
    return 'HORIZONTAL_TO_VERTICAL';
  }

  if (orientationA === 'VERTICAL' && orientationB === 'HORIZONTAL') {
    return 'VERTICAL_TO_HORIZONTAL';
  }

  return null;
}
