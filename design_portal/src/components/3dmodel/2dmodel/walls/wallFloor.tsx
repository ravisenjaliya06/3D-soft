import { MeshObjectData } from '../../sceneCreator/interface';
import { getWall2DPoints } from '../../sceneCreator/utils';
import { WallPoint } from '../interface';

export function getFloorPolygon(walls: MeshObjectData[]): WallPoint[] {
  // Return empty result if a polygon cannot exist
  if (walls.length < 3) return [];

  // Store all unique wall endpoints as polygon vertices
  const pointMap = new Map<string, WallPoint>();

  walls.forEach((wall) => {
    const { startPoint, endPoint } = getWall2DPoints(wall);
    const key1 = `${Math.round(startPoint.x)},${Math.round(startPoint.y)}`;
    const key2 = `${Math.round(endPoint.x)},${Math.round(endPoint.y)}`;
    pointMap.set(key1, startPoint); // Add start point
    pointMap.set(key2, endPoint); // Add end point
  });

  // Convert stored points into an array
  const points = Array.from(pointMap.values());

  // Compute the centroid of all polygon points
  const center = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };

  // Sort vertices based on their angle around the centroid
  points.sort((pointA, pointB) => {
    const angleA = Math.atan2(pointA.y - center.y, pointA.x - center.x);
    const angleB = Math.atan2(pointB.y - center.y, pointB.x - center.x);
    return angleA - angleB;
  });

  // Return final ordered polygon vertices
  return points;
}

export function findRoomsFromWalls(walls: MeshObjectData[]): MeshObjectData[][] {
  // Store all detected closed room loops
  const rooms: MeshObjectData[][] = [];
  // Track walls already traversed to avoid revisits
  const used = new Set<string>();

  // Generate a unique key for a point based on coordinates
  const pointKey = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;

  // Build map: each point maps to all walls touching it
  const pointToWallsMap = new Map<string, MeshObjectData[]>();

  walls.forEach((wall) => {
    const { startPoint: wallStartPoint, endPoint: wallEndPoint } = getWall2DPoints(wall);
    const startPointKey = pointKey(wallStartPoint.x, wallStartPoint.y);
    const endPointKey = pointKey(wallEndPoint.x, wallEndPoint.y);

    if (!pointToWallsMap.has(startPointKey)) pointToWallsMap.set(startPointKey, []);
    if (!pointToWallsMap.has(endPointKey)) pointToWallsMap.set(endPointKey, []);

    pointToWallsMap.get(startPointKey)!.push(wall); // Add wall to start point
    pointToWallsMap.get(endPointKey)!.push(wall); // Add wall to end point
  });

  // Attempt to trace a loop starting from a given wall
  function followLoop(startWall: MeshObjectData): MeshObjectData[] | null {
    const loop: MeshObjectData[] = [];
    let current = startWall;
    let { startPoint, endPoint } = getWall2DPoints(current);
    let prevPoint = pointKey(startPoint.x, startPoint.y);

    while (true) {
      loop.push(current); // Add current wall to loop
      used.add(current.id); // Mark current wall as visited

      const startPointKey = pointKey(startPoint.x, startPoint.y);
      const endPointKey = pointKey(endPoint.x, endPoint.y);

      const nextPoint = startPointKey === prevPoint ? endPointKey : startPointKey;

      const neighbors = pointToWallsMap.get(nextPoint) || []; // Walls connected at next point
      const nextWall = neighbors.find((next) => !used.has(next.id)); // Next unused wall

      if (!nextWall) break; // Stop if traversal cannot continue

      prevPoint = nextPoint; // Move traversal cursor
      current = nextWall; // Advance to next wall
      const nextPoints = getWall2DPoints(current);
      startPoint = nextPoints.startPoint;
      endPoint = nextPoints.endPoint;
    }

    // Verify that loop is geometrically closed
    const firstWall = loop[0];
    const { startPoint: firstWallStartPoint, endPoint: firstWallEndPoint } =
      getWall2DPoints(firstWall);
    const lastWall = loop[loop.length - 1];
    const { startPoint: lastWallStartPoint, endPoint: lastWallEndPoint } =
      getWall2DPoints(lastWall);

    const firstStartKey = pointKey(firstWallStartPoint.x, firstWallStartPoint.y);
    const firstEndKey = pointKey(firstWallEndPoint.x, firstWallEndPoint.y);

    const lastStartKey = pointKey(lastWallStartPoint.x, lastWallStartPoint.y);
    const lastEndKey = pointKey(lastWallEndPoint.x, lastWallEndPoint.y);

    // True if the first and last walls share any common point
    const isLoopClosed =
      firstStartKey === lastStartKey ||
      firstStartKey === lastEndKey ||
      firstEndKey === lastStartKey ||
      firstEndKey === lastEndKey;

    return isLoopClosed ? loop : null; // Return loop only if valid closure exists
  }

  // Traverse each wall and detect room loops if unused
  walls.forEach((wall) => {
    if (!used.has(wall.id)) {
      const loop = followLoop(wall);
      if (loop) rooms.push(loop); // Store only valid closed loops
    }
  });

  // Return all detected room boundaries
  return rooms;
}
