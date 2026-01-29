import { Position } from '../store/interface';
import { MINIFIX_STANDARDS } from './constant';
import type { MinifixConnection, MinifixStandards, PlankConnection, PlankData } from './types';

export function calculateMinifixPositions(
  connections: PlankConnection[],
  cupboardId: string,
  spacing?: number | MinifixStandards
): MinifixConnection[] {
  const minifixConnections: MinifixConnection[] = [];

  // Resolve standards and spacing
  let activeStandards = MINIFIX_STANDARDS;
  if (typeof spacing === 'object') {
    activeStandards = spacing;
  }

  const effectiveSpacing =
    (typeof spacing === 'number' ? spacing : activeStandards.minifixDistance) ||
    MINIFIX_STANDARDS.minifixDistance;

  // Safety check to prevent infinite loop
  if (effectiveSpacing <= 0) {
    console.error('Invalid minifix spacing:', effectiveSpacing);
    return [];
  }

  connections.forEach((connection, index) => {
    const { plankA, plankB, jointPosition, connectionType } = connection;
    const screwPlank = connectionType === 'VERTICAL_TO_HORIZONTAL' ? plankB : plankA;

    // Determine spacing axis and relevant dimension
    // Cupboards (H-V) -> Z axis (Depth)
    // Drawers (V-V)   -> Y axis (Height)
    const spacingAxis = connectionType === 'VERTICAL_TO_VERTICAL' ? 'y' : 'z';
    const limitDimension = spacingAxis === 'y' ? screwPlank.height : screwPlank.depth;

    // Center-out strategy
    const offsets: number[] = [];

    // Always try to place one at the center first
    offsets.push(0);

    let k = 1;
    // Limit based on dimension and spacing.
    // We want to stop before we hit the edge.
    // Since the dowel is at +32mm, we need to ensure we have at least 32mm + margin at the positive end.
    // Margin of 40 (32 + 8) provides safety.
    const dowelDistance = activeStandards.dowelDistance || MINIFIX_STANDARDS.dowelDistance;
    const limit = limitDimension / 2 - (dowelDistance + 8);

    // Additional safety: max iterations and NaN check
    let iterations = 0;
    if (!isNaN(limit) && !isNaN(effectiveSpacing)) {
      while (iterations < 100) {
        iterations++;
        const dist = k * effectiveSpacing;
        if (dist > limit) {
          break;
        }
        offsets.push(dist);
        offsets.push(-dist);
        k++;
      }
    }

    offsets.forEach((offset, i) => {
      const shiftedJoint = {
        x: jointPosition.x,
        y: spacingAxis === 'y' ? jointPosition.y + offset : jointPosition.y,
        z: spacingAxis === 'z' ? jointPosition.z + offset : jointPosition.z,
      };

      const minifixConnection = calculateSingleConnection(
        { ...connection, jointPosition: shiftedJoint },
        cupboardId,
        index * 100 + i,
        activeStandards,
        spacingAxis
      );

      if (minifixConnection) {
        (minifixConnection as MinifixConnection).jointPosition = shiftedJoint;
        minifixConnections.push(minifixConnection);
      }
    });
  });

  return minifixConnections;
}

