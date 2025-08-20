import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { CurveHandlerOptions, ShapeData } from '../interface';
import { getDesignId } from './objectCreator';

export enum CurveCreationState {
  INACTIVE = 0,
  SELECTING_OBJECT = 1,
  SELECTING_FIRST_EDGE = 2,
  SELECTING_SECOND_EDGE = 3,
  PREVIEWING_CURVE = 4,
}

export function createCurveHandler({
  scene,
  camera,
  controls,
  onCurveCreated,
}: CurveHandlerOptions) {
  let state: CurveCreationState = CurveCreationState.INACTIVE;
  let selectedObject: THREE.Mesh | null = null;
  let firstEdge: { start: THREE.Vector3; end: THREE.Vector3 } | null = null;
  let secondEdge: { start: THREE.Vector3; end: THREE.Vector3 } | null = null;
  let previewCurve: THREE.Line | null = null;
  let curveRadius = 0.2; // Default radius
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Plane for raycasting (XZ plane)
  const planeNormal = new THREE.Vector3(0, 1, 0);
  const plane = new THREE.Plane(planeNormal);

  // Edge highlighting
  let highlightedEdge: THREE.Line | null = null;

  // Error message display
  let errorMessage: HTMLDivElement | null = null;

  const showError = (message: string) => {
    if (!errorMessage) {
      errorMessage = document.createElement('div');
      errorMessage.style.position = 'absolute';
      errorMessage.style.top = '10px';
      errorMessage.style.left = '50%';
      errorMessage.style.transform = 'translateX(-50%)';
      errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '10px';
      errorMessage.style.borderRadius = '5px';
      errorMessage.style.zIndex = '1000';
      document.body.appendChild(errorMessage);
    }
    errorMessage.textContent = message;
    setTimeout(() => {
      if (errorMessage) {
        errorMessage.remove();
        errorMessage = null;
      }
    }, 3000);
  };

  const handleMouseMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (
      state === CurveCreationState.SELECTING_FIRST_EDGE ||
      state === CurveCreationState.SELECTING_SECOND_EDGE
    ) {
      // Highlight edge under mouse
      highlightEdgeUnderMouse();
    } else if (
      state === CurveCreationState.PREVIEWING_CURVE &&
      firstEdge &&
      secondEdge
    ) {
      const intersectionPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
        const cornerPoint = getCornerPoint(firstEdge, secondEdge);
        if (cornerPoint) {
          // Calculate maximum allowed radius based on nearest vertices
          const maxRadius = Math.min(
            cornerPoint.distanceTo(
              firstEdge.end.equals(cornerPoint)
                ? firstEdge.start
                : firstEdge.end,
            ),
            cornerPoint.distanceTo(
              secondEdge.end.equals(cornerPoint)
                ? secondEdge.start
                : secondEdge.end,
            ),
          );

          // Calculate distance but cap it to the maximum allowed radius
          const distance = cornerPoint.distanceTo(intersectionPoint);
          curveRadius = Math.min(Math.max(0.05, distance), maxRadius);
          updatePreviewCurve();
        }
      }
    }
  };

  const handleWheel = (event: WheelEvent) => {
    if (
      state === CurveCreationState.PREVIEWING_CURVE &&
      firstEdge &&
      secondEdge
    ) {
      const cornerPoint = getCornerPoint(firstEdge, secondEdge);
      if (cornerPoint) {
        // Calculate maximum allowed radius based on nearest vertices
        const maxRadius = Math.min(
          cornerPoint.distanceTo(
            firstEdge.end.equals(cornerPoint) ? firstEdge.start : firstEdge.end,
          ),
          cornerPoint.distanceTo(
            secondEdge.end.equals(cornerPoint)
              ? secondEdge.start
              : secondEdge.end,
          ),
        );

        // Adjust radius with mouse wheel, respecting the maximum allowed radius
        const delta = event.deltaY * -0.001;
        curveRadius = Math.max(0.05, Math.min(curveRadius + delta, maxRadius));
        updatePreviewCurve();
        event.preventDefault();
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Cancel operation
      deactivate();
    }
  };

  const highlightEdgeUnderMouse = () => {
    if (!selectedObject || !selectedObject.geometry) return;

    // Remove previous highlighto
    if (highlightedEdge) {
      scene.remove(highlightedEdge);
      highlightedEdge.geometry.dispose();
      if (highlightedEdge.material instanceof THREE.Material) {
        highlightedEdge.material.dispose();
      }
      highlightedEdge = null;
    }

    const edge = selectEdge();
    if (edge) {
      // Create highlight line
      const points = [edge.start, edge.end];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 3,
      });
      highlightedEdge = new THREE.Line(geometry, material);
      scene.add(highlightedEdge);
    }
  };

  const handleClick = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (state === CurveCreationState.SELECTING_OBJECT) {
      const intersects = raycaster.intersectObjects(
        scene.children.filter(
          (obj) =>
            obj instanceof THREE.Mesh &&
            !obj.name.includes('grid') &&
            !obj.name.includes('helper') &&
            !obj.name.includes('daysky') &&
            !obj.name.includes('nightsky') &&
            !obj.name.includes('object_outline'),
        ),
        false,
      );

      if (intersects.length > 0) {
        selectedObject = intersects[0].object as THREE.Mesh;
        state = CurveCreationState.SELECTING_FIRST_EDGE;
        showError('Now select the first edge');
      }
    } else if (state === CurveCreationState.SELECTING_FIRST_EDGE) {
      const edge = selectEdge();
      if (edge) {
        firstEdge = edge;
        state = CurveCreationState.SELECTING_SECOND_EDGE;
        showError(
          'Now select the second edge (must be perpendicular to first)',
        );
      }
    } else if (state === CurveCreationState.SELECTING_SECOND_EDGE) {
      const edge = selectEdge();
      if (edge && firstEdge) {
        // Check if edges share a corner
        const cornerPoint = getCornerPoint(firstEdge, edge);
        if (!cornerPoint) {
          showError('Edges must share a corner point');
          return;
        }

        // Check if edges are perpendicular
        if (!areEdgesPerpendicular(firstEdge, edge)) {
          showError('Edges must be perpendicular (90 degrees)');
          return;
        }

        secondEdge = edge;
        state = CurveCreationState.PREVIEWING_CURVE;
        updatePreviewCurve();
        showError(
          'Move mouse to adjust curve radius, scroll to fine-tune, click to finalize',
        );
      }
    } else if (state === CurveCreationState.PREVIEWING_CURVE) {
      finalizeCurve();
    }
  };

  const selectEdge = (): {
    start: THREE.Vector3;
    end: THREE.Vector3;
  } | null => {
    if (!selectedObject || !selectedObject.geometry) return null;

    const geometry = selectedObject.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position;
    const vertices: THREE.Vector3[] = [];

    // Extract vertices from geometry
    for (let i = 0; i < position.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
      vertices.push(selectedObject.localToWorld(vertex.clone()));
    }

    // Find closest edge to mouse position
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      let closestEdge: {
        start: THREE.Vector3;
        end: THREE.Vector3;
        distance: number;
      } | null = null;
      let minDistance = Number.POSITIVE_INFINITY;

      // Check each edge
      for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % vertices.length];
        const distance = distanceToSegment(intersectionPoint, start, end);

        // Only consider edges that are close enough to the mouse
        if (distance < minDistance && distance < 0.2) {
          minDistance = distance;
          closestEdge = { start, end, distance };
        }
      }

      return closestEdge
        ? { start: closestEdge.start, end: closestEdge.end }
        : null;
    }

    return null;
  };

  const distanceToSegment = (
    point: THREE.Vector3,
    start: THREE.Vector3,
    end: THREE.Vector3,
  ): number => {
    const line = end.clone().sub(start);
    const pointToStart = point.clone().sub(start);
    const lineLengthSquared = line.lengthSq();

    if (lineLengthSquared === 0) return pointToStart.length();

    let t = pointToStart.dot(line) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projection = start.clone().add(line.clone().multiplyScalar(t));
    return point.distanceTo(projection);
  };

  const areEdgesPerpendicular = (
    edge1: { start: THREE.Vector3; end: THREE.Vector3 },
    edge2: { start: THREE.Vector3; end: THREE.Vector3 },
  ): boolean => {
    const dir1 = edge1.end.clone().sub(edge1.start).normalize();
    const dir2 = edge2.end.clone().sub(edge2.start).normalize();
    const dot = Math.abs(dir1.dot(dir2));

    // Allow small tolerance for perpendicularity (close to 0 means perpendicular)
    return dot < 0.15;
  };

  const getCornerPoint = (
    edge1: { start: THREE.Vector3; end: THREE.Vector3 },
    edge2: { start: THREE.Vector3; end: THREE.Vector3 },
  ): THREE.Vector3 | null => {
    // Find the common vertex (corner) between two edges
    const tolerance = 0.01;

    if (edge1.end.distanceTo(edge2.start) < tolerance) {
      return edge1.end.clone();
    } else if (edge1.end.distanceTo(edge2.end) < tolerance) {
      return edge1.end.clone();
    } else if (edge1.start.distanceTo(edge2.start) < tolerance) {
      return edge1.start.clone();
    } else if (edge1.start.distanceTo(edge2.end) < tolerance) {
      return edge1.start.clone();
    }

    return null;
  };

  const updatePreviewCurve = () => {
    if (!firstEdge || !secondEdge || !selectedObject) return;

    // Remove previous preview
    if (previewCurve) {
      scene.remove(previewCurve);
      previewCurve.geometry.dispose();
      if (previewCurve.material instanceof THREE.Material) {
        previewCurve.material.dispose();
      }
    }

    const cornerPoint = getCornerPoint(firstEdge, secondEdge);
    if (!cornerPoint) return;

    // Create vectors pointing away from corner along each edge
    const dir1 = firstEdge.end.equals(cornerPoint)
      ? firstEdge.start.clone().sub(cornerPoint).normalize()
      : firstEdge.end.clone().sub(cornerPoint).normalize();

    const dir2 = secondEdge.end.equals(cornerPoint)
      ? secondEdge.start.clone().sub(cornerPoint).normalize()
      : secondEdge.end.clone().sub(cornerPoint).normalize();

    // Calculate tangent points
    const tangentPoint1 = cornerPoint
      .clone()
      .add(dir1.multiplyScalar(curveRadius));
    const tangentPoint2 = cornerPoint
      .clone()
      .add(dir2.multiplyScalar(curveRadius));

    // Create control point for the curve (at the corner)
    const controlPoint = cornerPoint.clone();

    // Create a quadratic Bezier curve
    const curve = new THREE.QuadraticBezierCurve3(
      tangentPoint1,
      controlPoint,
      tangentPoint2,
    );
    const points = curve.getPoints(10);

    // Create curve geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });

    previewCurve = new THREE.Line(geometry, material);
    scene.add(previewCurve);
  };

  const finalizeCurve = async () => {
    if (
      !selectedObject ||
      !firstEdge ||
      !secondEdge ||
      !selectedObject.geometry
    ) {
      console.error('Cannot finalize curve: missing selected object or edges');
      return;
    }

    const cornerPoint = getCornerPoint(firstEdge, secondEdge);
    if (!cornerPoint) {
      console.error('No corner point found for edges');
      return;
    }

    // Get the original shape vertices
    const geometry = selectedObject.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position;
    const vertices: THREE.Vector3[] = [];

    for (let i = 0; i < position.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
      vertices.push(selectedObject.localToWorld(vertex.clone()));
    }

    // Ensure vertices are unique to avoid duplicates
    const uniqueVertices: THREE.Vector3[] = [];
    for (const vertex of vertices) {
      if (!uniqueVertices.some((v) => v.distanceTo(vertex) < 0.001)) {
        uniqueVertices.push(vertex);
      }
    }

    if (uniqueVertices.length < 3) {
      console.error('Not enough unique vertices to create a shape');
      return;
    }

    // Compute centroid
    const centroid = new THREE.Vector3();
    uniqueVertices.forEach((vertex) => centroid.add(vertex));
    centroid.divideScalar(uniqueVertices.length);

    // Convert vertices to Vector2 for Shape creation (XZ plane, relative to centroid)
    const points2D = uniqueVertices.map(
      (v) => new THREE.Vector2(v.x - centroid.x, v.z - centroid.z),
    );

    // Find the corner index
    const cornerIndex = uniqueVertices.findIndex(
      (v) => v.distanceTo(cornerPoint) < 0.01,
    );
    if (cornerIndex === -1) {
      console.error('Corner point not found in vertices:', cornerPoint);
      return;
    }

    // Create a new Shape
    const shape = new THREE.Shape();

    // Start shape at a point that's not the corner to ensure correct ordering
    const startIndex = (cornerIndex + 1) % points2D.length;
    shape.moveTo(points2D[startIndex].x, points2D[startIndex].y);

    // Add all points, replacing the corner with a curve
    for (let i = 1; i <= points2D.length; i++) {
      const currIndex = (startIndex + i) % points2D.length;
      const prevIndex = (currIndex - 1 + points2D.length) % points2D.length;
      const nextIndex = (currIndex + 1) % points2D.length;

      if (currIndex === cornerIndex) {
        // Get the corner and adjacent points in world coordinates
        const corner = uniqueVertices[currIndex];
        const prevPoint = uniqueVertices[prevIndex];
        const nextPoint = uniqueVertices[nextIndex];

        // Compute directions along edges
        const dir1 = new THREE.Vector3().subVectors(prevPoint, corner);
        const dir2 = new THREE.Vector3().subVectors(nextPoint, corner);

        // Check for zero-length or collinear edges
        if (dir1.length() < 0.001 || dir2.length() < 0.001) {
          console.error(`Invalid edge length at vertex ${currIndex}`);
          return;
        }

        dir1.normalize();
        dir2.normalize();

        // Check if edges are collinear
        const dot = dir1.dot(dir2);
        if (Math.abs(dot + 1) < 0.001) {
          console.error(`Edges at vertex ${currIndex} are collinear`);
          return;
        }

        // Calculate tangent points
        const tangentPoint1 = corner
          .clone()
          .add(dir1.multiplyScalar(curveRadius));
        const tangentPoint2 = corner
          .clone()
          .add(dir2.multiplyScalar(curveRadius));

        // Create a quadratic Bezier curve
        const curve = new THREE.QuadraticBezierCurve3(
          tangentPoint1,
          corner,
          tangentPoint2,
        );
        const curvePoints = curve.getPoints(10);

        // Add curve points to shape (in 2D, relative to centroid)
        for (let j = 1; j < curvePoints.length - 1; j++) {
          shape.lineTo(
            curvePoints[j].x - centroid.x,
            curvePoints[j].z - centroid.z,
          );
        }
      } else {
        shape.lineTo(points2D[currIndex].x, points2D[currIndex].y);
      }
    }

    shape.closePath();

    // Create new geometry
    const newGeometry = new THREE.ShapeGeometry(shape);

    // Create new mesh
    const newMaterial = new THREE.MeshStandardMaterial({
      color: (
        selectedObject.material as THREE.MeshStandardMaterial
      ).color.getHex(),
      side: THREE.DoubleSide,
    });
    const newMesh = new THREE.Mesh(newGeometry, newMaterial);

    // Set position, rotation, and scale
    newMesh.position.copy(centroid);
    newMesh.rotation.x = Math.PI / 2; // Align with XZ plane
    newMesh.rotation.y = selectedObject.rotation.y;
    newMesh.rotation.z = selectedObject.rotation.z;
    newMesh.scale.copy(selectedObject.scale);
    newMesh.name = selectedObject.name;
    newMesh.userData = { ...selectedObject.userData };

    // Update wireframe
    const wireframe = selectedObject.children.find(
      (child) => child instanceof THREE.LineSegments,
    );
    if (wireframe) {
      selectedObject.remove(wireframe);
    }
    const newWireframe = createCustomWireframe(newGeometry);
    newMesh.add(newWireframe);

    // Replace old mesh in the scene
    scene.remove(selectedObject);
    scene.add(newMesh);
    selectedObject.geometry.dispose();
    if (selectedObject.material instanceof THREE.Material) {
      selectedObject.material.dispose();
    }
    selectedObject = newMesh;

    // Update database
    const objectId = selectedObject.userData.objectId;
    const designId = getDesignId();
    if (!designId || !objectId) {
      console.error('Missing design ID or object ID');
      return;
    }

    // Prepare data for database update
    const points = points2D.map((p) => ({
      x: p.x,
      y: 0,
      z: p.y,
    }));
    const mainDataObject = {
      position: {
        x: newMesh.position.x,
        y: newMesh.position.y,
        z: newMesh.position.z,
      },
      rotateX: newMesh.rotation.x,
      rotateY: newMesh.rotation.y,
      rotateZ: newMesh.rotation.z,
      scale: {
        x: newMesh.scale.x,
        y: newMesh.scale.y,
        z: newMesh.scale.z,
      },
      points,
      filletRadius: curveRadius,
      cornerIndex,
    };

    const payload = {
      data: {
        catalog: {
          id: objectId,
          name: selectedObject.name.split('-')[0].toUpperCase(),
          data: mainDataObject,
          is_custom: true,
          is_default: true,
        },
      },
    };

    try {
      const response: { status: number } = await commonService.putObjectData(
        'design',
        designId,
        'object',
        payload,
      );
      if (response.status === 200) {
        showError('Curve applied successfully!');
      }
    } catch (error) {
      console.error('Error saving curve to database:', error);
      showError('Error saving curve to database');
    }

    // Notify parent
    const shapeData: ShapeData = {
      id: objectId,
      type: selectedObject.name.split('-')[0],
      properties: {
        dimensions: {
          points: points,
          filletRadius: curveRadius,
          cornerIndex,
        },
        color: (
          selectedObject.material as THREE.MeshStandardMaterial
        ).color.getHex(),
      },
      position: {
        x: newMesh.position.x,
        y: newMesh.position.y,
        z: newMesh.position.z,
      },
      rotation: {
        x: newMesh.rotation.x,
        y: newMesh.rotation.y,
        z: newMesh.rotation.z,
      },
      scale: {
        x: newMesh.scale.x,
        y: newMesh.scale.y,
        z: newMesh.scale.z,
      },
    };

    onCurveCreated?.(shapeData);

    // Clean up preview
    if (previewCurve) {
      scene.remove(previewCurve);
      previewCurve.geometry.dispose();
      if (previewCurve.material instanceof THREE.Material) {
        previewCurve.material.dispose();
      }
      previewCurve = null;
    }

    // Reset state
    state = CurveCreationState.SELECTING_OBJECT;
    firstEdge = null;
    secondEdge = null;
    selectedObject = null;
  };
  const createCustomWireframe = (
    geometry: THREE.BufferGeometry,
  ): THREE.LineSegments => {
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    return new THREE.LineSegments(edges, lineMaterial);
  };

  const activate = () => {
    state = CurveCreationState.SELECTING_OBJECT;
    document.body.style.cursor = 'crosshair';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    controls.enabled = false; // Disable orbit controls

    showError('Curve tool activated. Select a 2D surface object.');
  };

  const deactivate = () => {
    state = CurveCreationState.INACTIVE;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('click', handleClick);
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keydown', handleKeyDown);
    controls.enabled = true;

    // Clean up preview curve
    if (previewCurve) {
      scene.remove(previewCurve);
      previewCurve.geometry.dispose();
      if (previewCurve.material instanceof THREE.Material) {
        previewCurve.material.dispose();
      }
      previewCurve = null;
    }

    // Clean up highlighted edge
    if (highlightedEdge) {
      scene.remove(highlightedEdge);
      highlightedEdge.geometry.dispose();
      if (highlightedEdge.material instanceof THREE.Material) {
        highlightedEdge.material.dispose();
      }
      highlightedEdge = null;
    }

    // Remove error message if present
    if (errorMessage) {
      errorMessage.remove();
      errorMessage = null;
    }

    selectedObject = null;
    firstEdge = null;
    secondEdge = null;
  };

  return {
    activate,
    deactivate,
    getState: () => state,
    isActive: () => state !== CurveCreationState.INACTIVE,
    setRadius: (radius: number) => {
      curveRadius = Math.max(0.05, Math.min(radius, 1.0));
      if (state === CurveCreationState.PREVIEWING_CURVE) {
        updatePreviewCurve();
      }
    },
  };
}
