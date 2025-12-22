import gsap from 'gsap';
import * as THREE from 'three';
import { DIRECTION_TYPES } from '../interface';

export class CabinetMotionController {
  private ANIM_DURATION = 1;
  private child: THREE.Mesh | null = null;
  private type: string = '';

  constructor() {}

  private _getBoundingBox() {
    this.child?.geometry.computeBoundingBox();
    const bbox = this.child?.geometry.boundingBox;
    return bbox;
  }

  private _getPivotOffset() {
    const bbox = this._getBoundingBox();
    if (!bbox) {
      console.error('Bounding Box is Null');
      return;
    }

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
    const targetRotation = { x: 0, y: 0, z: 0 };

    switch (this.type) {
      case DIRECTION_TYPES.LEFT:
        targetRotation.y = isClosed ? -Math.PI / 2.5 : 0;
        break;
      case DIRECTION_TYPES.RIGHT:
        targetRotation.y = isClosed ? Math.PI / 2.5 : 0;
        break;
      case DIRECTION_TYPES.TOP:
        targetRotation.x = isClosed ? -Math.PI / 3 : 0;
        break;
      case DIRECTION_TYPES.BOTTOM:
        targetRotation.x = isClosed ? Math.PI / 3 : 0;
        break;
    }

    return new THREE.Vector3(targetRotation.x, targetRotation.y, targetRotation.z);
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

  public toggleDoor(child: THREE.Mesh) {
    if (!child) return;
    this.child = child;
    this.type = this.child.userData.openDirection;
    const isClosed = this.child.userData.isClosed ?? true;

    const { pivotOffsetX, pivotOffsetY } = this._getPivotOffset() || {
      pivotOffsetX: 0,
      pivotOffsetY: 0,
    };
    this.child.geometry.translate(-pivotOffsetX, -pivotOffsetY, 0);
    this.child.position.x += pivotOffsetX;
    this.child.position.y += pivotOffsetY;

    const targetRotation = this._getRotation();
    this._createGSAP(this.child.rotation, targetRotation);

    this.child.userData.isClosed = !isClosed;
  }

  public toggleDrawer(mesh: THREE.Mesh, openDistance = 0.25) {
    if (!mesh) return;

    const isClosed = mesh.userData.isClosed ?? true;

    if (!mesh.userData.closedPos) {
      mesh.userData.closedPos = mesh.getWorldPosition(new THREE.Vector3());
    }

    const closedWorldPos = mesh.userData.closedPos.clone();
    const localOpenDir = new THREE.Vector3(0, 0, 1);
    const worldOpenDir = localOpenDir
      .clone()
      .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const openWorldPos = closedWorldPos.clone().add(worldOpenDir.multiplyScalar(openDistance));
    const targetWorld = isClosed ? openWorldPos : closedWorldPos;

    const parent = mesh.parent;
    let targetLocal = targetWorld.clone();

    if (parent) {
      parent.worldToLocal(targetLocal);
    }

    this._createGSAP(mesh.position, targetLocal);

    mesh.userData.isClosed = !isClosed;
  }
}
