import { Position } from '../store/interface';
import { MINIFIX_STANDARDS } from './constant';
import type {
  MinifixConnection,
  MinifixHole,
  MinifixStandards,
  PlankConnection,
  PlankData,
} from './types';

type AxisKey = 'x' | 'y' | 'z';

function getSortedDimensions(plank: PlankData): { axis: AxisKey; value: number }[] {
  const dimensions: { axis: AxisKey; value: number }[] = [
    { axis: 'x', value: plank.width },
    { axis: 'y', value: plank.height },
    { axis: 'z', value: plank.depth },
  ];
  return dimensions.sort((a, b) => b.value - a.value);
}

function getPlankFrame(plank: PlankData): {
  primaryAxis: AxisKey;
  secondaryAxis: AxisKey;
  thicknessAxis: AxisKey;
  primarySize: number;
  secondarySize: number;
} {
  const sorted = getSortedDimensions(plank);
  return {
    primaryAxis: sorted[0].axis,
    secondaryAxis: sorted[1].axis,
    thicknessAxis: sorted[2].axis,
    primarySize: sorted[0].value,
    secondarySize: sorted[1].value,
  };
}

function axisComponent(v: Position, axis: AxisKey): number {
  if (axis === 'x') return v.x;
  if (axis === 'y') return v.y;
  return v.z;
}

function pointAxis01(point: Position, plank: PlankData, axis: AxisKey): number {
  const { position: center } = plank;
  if (axis === 'x') return point.x - center.x + plank.width / 2;
  if (axis === 'y') return point.y - center.y + plank.height / 2;
  return point.z - center.z + plank.depth / 2;
}

function getFaceId(direction: Position, plank: PlankData): string {
  const frame = getPlankFrame(plank);
  const localDirection = {
    x: axisComponent(direction, frame.primaryAxis),
    y: axisComponent(direction, frame.secondaryAxis),
    z: axisComponent(direction, frame.thicknessAxis),
  };

  const absDirection = {
    x: Math.abs(localDirection.x),
    y: Math.abs(localDirection.y),
    z: Math.abs(localDirection.z),
  };

  let dominantAxis: AxisKey = 'x';
  let dominantValue = absDirection.x;
  if (absDirection.y > dominantValue) {
    dominantAxis = 'y';
    dominantValue = absDirection.y;
  }
  if (absDirection.z > dominantValue) {
    dominantAxis = 'z';
  }

  if (dominantAxis === 'x') return localDirection.x >= 0 ? '4' : '3';
  if (dominantAxis === 'y') return localDirection.y >= 0 ? '5' : '6';
  if (dominantAxis === 'z') return localDirection.z >= 0 ? '1' : '2';

  return '0';
}

function getFaceIdForHole(drillType: '1' | '2', direction: Position, plank: PlankData): string {
  if (drillType === '2') {
    return direction.y >= 0 ? '5' : '6';
  }
  return getFaceId(direction, plank);
}

function calculateLocal2D(
  point: Position,
  plank: PlankData,
  faceId: string
): { x: number; y: number } {
  const frame = getPlankFrame(plank);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const primaryCoord = clamp(pointAxis01(point, plank, frame.primaryAxis), 0, frame.primarySize);
  const secondaryCoord = clamp(
    pointAxis01(point, plank, frame.secondaryAxis),
    0,
    frame.secondarySize
  );

  switch (faceId) {
    case '1':
      return { x: primaryCoord, y: frame.secondarySize };

    case '2':
      return { x: primaryCoord, y: 0 };

    case '3':
      return { x: frame.primarySize, y: secondaryCoord };

    case '4':
      return { x: 0, y: secondaryCoord };

    case '5':
      return { x: primaryCoord, y: secondaryCoord };

    case '6':
      // Opposite face mirrors around the panel center line.
      return { x: frame.primarySize - primaryCoord, y: secondaryCoord };

    default:
      return { x: 0, y: 0 };
  }
}

