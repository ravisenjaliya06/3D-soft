import { MeshObjectData } from '../../sceneCreator/interface';
import { getWallReferenceEdgePoints } from '../../sceneCreator/utils';
import { WallPoint } from '../interface';

export function getFloorPolygon(walls: MeshObjectData[]): WallPoint[] {
  // Return empty result if a polygon cannot exist (at least 3 walls required)
  if (walls.length < 3) return [];

  // Store all unique wall endpoints as polygon vertices
  const pointMap = new Map<string, WallPoint>();
  const pointCounts = new Map<string, number>();

  walls.forEach((wall) => {
    const { startPoint, endPoint } = getWallReferenceEdgePoints(wall);
    const key1 = `${Math.round(startPoint.x)},${Math.round(startPoint.y)}`;
    const key2 = `${Math.round(endPoint.x)},${Math.round(endPoint.y)}`;

    pointMap.set(key1, startPoint);
    pointMap.set(key2, endPoint);

    pointCounts.set(key1, (pointCounts.get(key1) || 0) + 1);
    pointCounts.set(key2, (pointCounts.get(key2) || 0) + 1);
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

export function findConnectedWalls(walls: MeshObjectData[]): MeshObjectData[][] {
  const connectedGroups: MeshObjectData[][] = [];
  const visited = new Set<string>();

  // Helper to find connected walls using BFS
  function bfs(startWall: MeshObjectData): MeshObjectData[] {
    const group: MeshObjectData[] = [];
    const queue: MeshObjectData[] = [startWall];
    visited.add(startWall.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      // Find neighbors
      const neighbors = walls.filter((w) => {
        if (visited.has(w.id)) return false;

        // Check if directly connected via ID reference or geometry overlap
        // We use geometric check here since connectedTo might not be fully synced or reliable outside of redux actions
        // But useWallDrawing calculates connectedTo, so let's try to use that first if available
        if (current.connectedTo && current.connectedTo.includes(w.id)) return true;
        if (w.connectedTo && w.connectedTo.includes(current.id)) return true;

        // Fallback to geometric check
        const { startPoint: s1, endPoint: e1 } = getWallReferenceEdgePoints(current);
        const { startPoint: s2, endPoint: e2 } = getWallReferenceEdgePoints(w);

        // Simple point equality check (using rounding to avoid float issues)
        const isSamePoint = (p1: WallPoint, p2: WallPoint) =>
          Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y);

        return (
          isSamePoint(s1, s2) || isSamePoint(s1, e2) || isSamePoint(e1, s2) || isSamePoint(e1, e2)
        );
      });

      for (const neighbor of neighbors) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
    return group;
  }

  for (const wall of walls) {
    if (!visited.has(wall.id)) {
      const group = bfs(wall);
      // Only return groups with at least 3 walls as requested
      if (group.length >= 3) {
        connectedGroups.push(group);
      }
    }
  }

  return connectedGroups;
}

// Kept for backward compatibility if needed, but implementation redirects to findConnectedWalls
export function findRoomsFromWalls(walls: MeshObjectData[]): MeshObjectData[][] {
  return findConnectedWalls(walls);
}
