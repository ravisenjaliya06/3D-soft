import { store } from '@/components/3dmodel/store';
import { updateShape } from '@/components/3dmodel/store/customDesignSlice';
import { updateObjectInRedux } from '@/components/3dmodel/utils/objectStoreUtils';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MoveHandlerOptions } from '../interface';

export class MoveHandler {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  public isDragging: boolean = false;
  private draggedObject: THREE.Object3D | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public movableObjects: THREE.Object3D[] = [];
  private gridBounds: MoveHandlerOptions['gridBounds'];
  private plane: THREE.Plane;
  private planeNormal: THREE.Vector3;
  private planePoint: THREE.Vector3;
  private dragOffset: THREE.Vector3;
  private initialClickPosition: THREE.Vector3;
  private objectUnderCursor: THREE.Mesh | null = null;
  private onObjectMovedCallback: ((object: THREE.Object3D) => void) | null =
    null;
  private controls: OrbitControls;
  private originalPosition: THREE.Vector3 | null = null;
  private originalRotation: THREE.Euler | null = null;
  private originalScale: THREE.Vector3 | null = null;

  constructor(options: MoveHandlerOptions) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.movableObjects = options.movableObjects;
    this.controls = options.controls;
    this.gridBounds = options.gridBounds || {
      minX: -1000,
      maxX: 1000,
      minY: 0,
      maxY: 1000,
      minZ: -1000,
      maxZ: 1000,
    };
    this.dragOffset = new THREE.Vector3();
    this.initialClickPosition = new THREE.Vector3();

    // Create a plane for raycasting (we'll use the XZ plane at the object's Y position)
    this.planeNormal = new THREE.Vector3(0, 1, 0); // Normal for XZ plane
    this.planePoint = new THREE.Vector3(0, 0, 0); // Will be updated with object's Y position
    this.plane = new THREE.Plane(this.planeNormal, 0);

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // Add event listeners
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  private getMousePositionOnPlane(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.draggedObject) {
      this.planePoint.copy(this.draggedObject.position);
      this.plane.setFromNormalAndCoplanarPoint(
        this.planeNormal,
        this.planePoint,
      );
    }

    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.plane, intersection)) {
      if (!this.isDragging) {
        this.initialClickPosition.copy(intersection);
        if (this.draggedObject) {
          this.dragOffset.copy(this.draggedObject.position).sub(intersection);
        }
      }
      return intersection;
    }
    return null;
  }

  private onMouseDown(event: MouseEvent) {
    const mousePosition = this.getMousePositionOnPlane(event);
    if (!mousePosition) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.movableObjects,
      true,
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      this.startDragging(clickedObject);
      if (this.controls) {
        this.controls.enabled = false;
      }
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging || !this.draggedObject) return;

    const mousePosition = this.getMousePositionOnPlane(event);
    if (!mousePosition) return;

    // Update object position to follow cursor
    const newPosition = mousePosition.add(this.dragOffset);
    const clampedPosition = this.clampToGrid(newPosition);

    this.draggedObject.position.copy(clampedPosition);

    // Update Redux store with new position
    if (this.draggedObject.userData.id) {
      store.dispatch(
        updateShape({
          id: this.draggedObject.userData.id,
          updates: {
            position: {
              x: clampedPosition.x,
              y: clampedPosition.y,
              z: clampedPosition.z,
            },
          },
        }),
      );
    }
  }

  private onMouseUp() {
    if (this.isDragging && this.draggedObject) {
      if (this.onObjectMovedCallback) {
        this.onObjectMovedCallback(this.draggedObject);
      }
      if (
        this.draggedObject instanceof THREE.Mesh &&
        this.originalPosition &&
        this.originalRotation &&
        this.originalScale
      ) {
        if (!this.originalPosition.equals(this.draggedObject.position)) {
          updateObjectInRedux(
            this.draggedObject,
            this.originalPosition,
            this.originalRotation,
            this.originalScale,
          );
        }
      }

      // Reset state
      this.isDragging = false;
      this.draggedObject = null;
      this.originalPosition = null;
      this.originalRotation = null;
      this.originalScale = null;

      if (this.controls) {
        this.controls.enabled = true;
      }
    }
  }

  private clampToGrid(position: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.max(
        this.gridBounds?.minX ?? -10,
        Math.min(this.gridBounds?.maxX ?? 10, position.x),
      ),
      this.draggedObject?.position.y ?? 0,
      Math.max(
        this.gridBounds?.minZ ?? -10,
        Math.min(this.gridBounds?.maxZ ?? 10, position.z),
      ),
    );
  }

  public startDragging(object: THREE.Object3D): void {
    this.isDragging = true;
    this.draggedObject =
      object.parent instanceof THREE.Scene ? object : object.parent;

    this.originalPosition = object.position.clone();
    this.originalRotation = object.rotation.clone();
    this.originalScale = object.scale.clone();

    // Store initial offset between mouse and object
    const mousePosition = this.getMousePositionOnPlane(
      new MouseEvent('mousemove'),
    );
    if (mousePosition) {
      this.dragOffset.copy(object.position).sub(mousePosition);
    }
  }

  public cleanup(): void {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
  }

  public setMovableObjects(objects: THREE.Object3D[]) {
    this.movableObjects = objects;
  }

  public getDraggedObject(): THREE.Object3D | null {
    return this.draggedObject;
  }

  public setOnObjectMoved(callback: (object: THREE.Object3D) => void): void {
    this.onObjectMovedCallback = callback;
  }

  public deactivate(): void {
    this.cleanup();
  }
}
