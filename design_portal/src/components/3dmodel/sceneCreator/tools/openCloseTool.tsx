import gsap from 'gsap';
import * as THREE from 'three';
import { DIRECTION_TYPES } from '../interface';

export class CabinetMotionController {
  private ANIM_DURATION = 1;
  private child: THREE.Mesh | null = null;
  private type: string = '';
  private static globalOpenState: boolean = false;

  constructor() {}

  private _getBoundingBox() {
    this.child?.geometry.computeBoundingBox();
    return this.child?.geometry.boundingBox;
  }

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

  private _getRotation(): THREE.Vector3 {
    const isClosed = this.child?.userData.isClosed ?? true;
    const rotation = { x: 0, y: 0, z: 0 };

    switch (this.type) {
      case DIRECTION_TYPES.LEFT:
        rotation.y = isClosed ? 0 : -Math.PI / 2.5;
        break;

      case DIRECTION_TYPES.RIGHT:
        rotation.y = isClosed ? 0 : Math.PI / 2.5;
        break;

      case DIRECTION_TYPES.TOP:
        rotation.x = isClosed ? 0 : -Math.PI / 3;
        break;

      case DIRECTION_TYPES.BOTTOM:
        rotation.x = isClosed ? 0 : Math.PI / 3;
        break;
    }

    return new THREE.Vector3(rotation.x, rotation.y, rotation.z);
  }

  private _createGSAP(targetToChange: THREE.Vector3 | THREE.Euler, target: THREE.Vector3) {
    gsap.to(targetToChange, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: this.ANIM_DURATION,
      ease: 'power2.inOut',
    });
  }

  public static toggleGlobalState(): void {
    CabinetMotionController.globalOpenState = !CabinetMotionController.globalOpenState;
  }

  public static getGlobalState(): boolean {
    return CabinetMotionController.globalOpenState;
  }

  // Reset global state to default (closed)
  public static resetGlobalState(): void {
    CabinetMotionController.globalOpenState = false;
  }

  public toggleDoorIndividual(child: THREE.Mesh) {
    if (!child) return;
    this.child = child;
    this.type = child.userData.openDirection;
    const isClosed = child.userData.isClosed ?? true;
    this._ensurePivotWrapper();
    child.userData.isClosed = !isClosed;
    const pivotGroup = child.parent;
    if (pivotGroup?.userData.isPivotGroup) {
      this._createGSAP(pivotGroup.rotation, this._getRotation());
    }
  }

  public toggleDoor(child: THREE.Mesh, shouldToggleGlobal: boolean = false) {
    if (!child) return;

    if (shouldToggleGlobal) {
      CabinetMotionController.toggleGlobalState();
    }

    this.child = child;
    this.type = child.userData.openDirection;

    const currentIsClosed = child.userData.isClosed ?? true;
    const globalOpenState = CabinetMotionController.globalOpenState;
    if (globalOpenState) {
      if (currentIsClosed) {
        child.userData.isClosed = false;
      } else {
        return;
      }
    } else {
      if (!currentIsClosed) {
        child.userData.isClosed = true;
      } else {
        return;
      }
    }

    this._ensurePivotWrapper();

    const pivotGroup = child.parent;
    if (pivotGroup?.userData.isPivotGroup) {
      this._createGSAP(pivotGroup.rotation, this._getRotation());
    }
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

  // Toggle drawer individually (for sidebar - doesn't affect global state)
  public toggleDrawerIndividual(mesh: THREE.Mesh, openDistanceMM = 250) {
    if (!mesh) return;

    const isClosed = mesh.userData.isClosed ?? true;

    if (mesh.userData.closedZ === undefined) {
      mesh.userData.closedZ = mesh.position.z;
    }

    const parentScaleZ = mesh.parent?.scale.z ?? 1;
    const openDistance = openDistanceMM / 1000 / parentScaleZ;
    const closedZ = mesh.userData.closedZ;
    const openZ = closedZ + openDistance;
    mesh.userData.isClosed = !isClosed;

    gsap.to(mesh.position, {
      z: mesh.userData.isClosed ? closedZ : openZ,
      duration: this.ANIM_DURATION,
      ease: 'power2.inOut',
    });
  }

  // Toggle drawer slide animation based on global state (for header)
  public toggleDrawer(mesh: THREE.Mesh, shouldToggleGlobal: boolean = false, openDistanceMM = 250) {
    if (!mesh) return;

    if (shouldToggleGlobal) {
      CabinetMotionController.toggleGlobalState();
    }

    const currentIsClosed = mesh.userData.isClosed ?? true;
    const globalOpenState = CabinetMotionController.globalOpenState;
    if (globalOpenState) {
      if (currentIsClosed) {
        mesh.userData.isClosed = false;
      } else {
        return;
      }
    } else {
      if (!currentIsClosed) {
        mesh.userData.isClosed = true;
      } else {
        return;
      }
    }

    if (mesh.userData.closedZ === undefined) {
      mesh.userData.closedZ = mesh.position.z;
    }

    const parentScaleZ = mesh.parent?.scale.z ?? 1;
    const openDistance = openDistanceMM / 1000 / parentScaleZ;
    const closedZ = mesh.userData.closedZ;
    const openZ = closedZ + openDistance;

    gsap.to(mesh.position, {
      z: mesh.userData.isClosed ? closedZ : openZ,
      duration: this.ANIM_DURATION,
      ease: 'power2.inOut',
    });
  }
}
