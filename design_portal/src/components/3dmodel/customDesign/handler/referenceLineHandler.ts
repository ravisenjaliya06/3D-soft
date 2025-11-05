import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HandlerOptions } from '../interface';

export class ReferenceLineHandler {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private isActive: boolean = false;
  private firstPoint: THREE.Vector3 | null = null;
  private secondPoint: THREE.Vector3 | null = null;
  private currentPoint: THREE.Mesh | null = null;
  private currentLine: THREE.Line | null = null;
  private referenceLines: THREE.Line[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private snapThreshold: number = 0.1; // Distance threshold for snapping
  private lineMaterial: THREE.LineDashedMaterial;
  private tempLineMaterial: THREE.LineDashedMaterial;
  private sceneSize: number = 1000; // Large value to ensure line extends beyond scene bounds
  private selectionState: 'first' | 'second' | 'drawing' = 'first';
  private hoveredPoint: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;
  private lastPoint: THREE.Vector3 | null = null;
  private targetPoint: THREE.Vector3 | null = null;
  private animationSpeed: number = 0.1; // Speed of smooth movement
  private startMarker: THREE.Mesh | null = null;

  constructor(options: HandlerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.controls = options.controls;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Create materials for reference lines
    this.lineMaterial = new THREE.LineDashedMaterial({
      color: 0x000000, // Black color
      dashSize: 0.1, // Smaller dash size
      gapSize: 0.1, // Smaller gap size
      linewidth: 1, // Thinner line
    });

    this.tempLineMaterial = new THREE.LineDashedMaterial({
      color: 0x000000, // Black color
      linewidth: 1, // Thinner line
      transparent: true,
      opacity: 0.5,
    });
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.controls.enabled = false;
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = 'crosshair';
    this.selectionState = 'first';
    this.startAnimation();
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.controls.enabled = true;
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = 'default';
    this.stopAnimation();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.currentLine) {
      this.scene.remove(this.currentLine);
      this.currentLine = null;
    }
    if (this.currentPoint) {
      this.scene.remove(this.currentPoint);
      this.currentPoint = null;
    }
    if (this.startMarker) {
      this.scene.remove(this.startMarker);
      this.startMarker = null;
    }
    this.firstPoint = null;
    this.secondPoint = null;
    this.lastPoint = null;
    this.targetPoint = null;
    this.selectionState = 'first';
  }

