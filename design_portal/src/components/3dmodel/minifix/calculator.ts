import { Position } from '../store/interface';
import type {
  MinifixConnection,
  MinifixStandards,
  PlankConnection,
  PlankData,
} from './types';
export const MINIFIX_STANDARDS: MinifixStandards = {
  SCREW_DIAMETER: 1,
  SCREW_LENGTH: 5,
  CAM_DIAMETER: 1,
  CAM_DEPTH: 3,
  DOWEL_DIAMETER: 1,
  DOWEL_LENGTH: 7,
  SPACING: 10,
};

export const getDynamicMinifixStandards = (
  spacing: number,
): MinifixStandards => {
  const updated = {
    ...MINIFIX_STANDARDS,
    SPACING: spacing,
  };
  return updated;
};

export function updateMinifixSpacing(newSpacing: number): MinifixStandards {
  MINIFIX_STANDARDS.SPACING = newSpacing;
  return MINIFIX_STANDARDS;
}

export function calculateMinifixPositions(
  connections: PlankConnection[],
  cupboardId: string,
  spacing?: number,
): MinifixConnection[] {
  const minifixConnections: MinifixConnection[] = [];
  const effectiveSpacing = spacing || MINIFIX_STANDARDS.SPACING;

  connections.forEach((connection, index) => {
    const { plankA, plankB, jointPosition, connectionType } = connection;
    const screwPlank =
      connectionType === 'VERTICAL_TO_HORIZONTAL' ? plankB : plankA;
    const depth = screwPlank.depth;
    const numConnectors = Math.floor(depth / effectiveSpacing);

    for (let i = 0; i < numConnectors; i++) {
      const zOffset = -depth / 2 + effectiveSpacing / 2 + i * effectiveSpacing;
      const shiftedJoint = {
        x: jointPosition.x,
        y: jointPosition.y,
        z: jointPosition.z + zOffset,
      };

      const minifixConnection = calculateSingleConnection(
        { ...connection, jointPosition: shiftedJoint },
        cupboardId,
        index * 100 + i,
      );

      if (minifixConnection) {
        (minifixConnection as MinifixConnection).jointPosition = shiftedJoint;
        minifixConnections.push(minifixConnection);
      }
    }
  });

  return minifixConnections;
}

function calculateSingleConnection(
  connection: PlankConnection,
  cupboardId: string,
  index: number,
): MinifixConnection | null {
  const { plankA, plankB, jointPosition, connectionType } = connection;

  let screwPlank = plankA;
  let camPlank = plankB;

  if (connectionType === 'VERTICAL_TO_HORIZONTAL') {
    screwPlank = plankB;
    camPlank = plankA;
  }

  const positions = calculateHolePositions(screwPlank, camPlank, jointPosition);

  if (!positions) {
    return null;
  }

  return {
    id: `minifix-${cupboardId}-${index}`,
    cupboardId,
    plankAId: screwPlank.id,
    plankBId: camPlank.id,
    jointPosition,
    connectionType,
    screw: {
      position: positions.screw.position,
      direction: positions.screw.direction,
      diameter: MINIFIX_STANDARDS.SCREW_DIAMETER,
      length: MINIFIX_STANDARDS.SCREW_LENGTH,
      localPosition2D: positions.screw.localPosition2D,
    },
    cam: {
      position: positions.cam.position,
      direction: positions.cam.direction,
      diameter: MINIFIX_STANDARDS.CAM_DIAMETER,
      depth: MINIFIX_STANDARDS.CAM_DEPTH,
      localPosition2D: positions.cam.localPosition2D,
    },
    dowel: {
      position: positions.dowel.position,
      direction: positions.dowel.direction,
      diameter: MINIFIX_STANDARDS.DOWEL_DIAMETER,
      length: MINIFIX_STANDARDS.DOWEL_LENGTH,
      localPosition2D: positions.dowel.localPosition2D,
    },
    boltDrill: {
      position: positions.boltDrill.position,
      direction: positions.boltDrill.direction,
      localPosition2D: positions.boltDrill.localPosition2D,
    },
  };
}

