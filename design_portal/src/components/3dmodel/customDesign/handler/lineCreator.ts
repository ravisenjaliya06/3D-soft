import { store } from '@/components/3dmodel/store';
import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ResponseStatus } from '../../interface';
import { createCustomWireframe, getDesignId } from './objectCreator';

export enum LineCreationState {
  INACTIVE = 0,
  PLACING_POINTS = 1,
}

export function createLineCreator(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
) {
  // State variables
  let state: LineCreationState = LineCreationState.INACTIVE;
  let points: THREE.Vector3[] = [];
  let tempLine: THREE.Line | null = null;
  let tempPoints: THREE.Points | null = null;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane

  // Materials
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.1,
    sizeAttenuation: true,
  });

  // Event handlers
  const handleMouseMove = (event: MouseEvent) => {
    if (state !== LineCreationState.PLACING_POINTS) return;

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (
      raycaster.ray.intersectPlane(plane, intersectionPoint) &&
      points.length > 0
    ) {
      updatePreviewLine(intersectionPoint);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (state !== LineCreationState.PLACING_POINTS || event.button !== 0)
      return;

    // Calculate mouse position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      addPoint(intersectionPoint.clone());
    }
  };

  const handleRightClick = (event: MouseEvent) => {
    if (state !== LineCreationState.PLACING_POINTS) return;
    event.preventDefault();

    if (points.length >= 2) {
      finalizeLine();
      state = LineCreationState.INACTIVE;
      deactivate();
    }
  };

  const handleDoubleClick = (event: MouseEvent) => {
    if (state !== LineCreationState.PLACING_POINTS) return;
    event.preventDefault();

    if (points.length >= 2) {
      finalizeLine();
      state = LineCreationState.INACTIVE;
      deactivate();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (state !== LineCreationState.PLACING_POINTS) return;

    if (event.key === 'Escape') {
      cancelLine();
      state = LineCreationState.INACTIVE;
      deactivate();
    } else if (event.key === 'Enter' && points.length >= 2) {
      finalizeLine();
      state = LineCreationState.INACTIVE;
      deactivate();
    }
  };

  // Helper functions
  const addPoint = (point: THREE.Vector3) => {
    points.push(point);
    updatePointsVisualization();
    if (points.length === 1) {
      updatePreviewLine(point); // Show initial point
    }
  };

  const updatePointsVisualization = () => {
    if (tempPoints) {
      scene.remove(tempPoints);
      if (tempPoints.geometry) tempPoints.geometry.dispose();
    }

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(points);
    tempPoints = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(tempPoints);
  };

  const updatePreviewLine = (currentPoint: THREE.Vector3) => {
    if (tempLine) {
      scene.remove(tempLine);
      if (tempLine.geometry) tempLine.geometry.dispose();
    }

    const linePoints = [...points, currentPoint];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    tempLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(tempLine);
  };

  const finalizeLine = () => {
    if (points.length < 2) {
      cancelLine();
      return;
    }

    // Compute centroid
    const centroid = new THREE.Vector3();
    points.forEach((point) => centroid.add(point));
    centroid.divideScalar(points.length);

    // Create shape in XZ plane
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x - centroid.x, points[0].z - centroid.z);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x - centroid.x, points[i].z - centroid.z);
    }

    // Create geometry and mesh
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd3d3d3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Position and rotate
    mesh.position.set(centroid.x, 0.01, centroid.z); // Slight Y offset
    mesh.rotation.x = Math.PI / 2; // Align with XZ plane

    // Add wireframe lines
    const wireframeLines = createCustomWireframe(geometry, 'line');
    if (wireframeLines) {
      mesh.add(wireframeLines);
    }

    // Add to scene
    scene.add(mesh);

    // Assign unique ID
    const objectId = uuidv4();
    mesh.userData.objectId = objectId;
    mesh.name = `line-${objectId}`;

    // Save to database
    saveLineToDatabase(
      objectId,
      points,
      mesh.position,
      mesh.rotation,
      mesh.scale,
    );

    // Notify parent component
    const lineData = {
      id: objectId,
      type: 'line',
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      properties: {
        dimensions: {
          points: points.map((p) => ({
            x: p.x - centroid.x,
            y: p.y,
            z: p.z - centroid.z,
          })),
        },
      },
      rotation: {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z,
      },
      scale: {
        x: mesh.scale.x,
        y: mesh.scale.y,
        z: mesh.scale.z,
      },
    };

    // Dispatch to Redux store
    store.dispatch(addShape(lineData));

    // Clean up
    cancelLine();
  };

  const saveLineToDatabase = (
    objectId: string,
    points: THREE.Vector3[],
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
  ) => {
    const designId = getDesignId();
    if (!designId) {
      console.error('No design ID found in URL');
      return;
    }

    const mainDataObject = {
      height: 0,
      width: 0,
      depth: 0,
      points: points.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
      })),
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotateX: rotation.x,
      rotateY: rotation.y,
      rotateZ: rotation.z,
      scale: {
        x: scale.x,
        y: scale.y,
        z: scale.z,
      },
    };

    const payload = {
      data: {
        catalog: {
          id: objectId,
          name: 'line',
          data: mainDataObject,
          is_custom: true,
          is_default: true,
        },
      },
    };

    commonService
      .putObjectData('design', designId, 'object', payload)
      .then((response) => {
        if ((response as ResponseStatus).status === 200) {
          console.log('Line saved to database:', objectId);
        } else {
          console.error('Failed to save line to database');
        }
      })
      .catch((error) => {
        console.error('Error saving line to database:', error);
      });
  };

  const cancelLine = () => {
    cleanup();
    points = [];
  };

  const cleanup = () => {
    if (tempLine) {
      scene.remove(tempLine);
      if (tempLine.geometry) tempLine.geometry.dispose();
      tempLine = null;
    }
    if (tempPoints) {
      scene.remove(tempPoints);
      if (tempPoints.geometry) tempPoints.geometry.dispose();
      tempPoints = null;
    }
  };

  // Public API
  const activate = () => {
    state = LineCreationState.PLACING_POINTS;
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('contextmenu', handleRightClick);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    state = LineCreationState.INACTIVE;
    document.body.style.cursor = 'default';

    // Remove event listeners
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.removeEventListener('click', handleClick);
    renderer.domElement.removeEventListener('contextmenu', handleRightClick);
    renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up
    cleanup();
    points = [];
  };

  return {
    activate,
    deactivate,
    getState: () => state,
  };
}
