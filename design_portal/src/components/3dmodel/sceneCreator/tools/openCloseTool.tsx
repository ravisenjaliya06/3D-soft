import gsap from 'gsap';
import * as THREE from 'three';
import { DIRECTION_TYPES } from '../interface';

export class CabinetMotionController {
  private ANIM_DURATION = 1;
  private child: THREE.Mesh | null = null;
  private type: string = '';

  constructor() {}

  // Get bounding box of door mesh
  private _getBoundingBox() {
    this.child?.geometry.computeBoundingBox();
    return this.child?.geometry.boundingBox;
  }

  // Calculate hinge position based on opening direction
  private _getPivotOffset() {
    const bbox = this._getBoundingBox();
    if (!bbox) return;

    let pivotOffsetX = 0;
    let pivotOffsetY = 0;

    switch (this.type) {
      case DIRECTION_TYPES.LEFT:
        pivotOffsetX = bbox.min.x;
        pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
        break;

      case DIRECTION_TYPES.RIGHT:
        pivotOffsetX = bbox.max.x;
        pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
        break;

      case DIRECTION_TYPES.TOP:
        pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
        pivotOffsetY = bbox.max.y;
        break;

      case DIRECTION_TYPES.BOTTOM:
        pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
        pivotOffsetY = bbox.min.y;
        break;
    }

    return { pivotOffsetX, pivotOffsetY };
  }

  // Get door rotation for open / close state
  private _getRotation(): THREE.Vector3 {
    const isClosed = this.child?.userData.isClosed ?? true;
    const rotation = { x: 0, y: 0, z: 0 };

    switch (this.type) {
      case DIRECTION_TYPES.LEFT:
        rotation.y = isClosed ? -Math.PI / 2.5 : 0;
        break;

      case DIRECTION_TYPES.RIGHT:
        rotation.y = isClosed ? Math.PI / 2.5 : 0;
        break;

      case DIRECTION_TYPES.TOP:
        rotation.x = isClosed ? -Math.PI / 3 : 0;
        break;

      case DIRECTION_TYPES.BOTTOM:
        rotation.x = isClosed ? Math.PI / 3 : 0;
        break;
    }

    return new THREE.Vector3(rotation.x, rotation.y, rotation.z);
  }

  // Animate vector or rotation using GSAP
  private _createGSAP(targetToChange: THREE.Vector3 | THREE.Euler, target: THREE.Vector3) {
    gsap.to(targetToChange, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: this.ANIM_DURATION,
      ease: 'power2.inOut',
    });
  }

  // Toggle door open or close
  public toggleDoor(child: THREE.Mesh) {
    if (!child) return;

    this.child = child;
    this.type = child.userData.openDirection;

    const isClosed = child.userData.isClosed ?? true;

    // Make sure pivot group exists
    this._ensurePivotWrapper();

    // Rotate pivot group instead of mesh
    const pivotGroup = child.parent;
    if (pivotGroup?.userData.isPivotGroup) {
      this._createGSAP(pivotGroup.rotation, this._getRotation());
    }

    child.userData.isClosed = !isClosed;
  }

  // Ensure door is wrapped in correct pivot group
  private _ensurePivotWrapper() {
    if (!this.child) return;

    const parent = this.child.parent;

    if (parent?.userData.isPivotGroup) {
      if (parent.userData.pivotDirection === this.type) return;
      this._unwrapPivot();
    }

    this._wrapInPivot();
  }

  // Remove existing pivot group
  private _unwrapPivot() {
    if (!this.child) return;

    const pivotGroup = this.child.parent;
    if (pivotGroup?.userData.isPivotGroup && pivotGroup.parent) {
      pivotGroup.parent.attach(this.child);
      pivotGroup.parent.remove(pivotGroup);
    }
  }

  // Create pivot group at hinge position
  private _wrapInPivot() {
    if (!this.child) return;

    const { pivotOffsetX, pivotOffsetY } = this._getPivotOffset() ?? {
      pivotOffsetX: 0,
      pivotOffsetY: 0,
    };

    const pivotGroup = new THREE.Group();
    pivotGroup.name = 'DoorPivotGroup';
    pivotGroup.userData.isPivotGroup = true;
    pivotGroup.userData.pivotDirection = this.type;

    // Convert hinge position to world space
    const worldHinge = new THREE.Vector3(pivotOffsetX, pivotOffsetY, 0).applyMatrix4(
      this.child.matrixWorld
    );

    const originalParent = this.child.parent;
    if (!originalParent) return;

    // Position pivot at hinge
    pivotGroup.position.copy(worldHinge);
    pivotGroup.quaternion.copy(this.child.getWorldQuaternion(new THREE.Quaternion()));

    // Attach pivot and then door
    originalParent.attach(pivotGroup);
    pivotGroup.attach(this.child);
  }

  // Toggle drawer slide animation
  public toggleDrawer(mesh: THREE.Mesh, openDistance = 0.25) {
    if (!mesh) return;

    const isClosed = mesh.userData.isClosed ?? true;

    // Store closed position once
    if (!mesh.userData.closedPos) {
      mesh.userData.closedPos = mesh.getWorldPosition(new THREE.Vector3());
    }

    const closedPos = mesh.userData.closedPos.clone();

    // Calculate drawer open direction
    const openDir = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    const openPos = closedPos.clone().add(openDir.multiplyScalar(openDistance));
    const targetWorld = isClosed ? openPos : closedPos;

    // Convert world position to local
    const targetLocal = mesh.parent ? mesh.parent.worldToLocal(targetWorld.clone()) : targetWorld;

    this._createGSAP(mesh.position, targetLocal);
    mesh.userData.isClosed = !isClosed;
  }
}