export function calculateMinifixPositions(
  connections: PlankConnection[],
  cupboardId: string,
  spacing?: number | MinifixStandards
): MinifixConnection[] {
  const minifixConnections: MinifixConnection[] = [];

  // Resolve standards — always start from MINIFIX_STANDARDS so every field
  // (including new ones like camBoltProtrusion / boltTailDepth) has a default,
  // then overlay any custom values the caller provided.
  let activeStandards: typeof MINIFIX_STANDARDS = MINIFIX_STANDARDS;
  if (typeof spacing === 'object') {
    activeStandards = { ...MINIFIX_STANDARDS, ...spacing };
  }
  const effectiveSpacing =
    (typeof spacing === 'number' ? spacing : activeStandards.minifixDistance) ||
    MINIFIX_STANDARDS.minifixDistance;

  if (effectiveSpacing <= 0) return [];

  // Sort for determinism
  connections.sort(
    (a, b) => a.plankA.id.localeCompare(b.plankA.id) || a.plankB.id.localeCompare(b.plankB.id)
  );

  connections.forEach((connection, index) => {
    const { plankA, plankB, connectionType } = connection;

    let housingPlank = plankA;
    let boltPlank = plankB;

    if (
      connectionType === 'HORIZONTAL_TO_VERTICAL' ||
      connectionType === 'VERTICAL_TO_HORIZONTAL'
    ) {
      const isOverlay = Math.abs(connection.touchingFaceNormal.y) > 0.9;

      if (isOverlay) {
        const p1 = plankA.width > plankA.height ? plankB : plankA;
        const p2 = plankA.width > plankA.height ? plankA : plankB;

        housingPlank = p1;
        boltPlank = p2;
      } else {
        const p1 = plankA.width > plankA.height ? plankB : plankA;
        const p2 = plankA.width > plankA.height ? plankA : plankB;

        housingPlank = p2;
        boltPlank = p1;
      }
    } else {
      const isSideA =
        plankA.name.toUpperCase().includes('LEFT') || plankA.name.toUpperCase().includes('RIGHT');
      if (isSideA) {
        housingPlank = plankB;
        boltPlank = plankA;
      } else {
        housingPlank = plankA;
        boltPlank = plankB;
      }
    }

    const spacingAxis = connectionType === 'VERTICAL_TO_VERTICAL' ? 'y' : 'z';
    const dimA = spacingAxis === 'y' ? plankA.height : plankA.depth;
    const dimB = spacingAxis === 'y' ? plankB.height : plankB.depth;
    const limitDimension = Math.min(dimA, dimB);

    const dowelDistance = activeStandards.dowelDistance || MINIFIX_STANDARDS.dowelDistance;
    const limit = limitDimension / 2 - (dowelDistance + 8);

    const offsets: number[] = [0];
    let k = 1;
    let iterations = 0;
    if (!isNaN(limit) && !isNaN(effectiveSpacing)) {
      while (iterations < 100) {
        iterations++;
        const dist = k * effectiveSpacing;
        if (dist > limit - 0.0001) break;
        offsets.push(dist);
        offsets.push(-dist);
        k++;
      }
    }

    offsets.forEach((offset, i) => {
      const shiftedJoint = { ...connection.jointPosition };
      if (spacingAxis === 'y') shiftedJoint.y += offset;
      else shiftedJoint.z += offset; // z axis

      const connId = `minifix-${cupboardId}-${plankA.id}-${plankB.id}-${index * 100 + i}`;

      const mp = calculateSingleConnectionData(
        housingPlank,
        boltPlank,
        shiftedJoint,
        activeStandards,
        connId,
        connection,
        spacingAxis
      );

      if (mp) minifixConnections.push(mp);
    });
  });

  return minifixConnections;
}