function calculateHolePositions(
  screwPlank: PlankData,
  camPlank: PlankData,
  jointPosition: Position,
) {
  const { SCREW_DIAMETER, SCREW_LENGTH } = MINIFIX_STANDARDS;

  const screwBounds = {
    minX: screwPlank.position.x - screwPlank.width / 2,
    maxX: screwPlank.position.x + screwPlank.width / 2,
    minY: screwPlank.position.y - screwPlank.height / 2,
    maxY: screwPlank.position.y + screwPlank.height / 2,
    minZ: screwPlank.position.z - screwPlank.depth / 2,
    maxZ: screwPlank.position.z + screwPlank.depth / 2,
  };

  const camBounds = {
    minX: camPlank.position.x - camPlank.width / 2,
    maxX: camPlank.position.x + camPlank.width / 2,
    minY: camPlank.position.y - camPlank.height / 2,
    maxY: camPlank.position.y + camPlank.height / 2,
    minZ: camPlank.position.z - camPlank.depth / 2,
    maxZ: camPlank.position.z + camPlank.depth / 2,
  };

  const touchingAxis =
    Math.abs(jointPosition.x - screwBounds.minX) < 1 ||
    Math.abs(jointPosition.x - screwBounds.maxX) < 1
      ? 'x'
      : Math.abs(jointPosition.y - screwBounds.minY) < 1 ||
          Math.abs(jointPosition.y - screwBounds.maxY) < 1
        ? 'y'
        : 'z';

  const screwDir = getInwardDirection(jointPosition, screwBounds, touchingAxis);
  const camDir = getInwardDirection(
    jointPosition,
    camBounds,
    touchingAxis,
    true,
  );

  // Screw Position: matches visualizer's createScrewVisualization
  const screwPos = {
    x: jointPosition.x,
    y: jointPosition.y,
    z: jointPosition.z,
  };

  // Cam Position: matches visualizer's createCamVisualization
  const isVertical = Math.abs(screwDir.y) > 0.9;
  const camPos = {
    x: isVertical
      ? jointPosition.x - SCREW_DIAMETER / 2
      : jointPosition.x + SCREW_LENGTH / 2,
    y: isVertical
      ? jointPosition.y - SCREW_LENGTH / 2
      : jointPosition.y + SCREW_DIAMETER / 2,
    z: jointPosition.z,
  };

  // Bolt Drill Position: matches visualizer's createBoltDrillVisualization
  const boltDrillPos = {
    x: isVertical ? jointPosition.x : jointPosition.x + SCREW_LENGTH / 4,
    y: isVertical ? jointPosition.y - SCREW_LENGTH / 4 : jointPosition.y,
    z: jointPosition.z,
  };

  // Dowel Position: matches visualizer's createDowelVisualization
  const dowelPos = {
    x: jointPosition.x,
    y: jointPosition.y,
    z: jointPosition.z + 3,
  };

  const camPlankIsHorizontal = camPlank.width > camPlank.height;

  // Calculate 2D local positions for nesting
  const screwLocal2D = calculateLocal2DPosition(
    screwPos,
    screwPlank,
    isVertical,
  );
  const camLocal2D = calculateLocal2DPosition(
    camPos,
    camPlank,
    camPlankIsHorizontal,
  );
  const dowelLocal2D = calculateLocal2DPosition(
    dowelPos,
    camPlank,
    camPlankIsHorizontal,
  );
  const boltDrillLocal2D = calculateLocal2DPosition(
    boltDrillPos,
    camPlank,
    camPlankIsHorizontal,
  );

  return {
    screw: {
      position: screwPos,
      direction: screwDir,
      localPosition2D: screwLocal2D,
    },
    cam: {
      position: camPos,
      direction: camDir,
      localPosition2D: camLocal2D,
    },
    boltDrill: {
      position: boltDrillPos,
      direction: screwDir,
      localPosition2D: boltDrillLocal2D,
    },
    dowel: {
      position: dowelPos,
      direction: camDir,
      localPosition2D: dowelLocal2D,
    },
  };
}

function calculateLocal2DPosition(
  position: Position,
  plank: PlankData,
  isVertical: boolean,
): { x: number; y: number } {
  // Use plank's center as the local origin
  const center = {
    x: plank.position.x,
    y: plank.position.y,
    z: plank.position.z,
  };

  let localX: number;
  let localY: number;

  if (isVertical) {
    // Vertical plank: use XZ plane (width x depth)
    localX = position.x - center.x; // Relative to center, allows negative values
    localY = position.z - center.z; // Relative to center, allows negative values
    // Optional bounds checking (relaxed to allow slight offsets)
    const maxX = (plank.width / 2) * 1.5;
    const maxY = (plank.depth / 2) * 1.5;
    localX = Math.max(-maxX, Math.min(maxX, localX));
    localY = Math.max(-maxY, Math.min(maxY, localY));
  } else {
    // Horizontal plank: use XY plane (width x height)
    localX = position.y - center.y;
    localY = position.z - center.z;

    const maxX = (plank.height / 2) * 1.5;
    const maxY = (plank.depth / 2) * 1.5;
    localX = Math.max(-maxX, Math.min(maxX, localX));
    localY = Math.max(-maxY, Math.min(maxY, localY));
  }

  return { x: localX, y: localY };
}

function getInwardDirection(
  joint: { x: number; y: number; z: number },
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  },
  axis: 'x' | 'y' | 'z',
  opposite = false,
): { x: number; y: number; z: number } {
  let dir = 0;

  if (axis === 'x') {
    dir =
      Math.abs(joint.x - bounds.minX) < 1
        ? 1
        : Math.abs(joint.x - bounds.maxX) < 1
          ? -1
          : 0;
  } else if (axis === 'y') {
    dir =
      Math.abs(joint.y - bounds.minY) < 1
        ? 1
        : Math.abs(joint.y - bounds.maxY) < 1
          ? -1
          : 0;
  } else if (axis === 'z') {
    dir =
      Math.abs(joint.z - bounds.minZ) < 1
        ? 1
        : Math.abs(joint.z - bounds.maxZ) < 1
          ? -1
          : 0;
  }

  if (opposite) dir *= -1;

  return {
    x: axis === 'x' ? dir : 0,
    y: axis === 'y' ? dir : 0,
    z: axis === 'z' ? dir : 0,
  };
}

export function getMinifixStandards(): MinifixStandards {
  return MINIFIX_STANDARDS;
}
