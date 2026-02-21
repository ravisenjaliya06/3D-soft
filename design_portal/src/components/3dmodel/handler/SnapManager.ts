import * as THREE from 'three';
import {
  PLATFORM_DEPTH,
  PLATFORM_HEIGHT,
  PLATFORM_RAYCAST_HEIGHT,
  PLATFORM_THICKNESS,
} from '../handler/constant';
import { FLOOR_PLAN_TYPES, OBJECT_TYPES } from '../sceneCreator/interface';

export class SnapManager {
  private walls: THREE.Mesh[] = [];
  private platforms: THREE.Mesh[] = [];
  private cupboards: THREE.Mesh[] = [];
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  public updateSnapTargets(scene: THREE.Scene) {
    this.walls = [];
    this.platforms = [];
    this.cupboards = [];

    for (const o of scene.children) {
      if (!(o instanceof THREE.Mesh)) continue;
      o.userData.type === FLOOR_PLAN_TYPES.WALL && this.walls.push(o);
      o.userData.type === OBJECT_TYPES.PLATFORM && this.platforms.push(o);
      o.userData.type === OBJECT_TYPES.CUPBOARD && this.cupboards.push(o);
    }
  }

  public snapObject(object: THREE.Object3D, raycaster: THREE.Raycaster) {
    if (!(object instanceof THREE.Mesh)) return;
    this.applyWallSnapping(object, raycaster);
    this.applyPlatformSnapping(object, raycaster);
    this.applyCupboardSnapping(object);
  }

  private findSnapTarget(
    _object: THREE.Mesh,
    targets: THREE.Mesh[],
    raycaster: THREE.Raycaster,
    rayOrigin?: THREE.Vector3,
    rayDirection?: THREE.Vector3
  ): THREE.Intersection | null {
    if (!targets.length) return null;

    const finalRaycaster =
      rayOrigin && rayDirection ? new THREE.Raycaster(rayOrigin, rayDirection) : raycaster;

    const intersects = finalRaycaster.intersectObjects(targets, true);
    return intersects.length ? intersects[0] : null;
  }

  // helper function
  private getSnapMetrics(mesh: THREE.Mesh) {
    const rotation = mesh.rotation.y;
    const direction = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation
    );

    let widthM = 0;
    let heightM = 0;
    let depthM = 0;

    if (mesh.geometry instanceof THREE.BoxGeometry) {
      // Geometry parameters are usually in CM in this app, convert to Meters
      widthM = mesh.geometry.parameters.width * 0.01;
      heightM = mesh.geometry.parameters.height * 0.01;
      depthM = mesh.geometry.parameters.depth * 0.01;
    } else {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      // Box3 getSize returns World Units (Meters)
      widthM = Math.max(size.x, size.z); // Assume local X/Z max is width
      // Note: This matches original logic `Math.max(wallSize.x, wallSize.z)`
      heightM = size.y;
      depthM = Math.min(size.x, size.z); // Assume smaller is depth?
    }