function calculateSingleConnection(
  connection: PlankConnection,
  cupboardId: string,
  index: number,
  standards: MinifixStandards,
  spacingAxis: 'y' | 'z'
): MinifixConnection | null {
  const { plankA, plankB, jointPosition, connectionType } = connection;

  let screwPlank = plankA;
  let camPlank = plankB;

  if (connectionType === 'VERTICAL_TO_HORIZONTAL') {
    // Standard Cabinet: Bolt in Side (Vertical), Cam in Shelf (Horizontal)
    // plankA is Vertical (Side) based on detector.ts
    // plankB is Horizontal (Shelf)
    screwPlank = plankA;
    camPlank = plankB;
  } else if (connectionType === 'VERTICAL_TO_VERTICAL') {
    // Drawers: Bolt in Front/Back, Cam in Side Plank?
    // User says: "Drawer Back plank receives the cam".
    // So Cam Plank is Back/Front. Screw is Side.
    // detector.ts says plankA is usually Left/Right Side for drawers due to query order?
    // Let's check name.

    const isSidePlankA = plankA.name.includes('LEFT') || plankA.name.includes('RIGHT');

    if (isSidePlankA) {
      screwPlank = plankA; // Side has Bolt
      camPlank = plankB; // Front/Back has Cam
    } else {
      screwPlank = plankB; // Side has Bolt
      camPlank = plankA; // Front/Back has Cam
    }
  }

  // Determine bolt direction based on touching face normal
  // touchingFaceNormal is the normal of plankA's touching face (pointing OUT of A into B)
  let boltDirection = connection.touchingFaceNormal;

  if (screwPlank.id !== connection.plankA.id) {
    // If screwPlank is plankB, we want the normal of plankB's touching face.
    // plankB's touching face normal is opposite to plankA's.
    boltDirection = {
      x: -connection.touchingFaceNormal.x,
      y: -connection.touchingFaceNormal.y,
      z: -connection.touchingFaceNormal.z,
    };
  }

  const positions = calculateHolePositions(
    screwPlank,
    camPlank,
    jointPosition,
    standards,
    boltDirection,
    spacingAxis
  );

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
      diameter: standards.screwDiameter,
      length: standards.screwLength,
      localPosition2D: positions.screw.localPosition2D,
    },
    cam: {
      position: positions.cam.position,
      direction: positions.cam.direction,
      diameter: standards.camDiameter,
      depth: standards.camDepth,
      localPosition2D: positions.cam.localPosition2D,
    },
    dowel: {
      position: positions.dowel.position,
      direction: positions.dowel.direction,
      diameter: standards.dowelDiameter,
      length: standards.dowelLength,
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
  standards: MinifixStandards,
  direction: Position,
  spacingAxis: 'y' | 'z'
) {
  const { screwLength, dowelDistance } = standards;

  // Use passed direction directly
  const boltDir = direction;
  const screwDir = { x: -direction.x, y: -direction.y, z: -direction.z }; // Into screw plank
  const camDir = direction; // Into cam plank

  // Screw Position: At the joint interface
  const screwPos = {
    x: jointPosition.x,
    y: jointPosition.y,
    z: jointPosition.z,
  };

  // Cam Position:
  // User Rule: "Cam center = joint position + (cam direction * cam depth / 2)"
  // But practically for minifix: Distance from edge is Screw Length (e.g. 34mm).
  // Cam Depth usually refers to hole depth.
  // We place the Cam Center at `Joint + BoltDir * ScrewLength`.
  const camPos = {
    x: jointPosition.x + direction.x * screwLength,
    y: jointPosition.y + direction.y * screwLength,
    z: jointPosition.z + direction.z * screwLength,
  };

  const boltDrillPos = {
    x: jointPosition.x + boltDir.x * (screwLength / 2),
    y: jointPosition.y + boltDir.y * (screwLength / 2),
    z: jointPosition.z + boltDir.z * (screwLength / 2),
  };

  // Dowel Position:
  // Must be offset perpendicular to drilling direction.
  // We use `spacingAxis` to determine the offset direction.
  // Cabinet (spacingAxis='z'): Dowel is offset in Z.
  // Drawer (spacingAxis='y'): Dowel is offset in Y.

  const dowelOffsetVector = { x: 0, y: 0, z: 0 };

  if (spacingAxis === 'z') {
    dowelOffsetVector.z = dowelDistance;
  } else if (spacingAxis === 'y') {
    dowelOffsetVector.y = dowelDistance;
  } else {
    // Fallback if logic fails (shouldn't happen with strict types)
    dowelOffsetVector.z = dowelDistance;
  }

  const finalDowelPos = {
    x: jointPosition.x + dowelOffsetVector.x,
    y: jointPosition.y + dowelOffsetVector.y,
    z: jointPosition.z + dowelOffsetVector.z,
  };

  return {
    screw: {
      position: screwPos,
      direction: screwDir, // Pointing INTO screw plank
      localPosition2D: calculateLocal2DPosition(screwPos, screwPlank, Math.abs(screwDir.y) > 0.9),
    },
    cam: {
      position: camPos,
      direction: camDir, // Pointing INTO cam plank
      localPosition2D: calculateLocal2DPosition(camPos, camPlank, camPlank.width > camPlank.height),
    },
    boltDrill: {
      position: boltDrillPos,
      direction: screwDir,
      localPosition2D: calculateLocal2DPosition(
        boltDrillPos,
        camPlank,
        camPlank.width > camPlank.height
      ),
    },
    dowel: {
      position: finalDowelPos,
      direction: camDir,
      localPosition2D: calculateLocal2DPosition(
        finalDowelPos,
        camPlank,
        camPlank.width > camPlank.height
      ),
    },
  };
}

function calculateLocal2DPosition(
  position: Position,
  plank: PlankData,
  isVertical: boolean
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

export function getMinifixStandards(): MinifixStandards {
  return MINIFIX_STANDARDS;
}
