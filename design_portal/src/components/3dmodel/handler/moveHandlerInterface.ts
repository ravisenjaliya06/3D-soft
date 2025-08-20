import * as THREE from 'three';

export interface MoveHandler {
  startDragging(object: THREE.Object3D): Promise<THREE.Vector3 | null>;
  disableDragging(): void;
  enableDragging(object: THREE.Object3D): Promise<THREE.Vector3 | null>;
  removeMovableObject(object: THREE.Object3D): void;
  getDraggedObjectPosition(): THREE.Vector3 | null;
  getObjectPosition(objectId: string): THREE.Vector3 | null;
  isDragging?: boolean;
  movableObjects: THREE.Object3D[];
}