function calculateSingleConnectionData(
  housingPlank: PlankData,
  boltPlank: PlankData,
  jointPos: Position,
  standards: MinifixStandards,
  id: string,
  connection: PlankConnection,
  spacingAxis: 'y' | 'z'
): MinifixConnection | null {
  let intoHousingDir: Position;

  if (housingPlank.id === connection.plankA.id) {
    intoHousingDir = {
      x: -Math.round(connection.touchingFaceNormal.x),
      y: -Math.round(connection.touchingFaceNormal.y),
      z: -Math.round(connection.touchingFaceNormal.z),
    };
  } else {
    intoHousingDir = {
      x: Math.round(connection.touchingFaceNormal.x),
      y: Math.round(connection.touchingFaceNormal.y),
      z: Math.round(connection.touchingFaceNormal.z),
    };
  }

  const housingFaceNormal = { x: -intoHousingDir.x, y: -intoHousingDir.y, z: -intoHousingDir.z };
  const housingFaceId = getFaceIdForHole('1', housingFaceNormal, housingPlank);

  // Todo :-smit/harsh create for camBoltProtrusion
  const camBoltProtrusion: number = standards.camBoltProtrusion ?? 34;

  const screwHousingHole: MinifixHole = {
    type: 'SCREW',
    connectorId: id,
    position: jointPos,
    direction: intoHousingDir,
    drillType: '1',
    face: housingFaceId,
    diameter: standards.screwDiameter,
    length: camBoltProtrusion, // must reach exactly the cam center
    localPosition2D: calculateLocal2D(jointPos, housingPlank, housingFaceId),
  };

  const intoBoltDir = { x: -intoHousingDir.x, y: -intoHousingDir.y, z: -intoHousingDir.z };
  const boltFaceNormal = { x: -intoBoltDir.x, y: -intoBoltDir.y, z: -intoBoltDir.z };
  const boltFaceId = getFaceIdForHole('2', boltFaceNormal, boltPlank);

  // Todo :-smit/harsh create for bolt tail depth
  const boltTailDepth: number = standards.boltTailDepth ?? 13;

  const screwMatingHole: MinifixHole = {
    type: 'SCREW',
    connectorId: id,
    position: jointPos,
    direction: intoBoltDir,
    drillType: '2',
    face: boltFaceId,
    diameter: standards.screwDiameter,
    length: boltTailDepth,
    localPosition2D: calculateLocal2D(jointPos, boltPlank, boltFaceId),
  };

  const camPos3D = {
    x: jointPos.x + intoHousingDir.x * camBoltProtrusion,
    y: jointPos.y + intoHousingDir.y * camBoltProtrusion,
    z: jointPos.z + intoHousingDir.z * camBoltProtrusion,
  };

  let camDir = { x: 0, y: -1, z: 0 };
  if (Math.abs(intoHousingDir.y) > 0.9) {
    camDir = { x: 1, y: 0, z: 0 };
  }

  const camFaceDirection = { x: -camDir.x, y: -camDir.y, z: -camDir.z };
  const camFaceId = getFaceIdForHole('2', camFaceDirection, housingPlank);

  const camHole: MinifixHole = {
    type: 'CAM',
    connectorId: id,
    position: camPos3D,
    direction: camDir,
    drillType: '2',
    face: camFaceId,
    diameter: standards.camDiameter,
    depth: standards.camDepth,
    localPosition2D: calculateLocal2D(camPos3D, housingPlank, camFaceId),
  };

  // DOWEL HOLES
  const dowelOffsetVector = { x: 0, y: 0, z: 0 };
  if (spacingAxis === 'z') dowelOffsetVector.z = standards.dowelDistance;
  else dowelOffsetVector.y = standards.dowelDistance;

  const dowelPos = {
    x: jointPos.x + dowelOffsetVector.x,
    y: jointPos.y + dowelOffsetVector.y,
    z: jointPos.z + dowelOffsetVector.z,
  };

  // Dowel Housing (20mm, Type 2)
  const dowelHousingHole: MinifixHole = {
    type: 'DOWEL',
    connectorId: id,
    position: dowelPos,
    direction: intoHousingDir,
    drillType: '1',
    face: housingFaceId,
    diameter: standards.dowelDiameter,
    length: standards.dowelLength - 10,
    localPosition2D: calculateLocal2D(dowelPos, housingPlank, housingFaceId),
  };

  const dowelMatingHole: MinifixHole = {
    type: 'DOWEL',
    connectorId: id,
    position: dowelPos,
    direction: intoBoltDir,
    drillType: '2',
    face: boltFaceId,
    diameter: standards.dowelDiameter,
    length: standards.dowelLength - 20,
    localPosition2D: calculateLocal2D(dowelPos, boltPlank, boltFaceId),
  };

  return {
    id,
    cupboardId: 'cupboard-1',
    plankAId: housingPlank.id,
    plankBId: boltPlank.id,
    jointPosition: jointPos,
    connectionType: 'HORIZONTAL_TO_VERTICAL',
    screwHousing: screwHousingHole,
    screwMating: screwMatingHole,
    dowelHousing: dowelHousingHole,
    dowelMating: dowelMatingHole,
    cam: camHole,
  };
}

export function getMinifixStandards(): MinifixStandards {
  return MINIFIX_STANDARDS;
}
