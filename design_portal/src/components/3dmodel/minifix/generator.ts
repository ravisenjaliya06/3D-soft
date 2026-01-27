import { calculateMinifixPositions } from './calculator';
import { detect90DegreeConnections } from './detector';
import type { MinifixConnection, MinifixHole, MinifixStandards, PlankData } from './types';

export function generateMinifixSystem(
  cupboardId: string,
  planks: PlankData[],
  spacing?: number | MinifixStandards
): {
  connections: MinifixConnection[];
  planksWithHoles: (PlankData & { minifixHoles: MinifixHole[] })[];
} {
  const connections = detect90DegreeConnections(planks);

  if (connections.length === 0) {
    return {
      connections: [],
      planksWithHoles: planks.map((plank) => ({ ...plank, minifixHoles: [] })),
    };
  }

  const minifixConnections = calculateMinifixPositions(connections, cupboardId, spacing);

  const planksWithHoles = generatePlankHoles(planks, minifixConnections);

  return {
    connections: minifixConnections,
    planksWithHoles,
  };
}

function generatePlankHoles(
  planks: PlankData[],
  connections: MinifixConnection[]
): (PlankData & { minifixHoles: MinifixHole[] })[] {
  return planks.map((plank) => {
    const holes: MinifixHole[] = [];

    connections.forEach((connection) => {
      if (connection.plankAId === plank.id) {
        const screwHole: MinifixHole = {
          type: 'SCREW',
          connectorId: connection.id,
          position: connection.screw.position,
          direction: connection.screw.direction,
          diameter: connection.screw.diameter,
          length: connection.screw.length,
          localPosition2D: connection.screw.localPosition2D,
        };
        holes.push(screwHole);
      }

      if (connection.plankBId === plank.id) {
        const camHole: MinifixHole = {
          type: 'CAM',
          connectorId: connection.id,
          position: connection.cam.position,
          direction: connection.cam.direction,
          diameter: connection.cam.diameter,
          depth: connection.cam.depth,
          localPosition2D: connection.cam.localPosition2D,
        };
        holes.push(camHole);

        const dowelHole: MinifixHole = {
          type: 'DOWEL',
          connectorId: connection.id,
          position: connection.dowel.position,
          direction: connection.dowel.direction,
          diameter: connection.dowel.diameter,
          length: connection.dowel.length,
          localPosition2D: connection.dowel.localPosition2D,
        };
        holes.push(dowelHole);

        const boltDrillHole: MinifixHole = {
          type: 'BOLT_DRILL',
          connectorId: connection.id,
          position: connection.boltDrill.position,
          direction: connection.boltDrill.direction,
          diameter: connection.boltDrill.diameter || connection.screw.diameter,
          length: connection.boltDrill.length || connection.screw.length / 2,
          localPosition2D: connection.boltDrill.localPosition2D,
        };
        holes.push(boltDrillHole);
      }
    });

    return {
      ...plank,
      minifixHoles: holes,
    };
  });
}
