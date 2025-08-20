import * as THREE from 'three';

interface MoveHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  movableObjects: THREE.Object3D[];
  gridBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export class MoveHandler {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private draggedObject: THREE.Object3D | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private movableObjects: THREE.Object3D[];
  private gridBounds: MoveHandlerOptions['gridBounds'];

  constructor(options: MoveHandlerOptions) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.movableObjects = options.movableObjects;
    this.gridBounds = options.gridBounds || {
      minX: -10,
      maxX: 10,
      minY: -1,
      maxY: 10,
      minZ: 0,
      maxZ: 0,
    };
  }

  private getMousePositionIn3D = (event: MouseEvent): THREE.Vector3 | null => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.movableObjects,
      true,
    );
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  };

  private clampToGrid = (position: THREE.Vector3): THREE.Vector3 => {
    return new THREE.Vector3(
      Math.max(
        this.gridBounds?.minX ?? -10,
        Math.min(this.gridBounds?.maxX ?? 10, position.x),
      ),
      Math.max(
        this.gridBounds?.minY ?? -10,
        Math.min(this.gridBounds?.maxY ?? 10, position.y),
      ),
      Math.max(
        this.gridBounds?.minZ ?? 0,
        Math.min(this.gridBounds?.maxZ ?? 0, position.z),
      ),
    );
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.isDragging && this.draggedObject) {
      const position = this.getMousePositionIn3D(event);
      if (position) {
        const clampedPosition = this.clampToGrid(position);
        this.draggedObject.position.copy(clampedPosition);
      }
    }
  };

  private onMouseDown = () => {
    if (this.draggedObject) {
      this.isDragging = true;
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.draggedObject = null;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  };

  private onDoubleClick = (event: MouseEvent) => {
    event.preventDefault();

    // Clear existing event listeners first to prevent duplicates
    this.cleanupEventListeners();

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.movableObjects, // Change from scene.children to movableObjects for better performance
      true,
    );

    if (intersects.length > 0) {
      let targetObject = intersects[0].object;
      // Add maximum depth check to prevent infinite loops
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

  public enableDragging(object: THREE.Object3D) {
    // Cleanup existing listeners first
    this.cleanupEventListeners();

    // Reset state
    this.isDragging = false;
    this.draggedObject = null;

    // Add object to movable objects if not already present
    if (!this.movableObjects.includes(object)) {
      this.movableObjects.push(object);
    }

    // Set up new dragging state
    this.draggedObject = object;
    this.isDragging = true;

    // Add event listeners
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);

    addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('dblclick', this.onDoubleClick);
  }

  public disableDragging() {
    // Reset state
    this.isDragging = false;
    this.draggedObject = null;

    // Clean up all event listeners
    this.cleanupEventListeners();
  }

  // Add a method to remove an object from movable objects
  public removeMovableObject(object: THREE.Object3D) {
    const index = this.movableObjects.indexOf(object);
    if (index > -1) {
      this.movableObjects.splice(index, 1);
    }
    if (this.draggedObject === object) {
      this.disableDragging();
    }
  }

  // Get position of the currently dragged object
  public getDraggedObjectPosition(): THREE.Vector3 | null {
    if (this.draggedObject) {
      return this.draggedObject.position.clone();
    }
    return null;
  }

  // Get position of any movable object by its object_id
  public getObjectPosition(objectId: string): THREE.Vector3 | null {
    const targetObject = this.movableObjects.find(
      (obj) => obj.userData.object_id === objectId,
    );
    if (targetObject) {
      return targetObject.position.clone();
    }
    return null;
  }
}
