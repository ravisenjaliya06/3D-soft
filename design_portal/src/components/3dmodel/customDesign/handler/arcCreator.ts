import { store } from '@/components/3dmodel/store';
import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ResponseStatus } from '../../interface';
import { createCustomWireframe, getDesignId } from './objectCreator';

export enum ArcCreationState {
  INACTIVE = 0,
  PLACING_START_POINT = 1,
  PLACING_END_POINT = 2,
  PLACING_BULGE_POINT = 3,
}

export function createArcCreator(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
) {
  // State variables
  let state: ArcCreationState = ArcCreationState.INACTIVE;
  let startPoint: THREE.Vector3 | null = null;
  let endPoint: THREE.Vector3 | null = null;
  let bulgePoint: THREE.Vector3 | null = null;
  let tempLine: THREE.Line | null = null;
  let tempPoints: THREE.Points | null = null;
  let previewArc: THREE.Line | null = null;
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
    if (state === ArcCreationState.INACTIVE) return;

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === ArcCreationState.PLACING_START_POINT) {
        // Just show cursor
      } else if (state === ArcCreationState.PLACING_END_POINT && startPoint) {
        // Show a line from start to current point
        updatePreviewLine(startPoint, intersectionPoint);
      } else if (
        state === ArcCreationState.PLACING_BULGE_POINT &&
        startPoint &&
        endPoint
      ) {
        // Update bulge point and preview arc
        bulgePoint = intersectionPoint.clone();
        updatePreviewArc();
      }
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (state === ArcCreationState.INACTIVE || event.button !== 0) return;

    // Calculate mouse position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === ArcCreationState.PLACING_START_POINT) {
        startPoint = intersectionPoint.clone();
        updatePointsVisualization();
        state = ArcCreationState.PLACING_END_POINT;
      } else if (state === ArcCreationState.PLACING_END_POINT && startPoint) {
        endPoint = intersectionPoint.clone();
        updatePointsVisualization();
        state = ArcCreationState.PLACING_BULGE_POINT;

        // Create initial bulge point at midpoint with some offset
        const midPoint = new THREE.Vector3()
          .addVectors(startPoint, endPoint)
          .multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x)
          .normalize()
          .multiplyScalar(0.5);
        bulgePoint = new THREE.Vector3().addVectors(midPoint, perpendicular);

        updatePreviewArc();
      } else if (
        state === ArcCreationState.PLACING_BULGE_POINT &&
        startPoint &&
        endPoint
      ) {
        bulgePoint = intersectionPoint.clone();
        updatePointsVisualization();
        finalizeArc();
        state = ArcCreationState.INACTIVE;
        deactivate();
      }
    }
  };

  const handleRightClick = (event: MouseEvent) => {
    if (state === ArcCreationState.INACTIVE) return;
    event.preventDefault();

    // Cancel arc creation
    cancelArc();
    state = ArcCreationState.INACTIVE;
    deactivate();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (state === ArcCreationState.INACTIVE) return;

    if (event.key === 'Escape') {
      cancelArc();
      state = ArcCreationState.INACTIVE;
      deactivate();
    } else if (
      event.key === 'Enter' &&
      state === ArcCreationState.PLACING_BULGE_POINT &&
      startPoint &&
      endPoint &&
      bulgePoint
    ) {
      finalizeArc();
      state = ArcCreationState.INACTIVE;
      deactivate();
    }
  };

  // Helper functions
  const updatePointsVisualization = () => {
    if (tempPoints) {
      scene.remove(tempPoints);
      if (tempPoints.geometry) tempPoints.geometry.dispose();
    }

    const points = [];
    if (startPoint) points.push(startPoint);
    if (endPoint) points.push(endPoint);
    if (bulgePoint) points.push(bulgePoint);

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(points);
    tempPoints = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(tempPoints);
  };

  const updatePreviewLine = (start: THREE.Vector3, end: THREE.Vector3) => {
    if (tempLine) {
      scene.remove(tempLine);
      if (tempLine.geometry) tempLine.geometry.dispose();
    }

    const linePoints = [start.clone(), end.clone()];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    tempLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(tempLine);
  };

  const updatePreviewArc = () => {
    if (!startPoint || !endPoint || !bulgePoint) return;

    if (previewArc) {
      scene.remove(previewArc);
      if (previewArc.geometry) previewArc.geometry.dispose();
    }

    // Create a quadratic bezier curve
    const curve = createQuadraticBezierFromThreePoints(
      startPoint,
      endPoint,
      bulgePoint,
    );
    const points = curve.getPoints(50);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x2ecc71,
      linewidth: 2,
    });

    previewArc = new THREE.Line(geometry, material);
    scene.add(previewArc);
  };

  const createQuadraticBezierFromThreePoints = (
    p0: THREE.Vector3,
    p2: THREE.Vector3,
    p1Actual: THREE.Vector3,
  ): THREE.QuadraticBezierCurve3 => {
    // For a quadratic bezier curve, we need to find the control point
    // that will make the curve pass through our desired bulge point

    // First, find the parameter t where the bulge point occurs
    // For simplicity, we'll assume it's at t=0.5 (midpoint of the curve)

    // For a point on a quadratic bezier curve:
    // P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    // At t=0.5, this becomes:
    // P(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    // Solving for P1:
    // P1 = (P(0.5) - 0.25*P0 - 0.25*P2) / 0.5

    const p1 = new THREE.Vector3()
      .copy(p1Actual)
      .multiplyScalar(2)
      .sub(p0.clone().multiplyScalar(0.25))
      .sub(p2.clone().multiplyScalar(0.25))
      .multiplyScalar(1 / 1);

    return new THREE.QuadraticBezierCurve3(p0.clone(), p1, p2.clone());
  };

  const finalizeArc = () => {
    if (!startPoint || !endPoint || !bulgePoint) {
      cancelArc();
      return;
    }

    // Create a quadratic bezier curve
    const curve = createQuadraticBezierFromThreePoints(
      startPoint,
      endPoint,
      bulgePoint,
    );
    const curvePoints = curve.getPoints(64);

    // Compute centroid
    const centroid = new THREE.Vector3();
    curvePoints.forEach((point) => centroid.add(point));
    centroid.divideScalar(curvePoints.length);

    // Create shape in XZ plane
    const shape = new THREE.Shape();
    shape.moveTo(curvePoints[0].x - centroid.x, curvePoints[0].z - centroid.z);
    for (let i = 1; i < curvePoints.length; i++) {
      shape.lineTo(
        curvePoints[i].x - centroid.x,
        curvePoints[i].z - centroid.z,
      );
    }
    shape.closePath();

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
    const wireframeLines = createCustomWireframe(geometry, 'arc');
    if (wireframeLines) {
      mesh.add(wireframeLines);
    }

    // Store the original points and curve in userData for reference
    mesh.userData.startPoint = startPoint.clone();
    mesh.userData.endPoint = endPoint.clone();
    mesh.userData.bulgePoint = bulgePoint.clone();
    mesh.userData.curvePoints = curvePoints.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
    }));
    mesh.userData.isArc = true;

    // Add to scene
    scene.add(mesh);

    // Assign unique ID
    const objectId = uuidv4();
    mesh.userData.objectId = objectId;
    mesh.name = `arc-${objectId}`;

    // Save to database with all necessary data
    saveArcToDatabase(
      objectId,
      startPoint,
      endPoint,
      bulgePoint,
      curvePoints,
      mesh.position,
      mesh.rotation,
      mesh.scale,
    );

    // Create arc data for Redux store
    const arcData = {
      id: objectId,
      type: 'arc',
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      properties: {
        points: {
          start: { x: startPoint.x, y: startPoint.y, z: startPoint.z },
          end: { x: endPoint.x, y: endPoint.y, z: endPoint.z },
          bulge: { x: bulgePoint.x, y: bulgePoint.y, z: bulgePoint.z },
        },
        curvePoints: curvePoints.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
        })),
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
    store.dispatch(addShape(arcData));

    // Clean up
    cancelArc();
  };

  function saveArcToDatabase(
    objectId: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    bulge: THREE.Vector3,
    curvePoints: THREE.Vector3[],
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
  ) {
    const designId = getDesignId();
    if (!designId) {
      console.error('No design ID found in URL');
      return;
    }

    // Compute relative curve points
    const relativeCurvePoints = curvePoints.map((p) => ({
      x: p.x - position.x,
      y: p.y,
      z: p.z - position.z,
    }));

    const mainDataObject = {
      height: 0,
      width: 0,
      depth: 0,
      points: {
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: end.x, y: end.y, z: end.z },
        bulge: { x: bulge.x, y: bulge.y, z: bulge.z },
      },
      curvePoints: relativeCurvePoints,
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
          name: 'arc',
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
          if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
            console.log('Arc saved to database:', objectId);
          }
        } else {
          console.error('Failed to save arc to database');
        }
      })
      .catch((error) => {
        console.error('Error saving arc to database:', error);
      });
  }

  const cancelArc = () => {
    cleanup();
    startPoint = null;
    endPoint = null;
    bulgePoint = null;
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
    if (previewArc) {
      scene.remove(previewArc);
      if (previewArc.geometry) previewArc.geometry.dispose();
      previewArc = null;
    }
  };

  // Public API
  const activate = () => {
    state = ArcCreationState.PLACING_START_POINT;
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    state = ArcCreationState.INACTIVE;
    document.body.style.cursor = 'default';

    // Remove event listeners
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.removeEventListener('click', handleClick);
    renderer.domElement.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up
    cleanup();
    startPoint = null;
    endPoint = null;
    bulgePoint = null;
  };

  return {
    activate,
    deactivate,
    getState: () => state,
  };
}
