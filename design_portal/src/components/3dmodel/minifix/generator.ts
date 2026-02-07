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
        // If Plank A is Housing Plank (check calculator logic, usually yes for Horizontal-Vertical if Plank A is Horizontal)
        // Actually, we need to check which plank is Housing.
        // But the connection object has explicit fields now.
        // We need to know if 'plank' is the Housing plank or Bolt plank.

        // Check ID match against stored IDs in connection?
        // Wait, connection.plankA/B refer to the planks involved.
        // The MinifixConnection object has `plankAId` and `plankBId`.
        // And it has `screwHousing`, `screwMating`, etc.
        // BUT `screwHousing` hole object doesn't explicitly say "I belong to Plank A".
        // It has a `direction` and `localPosition2D`.
        // However, `generator.ts` logic is: `if (connection.plankAId === plank.id)`.
        // We need to know which holes belong to Plank A.

        // In calculator.ts, we assigned:
        // `plankAId: housingPlank.id`
        // `plankBId: boltPlank.id`
        // So `plankA` IS the Housing Plank. `plankB` IS the Bolt Plank.
        // (Wait, let me double check calculator.ts return statement)

        // Calculator.ts:
        // plankAId: housingPlank.id,
        // plankBId: boltPlank.id,
        // screwHousing: ... (belongs to Housing Plank = A)
        // screwMating: ... (belongs to Bolt Plank = B)

        // So for Plank A (Housing):
        const screwHole: MinifixHole = { ...connection.screwHousing, connectorId: connection.id };
        holes.push(screwHole);

        const dowelHole: MinifixHole = { ...connection.dowelHousing, connectorId: connection.id };
        holes.push(dowelHole);

        const camHole: MinifixHole = { ...connection.cam, connectorId: connection.id };
        holes.push(camHole);
      }

      if (connection.plankBId === plank.id) {
        // Plank B is Bolt/Mating Plank
        const screwMatingHole: MinifixHole = { ...connection.screwMating, connectorId: connection.id };
        holes.push(screwMatingHole);

        const dowelMatingHole: MinifixHole = { ...connection.dowelMating, connectorId: connection.id };
        holes.push(dowelMatingHole);
      }
    });

    return {
      ...plank,
      minifixHoles: holes,
    };
  });
}