    return {
      rotation,
      direction,
      widthM,
      heightM,
      depthM,
      position: mesh.position.clone(),
      topY: mesh.position.y + heightM / 2,
    };
  }

  private getBoxData(mesh: THREE.Mesh) {
    mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    return { box, center, size };
  }

  private getOverlap(a: THREE.Box3, b: THREE.Box3, axis: 'x' | 'y' | 'z') {
    return Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);
  }

  private alignEdge(
    object: THREE.Mesh,
    currentBox: THREE.Box3,
    targetBox: THREE.Box3,
    axis: 'x' | 'y' | 'z',
    threshold: number
  ) {
    if (Math.abs(currentBox.min[axis] - targetBox.min[axis]) < threshold) {
      object.position[axis] += targetBox.min[axis] - currentBox.min[axis];
    } else if (Math.abs(currentBox.max[axis] - targetBox.max[axis]) < threshold) {
      object.position[axis] += targetBox.max[axis] - currentBox.max[axis];
    }
  }

  //object snapping to wall
  private applyWallSnapping(object: THREE.Mesh, raycaster: THREE.Raycaster) {
    if (!this.walls.length) return;

    const hit = this.findSnapTarget(object, this.walls, raycaster);
    if (!hit) return;

    const wall = hit.object as THREE.Mesh;
    const wallNormal =
      hit.face?.normal.clone().transformDirection(wall.matrixWorld).normalize() ??
      new THREE.Vector3(0, 0, 1);

    // PLATFORM
    if (object.userData.type === OBJECT_TYPES.PLATFORM) {
      this.snapPlatformToWall(object, wall, wallNormal);
      return;
    }

    this.snapGenericObjectToWall(object, hit, wall, wallNormal);
  }

  private snapPlatformToWall(object: THREE.Mesh, wall: THREE.Mesh, wallNormal: THREE.Vector3) {
    const m = this.getSnapMetrics(wall);
    object.rotation.y = m.rotation;

    const wallHalf = m.widthM / 2;
    const start = m.position.clone().addScaledVector(m.direction, -wallHalf);
    const end = m.position.clone().addScaledVector(m.direction, wallHalf);

    const overlapThreshold = PLATFORM_DEPTH * 0.02;
    const localX = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);

    const isCornerOverlap = (p: THREE.Vector3, plat: THREE.Mesh) => {
      if (plat.position.distanceTo(p) >= overlapThreshold) return false;
      const dir = localX.clone().applyAxisAngle(up, plat.rotation.y);
      return Math.abs(dir.dot(m.direction)) < 0.5;
    };

    const others = this.platforms.filter((p) => p !== object);
    const startHit = others.some((p) => isCornerOverlap(start, p));
    const endHit = others.some((p) => isCornerOverlap(end, p));

    let widthCM = m.widthM * 100 - (startHit ? PLATFORM_DEPTH : 0) - (endHit ? PLATFORM_DEPTH : 0);
    const offset = (endHit ? -1 : startHit ? 1 : 0) * (PLATFORM_DEPTH * 0.005);

    if (object.geometry instanceof THREE.BoxGeometry) {
      const g = object.geometry.parameters;
      if (Math.abs(g.width - widthCM) > 0.1) {
        object.geometry.dispose();
        object.geometry = new THREE.BoxGeometry(widthCM, PLATFORM_THICKNESS, PLATFORM_DEPTH);
      }
    }

    const wallDepthM =
      wall.geometry instanceof THREE.BoxGeometry ? wall.geometry.parameters.depth * 0.01 : 0.1;

    const finalPos = m.position
      .clone()
      .addScaledVector(m.direction, offset)
      .addScaledVector(wallNormal, wallDepthM / 2 + PLATFORM_DEPTH * 0.005);

    finalPos.y = PLATFORM_HEIGHT;
    object.position.copy(finalPos);

    const wallForward = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion);
    if (wallNormal.dot(wallForward) < 0) object.rotation.y += Math.PI;
  }

  private snapGenericObjectToWall(
    object: THREE.Mesh,
    hit: THREE.Intersection,
    wall: THREE.Mesh,
    wallNormal: THREE.Vector3
  ) {
    // GENERIC OBJECT
    const originalQuaternion = object.quaternion.clone();
    object.quaternion.set(0, 0, 0, 1);
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());

    object.quaternion.copy(originalQuaternion);
    object.updateMatrixWorld(true);

    // Keep the object's current world Y to prevent it from sinking or floating unexpectedly
    const worldTarget = hit.point.clone().addScaledVector(wallNormal, size.z / 2);
    const objectWorldPos = new THREE.Vector3();
    object.getWorldPosition(objectWorldPos);
    worldTarget.y = objectWorldPos.y;

    if (object.userData.type === OBJECT_TYPES.CUPBOARD) {
      worldTarget.y = Math.max(worldTarget.y, size.y / 2);
    }

    if (object.parent) {
      object.parent.worldToLocal(worldTarget);
    }
    object.position.copy(worldTarget);

    if (object.userData.type === OBJECT_TYPES.CUPBOARD) {
      this.snapCupboardToWallEdges(object, wall, size);
    }

    object.rotation.y = wall.rotation.y;
  }

  private snapCupboardToWallEdges(object: THREE.Mesh, wall: THREE.Mesh, size: THREE.Vector3) {
    // WALL EDGE SNAPPING
    const m = this.getSnapMetrics(wall);
    const EDGE_SNAP_THRESHOLD = 0.2;

    // Vector from wall center to cupboard position
    const toCupboard = object.position.clone().sub(m.position);
    // distance along wall direction
    let offsetAlongWall = toCupboard.dot(m.direction);

    const cupboardHalfWidth = size.x / 2;
    const wallHalfWidth = m.widthM / 2;

    // Check boundaries for "magnetic" stickiness to wall edges
    // 1. Cupboard Left edge near Wall Start
    if (Math.abs(offsetAlongWall - cupboardHalfWidth - -wallHalfWidth) < EDGE_SNAP_THRESHOLD) {
      offsetAlongWall = -wallHalfWidth + cupboardHalfWidth;
    }
    // 2. Cupboard Right edge near Wall End
    else if (Math.abs(offsetAlongWall + cupboardHalfWidth - wallHalfWidth) < EDGE_SNAP_THRESHOLD) {
      offsetAlongWall = wallHalfWidth - cupboardHalfWidth;
    }
    // 3. Cupboard Right edge near Wall Start (snapping outside)
    else if (Math.abs(offsetAlongWall + cupboardHalfWidth - -wallHalfWidth) < EDGE_SNAP_THRESHOLD) {
      offsetAlongWall = -wallHalfWidth - cupboardHalfWidth;
    }
    // 4. Cupboard Left edge near Wall End (snapping outside)
    else if (Math.abs(offsetAlongWall - cupboardHalfWidth - wallHalfWidth) < EDGE_SNAP_THRESHOLD) {
      offsetAlongWall = wallHalfWidth + cupboardHalfWidth;
    }

    // Adjust position along wall direction based on snapping
    const currentOffsetAlongWall = toCupboard.dot(m.direction);
    const delta = offsetAlongWall - currentOffsetAlongWall;
    object.position.addScaledVector(m.direction, delta);
  }

  private applyPlatformSnapping(object: THREE.Mesh, raycaster: THREE.Raycaster) {
    if (object.userData.type !== OBJECT_TYPES.SINK) return;

    const platforms = this.platforms;
    if (!platforms.length) return;

    // Raycast down from the sink's current position to find a platform
    const rayOrigin = object.position.clone();
    rayOrigin.y = PLATFORM_RAYCAST_HEIGHT; // Start high

    const hit = this.findSnapTarget(
      object,
      platforms,
      raycaster,
      rayOrigin,
      new THREE.Vector3(0, -1, 0)
    );

    if (!hit) {
      object.visible = false;
      return;
    }

    object.visible = true;
    const platform = hit.object as THREE.Mesh;
    const metrics = this.getSnapMetrics(platform);

    // 1. Match Rotation
    object.rotation.y = metrics.rotation;

    // 2. Restrict movement to Platform's local X-axis
    // Vector from platform center to sink intended position
    const toSink = object.position.clone().sub(metrics.position);

    // Project toSink onto platformDirection to get horizontal offset along platform
    const xOffset = toSink.dot(metrics.direction);

    // Clamp xOffset to platform width
    const clampedXOffset = Math.max(-metrics.widthM / 2, Math.min(metrics.widthM / 2, xOffset));

    // Calculate final position: Platform position + (platform direction * clamped offset)
    const finalPos = metrics.position.clone().add(metrics.direction.multiplyScalar(clampedXOffset));

    // 3. Snap Y to platform surface
    // Position sink center exactly at platform top surface + offset
    finalPos.y = metrics.topY + 0.2;

    object.position.copy(finalPos);
  }

  //object snapping to cupboard
  private applyCupboardSnapping(object: THREE.Mesh) {
    if (object.userData.type !== OBJECT_TYPES.CUPBOARD) return;

    const SNAP_THRESHOLD = 0.4;
    const ALIGN_THRESHOLD = 0.2;

    const current = this.getBoxData(object);

    for (const target of this.cupboards) {
      if (target === object || !target.visible) continue;

      const other = this.getBoxData(target);

      const overlapX = this.getOverlap(current.box, other.box, 'x');
      const overlapY = this.getOverlap(current.box, other.box, 'y');
      const overlapZ = this.getOverlap(current.box, other.box, 'z');

      let snapped = false;

      const trySnap = (axis: 'x' | 'y' | 'z', overlapA: number, overlapB: number) => {
        if (overlapA > -ALIGN_THRESHOLD && overlapB > -ALIGN_THRESHOLD) {
          const isBefore = current.center[axis] < other.center[axis];

          const gap = isBefore
            ? current.box.max[axis] - other.box.min[axis]
            : other.box.max[axis] - current.box.min[axis];

          if (gap > -SNAP_THRESHOLD && gap < current.size[axis] * 0.9) {
            object.position[axis] += isBefore ? -gap : gap;
            snapped = true;
          }
        }
      };

      // X snap
      trySnap('x', overlapZ, overlapY);
      if (snapped) {
        this.alignEdge(object, current.box, other.box, 'z', ALIGN_THRESHOLD);
        this.alignEdge(object, current.box, other.box, 'y', ALIGN_THRESHOLD);
      }

      // Z snap
      if (!snapped) {
        trySnap('z', overlapX, overlapY);
        if (snapped) {
          this.alignEdge(object, current.box, other.box, 'x', ALIGN_THRESHOLD);
          this.alignEdge(object, current.box, other.box, 'y', ALIGN_THRESHOLD);
        }
      }

      // Y snap (stacking)
      if (!snapped) {
        trySnap('y', overlapX, overlapZ);
        if (snapped) {
          this.alignEdge(object, current.box, other.box, 'x', ALIGN_THRESHOLD);
          this.alignEdge(object, current.box, other.box, 'z', ALIGN_THRESHOLD);
        }
      }

      if (snapped) {
        object.rotation.y = target.rotation.y;
        object.updateMatrixWorld(true);
        return;
      }
    }
  }
}
