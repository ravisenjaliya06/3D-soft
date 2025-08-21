import * as THREE from 'three';
import { store } from '../store';
import { objectName } from './constant';
import { MoveHandlerOptions } from './interface';
import { MoveHandler as IMoveHandler } from './moveHandlerInterface';

export class MoveHandler implements IMoveHandler {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  isDragging: boolean = false;
  private draggedObject: THREE.Object3D | THREE.Mesh | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public movableObjects: THREE.Object3D[];
  private gridBounds: MoveHandlerOptions['gridBounds'];
  private plane: THREE.Plane;
  private planeNormal: THREE.Vector3;
  private planePoint: THREE.Vector3;
  private dragOffset: THREE.Vector3;
  private initialClickPosition: THREE.Vector3;
  private objectUnderCursor: THREE.Mesh | null = null;
  private hoveredParent: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.Material | THREE.Material[],
    THREE.Object3DEventMap
  > | null = null;

  constructor(options: MoveHandlerOptions) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.movableObjects = options.movableObjects;
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
  }

  private getMousePositionOnPlane = (
    event: MouseEvent,
  ): THREE.Vector3 | null => {
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
  };

  private clampToGrid = (position: THREE.Vector3): THREE.Vector3 => {
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
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging || !this.draggedObject) return;
    let clampedPosition;
    const position = this.getMousePositionOnPlane(event);

    if (position) {
      clampedPosition = this.clampToGrid(position);
      this.draggedObject.position.copy(clampedPosition);
    }
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (
      this.draggedObject.name === objectName.HORIZONTAL_PLANK ||
      this.draggedObject.name === objectName.VERTICAL_PLANK ||
      this.draggedObject.name.includes('DOOR') ||
      this.draggedObject.name.includes('DRAWER') ||
      this.draggedObject.name.includes('DOOR')
    ) {
      this.objectUnderCursor = null;
      const targetObject = store.getState().data.hoverdMesh;
      this.hoveredParent = targetObject;

      if (targetObject) {
        const worldPoint = targetObject.getWorldPosition(new THREE.Vector3());

        const boundingBox = new THREE.Box3().setFromObject(targetObject);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        const plankWidth = (targetObject.geometry as THREE.BoxGeometry)
          .parameters.width;
        const plankHeight = (targetObject.geometry as THREE.BoxGeometry)
          .parameters.height;
        const plankDepth = (targetObject.geometry as THREE.BoxGeometry)
          .parameters.depth;
        (this.draggedObject as THREE.Mesh).geometry.dispose();
        if (this.draggedObject.name === objectName.HORIZONTAL_PLANK) {
          (this.draggedObject as THREE.Mesh).geometry = new THREE.BoxGeometry(
            plankWidth + 1,
            2,
            plankDepth - 1.5,
          );
        } else if (this.draggedObject.name.includes('DRAWER')) {
          this.draggedObject.children.forEach((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.geometry instanceof THREE.BoxGeometry
            ) {
              if (child.name.includes('LEFT') || child.name.includes('RIGHT')) {
                child.geometry = new THREE.BoxGeometry(
                  2,
                  child.geometry.parameters.height,
                  plankDepth - 2,
                );
                child.position.x = child.name.includes('LEFT')
                  ? -plankWidth / 2
                  : plankWidth / 2;
                child.position.y = child.position.z - 0.5;
              } else if (
                child.name.includes('BACK') ||
                child.name.includes('FRONT')
              ) {
                child.geometry = new THREE.BoxGeometry(
                  plankWidth + 2,
                  child.geometry.parameters.height,
                  2,
                );
                child.position.y = child.name.includes('BACK')
                  ? child.position.x - 0.5
                  : child.position.y;
                child.position.z = child.name.includes('BACK')
                  ? -plankDepth / 2 + 0.5
                  : plankDepth / 2;
              } else if (child.name.includes('BOTTOM')) {
                child.geometry = new THREE.BoxGeometry(
                  plankWidth - 2,
                  child.geometry.parameters.height,
                  plankDepth - 2,
                );
              }
            }
          });
        } else if (this.draggedObject.name.includes('DOOR')) {
          const doorWidth = plankWidth / 2;
          const doorHeight = plankHeight;
          const doorDepth = 2;

          const leftDoor =
            this.draggedObject.children[0] instanceof THREE.Mesh
              ? this.draggedObject.children[0]
              : new THREE.Mesh();
          leftDoor.geometry = new THREE.BoxGeometry(
            doorWidth,
            doorHeight,
            doorDepth,
          );
          leftDoor.position.set(-doorWidth / 2, 0, plankDepth / 2 - 1.5);

          const rightDoor =
            this.draggedObject.children[1] instanceof THREE.Mesh
              ? this.draggedObject.children[1]
              : new THREE.Mesh();
          rightDoor.geometry = new THREE.BoxGeometry(
            doorWidth,
            doorHeight,
            doorDepth,
          );
          rightDoor.position.set(doorWidth / 2, 0, plankDepth / 2 - 1.5);
        } else {
          (this.draggedObject as THREE.Mesh).geometry = new THREE.BoxGeometry(
            2,
            plankHeight + 1,
            plankDepth - 1.5,
          );
        }

        this.draggedObject.scale.set(1, 1, 1);
        if (this.draggedObject.parent !== targetObject) {
          targetObject.add(this.draggedObject);
        }

        if (this.draggedObject.name === objectName.HORIZONTAL_PLANK) {
          this.draggedObject.position.copy(worldPoint);
        } else if (this.draggedObject.name === objectName.VERTICAL_PLANK) {
          this.draggedObject.position.copy(worldPoint);
        } else if (this.draggedObject.name.includes('DOOR')) {
          (this.draggedObject as THREE.Mesh).geometry = new THREE.BoxGeometry(
            plankWidth,
            plankHeight,
            2,
          );
          this.draggedObject.position.z =
            (targetObject.geometry as THREE.BoxGeometry).parameters.depth / 2;
          if (this.draggedObject.parent !== targetObject) {
            targetObject.add(this.draggedObject);
          }
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
  };
  private onMouseDown = () => {
    if (this.draggedObject) {
      this.isDragging = true;
    }
  };

  private onMouseUp = (): THREE.Vector3 | null => {
    if (this.draggedObject) {
      const finalPosition = this.draggedObject.position.clone();
      this.isDragging = false;
      this.draggedObject = null;
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
      localStorage.removeItem('clicked_point');
      return finalPosition;
    }

    return null;
  };

  private onDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    this.cleanupEventListeners();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.raycaster.params.Points.threshold = 0.1;
    this.raycaster.params.Line.threshold = 0.1;

    const intersects = this.raycaster.intersectObjects(
      this.movableObjects,
      true,
    );

    if (intersects.length > 0) {
      let targetObject = intersects[0].object;
      let depth = 0;
      const maxDepth = 10;

      while (
        targetObject &&
        !targetObject.userData.object_id &&
        depth < maxDepth
      ) {
        targetObject = targetObject.parent ?? targetObject;
        depth++;
      }

      if (
        targetObject &&
        targetObject.userData.object_id &&
        targetObject.name !== 'grid'
      ) {
        this.draggedObject = targetObject;
        const position = this.getMousePositionOnPlane(event);
        if (position) {
          this.initialClickPosition.copy(position);
          this.dragOffset.copy(targetObject.position).sub(position);
        }
        this.isDragging = true;
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
      }
    }
  };

  private cleanupEventListeners() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('dblclick', this.onDoubleClick);
  }

  public enableDragging(object: THREE.Object3D): Promise<THREE.Vector3 | null> {
    this.cleanupEventListeners(); // Clean up any previous listeners
    this.isDragging = false; // Reset dragging state
    this.draggedObject = null; // Clear dragged object

    if (!this.movableObjects.includes(object)) {
      this.movableObjects.push(object); // Add object to movable list
    }

    this.draggedObject = object; // Set the current object to drag
    this.isDragging = true; // Indicate dragging is active

    return new Promise((resolve) => {
      // Define event handlers
      const onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
      const onMouseDownHandler = () => this.onMouseDown();
      const onDoubleClickHandler = (event: MouseEvent) =>
        this.onDoubleClick(event);
      const onMouseUpHandler = () => {
        const finalPosition = this.onMouseUp(); // Get final position
        this.isDragging = false; // Reset state
        this.draggedObject = null; // Clear dragged object
        cleanup(); // Remove listeners
        resolve(finalPosition); // Resolve with final position
      };

      const onKeyDownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();

          this.isDragging = false;
          this.draggedObject = null;
          cleanup();
          resolve(null);
        }
      };

      // Add event listeners
      window.addEventListener('mousemove', onMouseMoveHandler);
      window.addEventListener('mousedown', onMouseDownHandler);
      window.addEventListener('mouseup', onMouseUpHandler, { once: true }); // Auto-remove after firing
      window.addEventListener('dblclick', onDoubleClickHandler);
      window.addEventListener('keydown', onKeyDownHandler, { capture: true });

      // Cleanup function to remove all listeners
      const cleanup = () => {
        window.removeEventListener('mousemove', onMouseMoveHandler);
        window.removeEventListener('mousedown', onMouseDownHandler);
        window.removeEventListener('mouseup', onMouseUpHandler);
        window.removeEventListener('dblclick', onDoubleClickHandler);
        window.removeEventListener('keydown', onKeyDownHandler, {
          capture: true,
        });
      };
    });
  }

  public disableDragging() {
    this.isDragging = false;
    this.draggedObject = null;
    this.cleanupEventListeners();
  }

  public removeMovableObject(object: THREE.Object3D) {
    const index = this.movableObjects.indexOf(object);
    if (index > -1) {
      this.movableObjects.splice(index, 1);
    }
    if (this.draggedObject === object) {
      this.disableDragging();
    }
  }

  public getDraggedObjectPosition(): THREE.Vector3 | null {
    if (this.draggedObject) {
      return this.draggedObject.position.clone();
    }
    return null;
  }

  public getObjectPosition(objectId: string): THREE.Vector3 | null {
    const targetObject = this.movableObjects.find(
      (obj) => obj.userData.object_id === objectId,
    );
    if (targetObject) {
      return targetObject.position.clone();
    }
    return null;
  }

  public startDragging(object: THREE.Object3D): Promise<THREE.Vector3 | null> {
    return this.enableDragging(object);
  }
}
