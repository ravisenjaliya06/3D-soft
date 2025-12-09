import { Wall, WallPoint } from '../interface';

export function getFloorPolygon(walls: Wall[]): WallPoint[] {
  // Return empty result if a polygon cannot exist
  if (walls.length < 3) return [];

  // Store all unique wall endpoints as polygon vertices
  const pointMap = new Map<string, WallPoint>();

  walls.forEach((wall) => {
    const key1 = `${wall.startPoint.x},${wall.startPoint.y}`;
    const key2 = `${wall.endPoint.x},${wall.endPoint.y}`;
    pointMap.set(key1, wall.startPoint); // Add start point
    pointMap.set(key2, wall.endPoint); // Add end point
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

export function findRoomsFromWalls(walls: Wall[]): Wall[][] {
  // Store all detected closed room loops
  const rooms: Wall[][] = [];
  // Track walls already traversed to avoid revisits
  const used = new Set<string>();

  // Generate a unique key for a point based on coordinates
  const pointKey = (x: number, y: number) => `${x},${y}`;

  // Build map: each point maps to all walls touching it
  const pointToWallsMap = new Map<string, Wall[]>();

  walls.forEach((wall) => {
    const startPointKey = pointKey(wall.startPoint.x, wall.startPoint.y);
    const endPointKey = pointKey(wall.endPoint.x, wall.endPoint.y);

    if (!pointToWallsMap.has(startPointKey)) pointToWallsMap.set(startPointKey, []);
    if (!pointToWallsMap.has(endPointKey)) pointToWallsMap.set(endPointKey, []);

    pointToWallsMap.get(startPointKey)!.push(wall); // Add wall to start point
    pointToWallsMap.get(endPointKey)!.push(wall); // Add wall to end point
  });

  // Attempt to trace a loop starting from a given wall
  function followLoop(startWall: Wall): Wall[] | null {
    const loop: Wall[] = [];
    let current = startWall;
    let prevPoint = pointKey(current.startPoint.x, current.startPoint.y);

    while (true) {
      loop.push(current); // Add current wall to loop
      used.add(current.id); // Mark current wall as visited

      // Determine next wall by moving to the opposite point of current wall
      const startPointKey = pointKey(current.startPoint.x, current.startPoint.y);
      const endPointKey = pointKey(current.endPoint.x, current.endPoint.y);

      const nextPoint = startPointKey === prevPoint ? endPointKey : startPointKey;

      const neighbors = pointToWallsMap.get(nextPoint) || []; // Walls connected at next point
      const nextWall = neighbors.find((next) => !used.has(next.id)); // Next unused wall

      if (!nextWall) break; // Stop if traversal cannot continue

      prevPoint = nextPoint; // Move traversal cursor
      current = nextWall; // Advance to next wall
    }

    // Verify that loop is geometrically closed
    const firstWall = loop[0];
    const lastWall = loop[loop.length - 1];

    const firstStartKey = pointKey(firstWall.startPoint.x, firstWall.startPoint.y);
    const firstEndKey = pointKey(firstWall.endPoint.x, firstWall.endPoint.y);

    const lastStartKey = pointKey(lastWall.startPoint.x, lastWall.startPoint.y);
    const lastEndKey = pointKey(lastWall.endPoint.x, lastWall.endPoint.y);

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