  private startAnimation(): void {
    const animate = () => {
      if (this.isActive) {
        this.updateAnimation();
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateAnimation(): void {
    if (this.targetPoint && this.lastPoint) {
      // Smoothly interpolate between last point and target point
      this.lastPoint.lerp(this.targetPoint, this.animationSpeed);

      if (this.selectionState === 'first') {
        this.updateTemporaryPoint(this.lastPoint);
      } else if (this.selectionState === 'second' && this.firstPoint) {
        this.updateTemporaryLine(this.firstPoint, this.lastPoint);
      }
    }
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.isActive) return;

    const point = this.getPointFromMouse(event);
    if (!point) return;

    if (this.selectionState === 'first') {
      this.firstPoint = point.clone();
      this.selectionState = 'second';

      // Create start marker
      const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.9,
      });
      this.startMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      this.startMarker.position.copy(this.firstPoint);
      this.startMarker.name = 'reference_start_marker';
      this.scene.add(this.startMarker);

      if (this.currentPoint) {
        this.scene.remove(this.currentPoint);
        this.currentPoint = null;
      }
    } else if (this.selectionState === 'second') {
      this.secondPoint = point.clone();
      this.selectionState = 'drawing';
      if (this.currentPoint) {
        this.scene.remove(this.currentPoint);
        this.currentPoint = null;
      }
      this.createReferenceLine();
      this.cleanup();
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isActive) return;

    const point = this.getPointFromMouse(event);
    if (!point) return;

    // Update target point for smooth animation
    this.targetPoint = point;

    // Initialize last point if not set
    if (!this.lastPoint) {
      this.lastPoint = point.clone();
    }

    // Update hover effect
    if (this.hoveredPoint) {
      (this.hoveredPoint.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
      this.hoveredPoint = null;
    }

    // Check if we're hovering over an existing point
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    for (const intersect of intersects) {
      if (intersect.object.userData.isReferencePoint) {
        this.hoveredPoint = intersect.object as THREE.Mesh;
        (this.hoveredPoint.material as THREE.MeshBasicMaterial).color.setHex(0x0000ff);
        document.body.style.cursor = 'pointer';
        return;
      }
    }

    document.body.style.cursor = 'crosshair';
  };

  private onMouseUp = (): void => {
    // Mouse up is handled in onMouseDown
  };

  private getPointFromMouse(event: MouseEvent): THREE.Vector3 | null {
    const intersects = this.getIntersects(event);
    let point: THREE.Vector3;

    if (intersects.length > 0) {
      // If we clicked on an object, snap to its vertex
      point = this.findNearestVertex(intersects[0].point, intersects[0].object);
    } else {
      // If we clicked in empty space, use the intersection point with the ground plane
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const ray = this.getRayFromMouse(event);
      point = new THREE.Vector3();

      if (!ray.intersectPlane(groundPlane, point)) {
        return null;
      }
    }

    return point;
  }

  private getIntersects(event: MouseEvent): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all objects except reference lines and helpers
    const objects = this.scene.children.filter(
      (obj) =>
        !obj.name.includes('reference_line') &&
        !obj.name.includes('helper') &&
        !obj.name.includes('reference_start_marker')
    );

    return this.raycaster.intersectObjects(objects, true);
  }

  private getRayFromMouse(event: MouseEvent): THREE.Ray {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.ray;
  }

  private findNearestVertex(point: THREE.Vector3, object: THREE.Object3D): THREE.Vector3 {
    let nearestVertex = point.clone();
    let minDistance = Infinity;

    // If the object is a mesh, check its vertices
    if (object instanceof THREE.Mesh && object.geometry) {
      const geometry = object.geometry;
      const positionAttribute = geometry.getAttribute('position');

      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);

        // Transform vertex to world space
        vertex.applyMatrix4(object.matrixWorld);

        const distance = point.distanceTo(vertex);
        if (distance < minDistance && distance < this.snapThreshold) {
          minDistance = distance;
          nearestVertex = vertex;
        }
      }
    }

    return nearestVertex;
  }

  private updateTemporaryPoint(point: THREE.Vector3): void {
    if (this.currentPoint) {
      this.scene.remove(this.currentPoint);
    }

    const geometry = new THREE.SphereGeometry(0.03, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(point);
    this.currentPoint = sphere;
    this.scene.add(this.currentPoint);
  }

  private updateTemporaryLine(start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.currentLine) {
      this.scene.remove(this.currentLine);
    }

    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.currentLine = new THREE.Line(geometry, this.tempLineMaterial);
    this.currentLine.computeLineDistances();
    this.scene.add(this.currentLine);
  }

  private createReferenceLine(): void {
    if (!this.firstPoint || !this.secondPoint) return;

    // Calculate direction vector between points
    const direction = this.secondPoint.clone().sub(this.firstPoint).normalize();

    // Calculate points that extend beyond the original points
    const startPoint = this.firstPoint
      .clone()
      .sub(direction.clone().multiplyScalar(this.sceneSize));
    const endPoint = this.secondPoint.clone().add(direction.clone().multiplyScalar(this.sceneSize));

    // Create the permanent reference line
    const points = [startPoint, endPoint];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, this.lineMaterial);
    line.name = 'reference_line';
    line.computeLineDistances();
    this.scene.add(line);
    this.referenceLines.push(line);
  }

  removeAllReferenceLines(): void {
    this.referenceLines.forEach((line) => {
      this.scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material instanceof THREE.Material) line.material.dispose();
    });
    this.referenceLines = [];
  }
}
