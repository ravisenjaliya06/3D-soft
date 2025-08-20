import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MeasurementToolProps } from './interface';

const MeasurementTool: React.FC<MeasurementToolProps> = ({
  design3D,
  isActive,
  unitType,
  onComplete,
}) => {
  const measurementsRef = useRef<
    { group: THREE.Group; label: CSS2DObject }[]
  >([]);
  const tempGroupRef = useRef<THREE.Group | null>(null);
  const tempLabelRef = useRef<CSS2DObject | null>(null);
  const snapMarkerRef = useRef<THREE.Mesh | null>(null);
  const css2DRendererRef = useRef<CSS2DRenderer | null>(null);
  const startMarkerRef = useRef<THREE.Mesh | null>(null);
  const startPointRef = useRef<THREE.Vector3 | null>(null);
  const snapTargetsRef = useRef<THREE.Vector3[]>([]);

  const SNAP_DISTANCE = 0.1;

  const initCSS2DRenderer = useCallback(() => {
    if (!css2DRendererRef.current) {
      css2DRendererRef.current = new CSS2DRenderer();
      const { width, height } = design3D.renderer.getSize(new THREE.Vector2());
      css2DRendererRef.current.setSize(width, height);
      css2DRendererRef.current.domElement.style.position = 'absolute';
      css2DRendererRef.current.domElement.style.top = '0px';
      css2DRendererRef.current.domElement.style.pointerEvents = 'none';
      design3D.renderer.domElement.parentNode?.appendChild(css2DRendererRef.current.domElement);
    }
  }, [design3D.renderer]);

  const createArrow = useCallback(
    (base: THREE.Vector3, tip: THREE.Vector3, pointsToBase: boolean): THREE.Line => {
      const direction = new THREE.Vector3().subVectors(tip, base).normalize();
      const arrowLength = 0.04;
      const arrowAngle = Math.PI / 6;
      const points = [];

      if (pointsToBase) {
        points.push(base.clone());
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
        const leftWing = new THREE.Vector3().addVectors(
          base,
          new THREE.Vector3().addScaledVector(direction, arrowLength),
        );
        leftWing.addScaledVector(perpendicular, arrowLength * Math.sin(arrowAngle));
        points.push(leftWing);
        points.push(base.clone());
        const rightWing = new THREE.Vector3().addVectors(
          base,
          new THREE.Vector3().addScaledVector(direction, arrowLength),
        );
        rightWing.addScaledVector(perpendicular, -arrowLength * Math.sin(arrowAngle));
        points.push(rightWing);
      } else {
        const arrowTip = tip.clone();
        points.push(arrowTip);
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
        const leftWing = new THREE.Vector3().addVectors(
          arrowTip,
          new THREE.Vector3().addScaledVector(direction, -arrowLength),
        );
        leftWing.addScaledVector(perpendicular, arrowLength * Math.sin(arrowAngle));
        points.push(leftWing);
        points.push(arrowTip);
        const rightWing = new THREE.Vector3().addVectors(
          arrowTip,
          new THREE.Vector3().addScaledVector(direction, -arrowLength),
        );
        rightWing.addScaledVector(perpendicular, -arrowLength * Math.sin(arrowAngle));
        points.push(rightWing);
      }

      const arrowGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const arrowMaterial = new THREE.LineBasicMaterial({
        color: 0x4287f5,
        linewidth: 2,
        depthTest: true,
      });
      return new THREE.Line(arrowGeometry, arrowMaterial);
    },
    [],
  );

  const createLineGroup = useCallback(
    (start: THREE.Vector3, end: THREE.Vector3): THREE.Group => {
      const material = new THREE.LineBasicMaterial({
        color: 0x4287f5,
        linewidth: 4,
        depthTest: true,
      });
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(geometry, material);
      line.name = 'measure_line';

      const group = new THREE.Group();
      group.name = 'measure_line_group';
      group.add(line);

      const startArrow = createArrow(start, end, true);
      startArrow.name = 'measure_start_arrow';
      group.add(startArrow);

      const endArrow = createArrow(end, start, true);
      endArrow.name = 'measure_end_arrow';
      group.add(endArrow);

      return group;
    },
    [createArrow],
  );

  const formatDistance = useCallback(
    (distance: number) => {
      let value = distance;
      let unit = 'm';

      switch (unitType) {
        case 'mm':
          value = distance * 1000;
          unit = 'mm';
          break;
        case 'cm':
          value = distance * 100;
          unit = 'cm';
          break;
        case 'in':
          value = distance * 39.3701;
          unit = 'in';
          break;
        case 'ft':
          value = distance * 3.28084;
          unit = 'ft';
          break;
        case 'mi':
          value = distance * 0.000621371;
          unit = 'mi';
          break;
        default:
          unit = 'm';
      }

      const formatted = `${value.toFixed(unit === 'mi' ? 6 : (value < 10 ? 2 : (value >= 1000 ? 1 : 0)))} ${unit}`;
      return { value, formatted };
    },
    [unitType],
  );

  const createDistanceLabel = useCallback(
    (start: THREE.Vector3, end: THREE.Vector3): CSS2DObject => {
      const { formatted } = formatDistance(start.distanceTo(end));

      const labelDiv = document.createElement('div');
      labelDiv.className = 'measure-label';
      labelDiv.style.background = 'rgba(30, 60, 114, 0.85)';
      labelDiv.style.color = 'white';
      labelDiv.style.padding = '4px 8px';
      labelDiv.style.borderRadius = '4px';
      labelDiv.style.fontFamily = 'Arial, sans-serif';
      labelDiv.style.fontSize = '12px';
      labelDiv.style.fontWeight = 'bold';
      labelDiv.style.border = '1px solid rgba(255, 255, 255, 0.3)';
      labelDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
      labelDiv.style.backdropFilter = 'blur(2px)';
      labelDiv.textContent = formatted;

      const label = new CSS2DObject(labelDiv);
      const midPoint = start.clone().lerp(end, 0.5);
      label.position.copy(midPoint);
      const offset = new THREE.Vector3(0, 0.03, 0);
      label.position.add(offset);
      label.name = 'measure_label';
      return label;
    },
    [formatDistance],
  );


  const cleanupTemporary = useCallback(() => {
    if (tempGroupRef.current) {
      disposeGroupContents(tempGroupRef.current);
      design3D.scene.remove(tempGroupRef.current);
      tempGroupRef.current = null;
    }
    if (tempLabelRef.current) {
      design3D.scene.remove(tempLabelRef.current);
      tempLabelRef.current = null;
    }
    if (startMarkerRef.current) {
      design3D.scene.remove(startMarkerRef.current);
      startMarkerRef.current.geometry.dispose();
      if (startMarkerRef.current.material instanceof THREE.Material) {
        startMarkerRef.current.material.dispose();
      }
      startMarkerRef.current = null;
    }
  }, [design3D.scene]);

  const cleanupAllMeasurements = useCallback(() => {
    measurementsRef.current.forEach(({ group, label }) => {
      disposeGroupContents(group);
      design3D.scene.remove(group);
      design3D.scene.remove(label);
    });
    measurementsRef.current = [];
    cleanupTemporary();
  }, [design3D.scene, cleanupTemporary]);

  const disposeGroupContents = (group: THREE.Group) => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();

        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];

        materials.forEach((material) => material.dispose());
      }
    });
  };

  const createSnapMarker = useCallback(() => {
    if (snapMarkerRef.current) {
      design3D.scene.remove(snapMarkerRef.current);
      snapMarkerRef.current.geometry.dispose();
      if (snapMarkerRef.current.material instanceof THREE.Material) {
        snapMarkerRef.current.material.dispose();
      }
    }

    const markerGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    snapMarkerRef.current = new THREE.Mesh(markerGeometry, markerMaterial);
    snapMarkerRef.current.name = 'snap_marker';
    snapMarkerRef.current.renderOrder = 1000;
    design3D.scene.add(snapMarkerRef.current);
    snapMarkerRef.current.visible = false;
  }, [design3D.scene]);

  const collectVerticesFromMesh = (object: THREE.Mesh) => {
    const vertices: THREE.Vector3[] = [];
    if (!(object.geometry instanceof THREE.BufferGeometry)) return vertices;

    const positionAttribute = object.geometry.getAttribute('position');
    if (!positionAttribute) return vertices;

    const vertexCount = positionAttribute.count;
    for (let i = 0; i < vertexCount; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
      vertex.applyMatrix4(object.matrixWorld);
      vertices.push(vertex);
    }

    if (object.geometry.index) {
      const indices = object.geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        for (let j = 0; j < 3; j++) {
          const idx1 = indices[i + j];
          const idx2 = indices[i + ((j + 1) % 3)];
          const v1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, idx1).applyMatrix4(object.matrixWorld);
          const v2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, idx2).applyMatrix4(object.matrixWorld);
          const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
          vertices.push(midpoint);
        }
      }
    }

    return vertices;
  };

  const addUniqueSnapPoints = (points: THREE.Vector3[], snapPoints: THREE.Vector3[], tolerance = 0.001) => {
    for (const point of points) {
      let isDuplicate = false;
      for (const existing of snapPoints) {
        if (point.distanceTo(existing) < tolerance) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        snapPoints.push(point.clone());
      }
    }
  };

  const collectSnapPoints = useCallback(() => {
    snapTargetsRef.current = [];
    design3D.scene.traverseVisible((object) => {
      if (
        object instanceof THREE.Mesh &&
        !object.name.includes('grid') &&
        !object.name.includes('helper') &&
        !object.name.includes('sky') &&
        !object.name.includes('object_outline') &&
        !object.name.includes('measure') &&
        !object.name.includes('snap_marker')
      ) {
        const vertices = collectVerticesFromMesh(object);
        addUniqueSnapPoints(vertices, snapTargetsRef.current);
      }
    });
  }, [design3D.scene]);

  const findNearestSnapPoint = useCallback((point: THREE.Vector3): THREE.Vector3 | null => {
    let minDistance = SNAP_DISTANCE;
    let nearestPoint = null;
    for (let i = 0; i < snapTargetsRef.current.length; i++) {
      const distance = point.distanceTo(snapTargetsRef.current[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = snapTargetsRef.current[i];
      }
    }
    return nearestPoint;
  }, []);

  const getIntersectionPoint = useCallback(
    (event: MouseEvent): THREE.Vector3 | null => {
      const mouse = new THREE.Vector2();
      const rect = design3D.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, design3D.camera);

      const meshes: THREE.Object3D[] = [];
      design3D.scene.traverseVisible((object) => {
        if (
          object instanceof THREE.Mesh &&
          !object.name.includes('grid') &&
          !object.name.includes('helper') &&
          !object.name.includes('sky') &&
          !object.name.includes('object_outline') &&
          !object.name.includes('measure_line') &&
          !object.name.includes('measure_start_arrow') &&
          !object.name.includes('measure_end_arrow') &&
          !object.name.includes('snap_marker')
        ) {
          meshes.push(object);
        }
      });

      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        const snappedPoint = findNearestSnapPoint(intersectionPoint);
        if (snappedPoint) {
          if (snapMarkerRef.current) {
            snapMarkerRef.current.position.copy(snappedPoint);
            snapMarkerRef.current.visible = true;
          }
          return snappedPoint;
        } else {
          if (snapMarkerRef.current) {
            snapMarkerRef.current.visible = false;
          }
        }
        return intersectionPoint;
      }

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersect)) {
        if (snapMarkerRef.current) {
          snapMarkerRef.current.visible = false;
        }
        return intersect;
      }
      return null;
    },
    [design3D.camera, design3D.renderer, design3D.scene, findNearestSnapPoint],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!isActive) return;
      event.preventDefault();

      const point = getIntersectionPoint(event);
      if (!point) return;

      if (!startPointRef.current) {
        cleanupAllMeasurements();
        startPointRef.current = point.clone();
        const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: 0x4287f5,
          transparent: true,
          opacity: 0.9,
        });
        startMarkerRef.current = new THREE.Mesh(markerGeometry, markerMaterial);
        startMarkerRef.current.position.copy(startPointRef.current);
        startMarkerRef.current.name = 'measure_start_marker';
        design3D.scene.add(startMarkerRef.current);
      } else {
        const endPoint = point.clone();
        cleanupTemporary();

        const group = createLineGroup(startPointRef.current, endPoint);
        const label = createDistanceLabel(startPointRef.current, endPoint);
        design3D.scene.add(group);
        design3D.scene.add(label);

        const lineDirection = new THREE.Vector3()
          .subVectors(endPoint, startPointRef.current)
          .normalize();
        const perpendicularUp = new THREE.Vector3(0, 1, 0);
        const offset = new THREE.Vector3()
          .crossVectors(lineDirection, perpendicularUp)
          .normalize()
          .multiplyScalar(0.01);
        group.position.add(offset);

        measurementsRef.current.push({ group, label });

        const distance = startPointRef.current.distanceTo(endPoint);
        if (onComplete) {
          const { value } = formatDistance(distance);
          onComplete(value);
        }

        startPointRef.current = null;
      }
      design3D.renderer.render(design3D.scene, design3D.camera);
      if (css2DRendererRef.current) {
        css2DRendererRef.current.render(design3D.scene, design3D.camera);
      }
    },
    [
      isActive,
      getIntersectionPoint,
      cleanupAllMeasurements,
      cleanupTemporary,
      createLineGroup,
      createDistanceLabel,
      formatDistance,
      onComplete,
      design3D.scene,
      design3D.renderer,
      design3D.camera,
    ],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isActive || !startPointRef.current) return;

      const point = getIntersectionPoint(event);
      if (!point) return;

      if (tempGroupRef.current) {
        disposeGroupContents(tempGroupRef.current);
        design3D.scene.remove(tempGroupRef.current);
        tempGroupRef.current = null;
      }
      if (tempLabelRef.current) {
        design3D.scene.remove(tempLabelRef.current);
        tempLabelRef.current = null;
      }

      tempGroupRef.current = createLineGroup(startPointRef.current, point);
      tempLabelRef.current = createDistanceLabel(startPointRef.current, point);
      design3D.scene.add(tempGroupRef.current);
      design3D.scene.add(tempLabelRef.current);

      const lineDirection = new THREE.Vector3()
        .subVectors(point, startPointRef.current)
        .normalize();
      const perpendicularUp = new THREE.Vector3(0, 1, 0);
      const offset = new THREE.Vector3()
        .crossVectors(lineDirection, perpendicularUp)
        .normalize()
        .multiplyScalar(0.01);
      if (tempGroupRef.current) tempGroupRef.current.position.add(offset);

      design3D.renderer.render(design3D.scene, design3D.camera);
      if (css2DRendererRef.current) {
        css2DRendererRef.current.render(design3D.scene, design3D.camera);
      }
    },
    [
      isActive,
      getIntersectionPoint,
      createLineGroup,
      createDistanceLabel,
      design3D.scene,
      design3D.camera,
      design3D.renderer,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isActive) {
        event.preventDefault();
        event.stopPropagation();
        cleanupTemporary();
        startPointRef.current = null;
        design3D.renderer.render(design3D.scene, design3D.camera);
        if (css2DRendererRef.current) {
          css2DRendererRef.current.render(design3D.scene, design3D.camera);
        }
      }
    },
    [isActive, cleanupTemporary, design3D.renderer, design3D.scene, design3D.camera],
  );

  useEffect(() => {
    if (isActive) {
      cleanupAllMeasurements();
      initCSS2DRenderer();
      createSnapMarker();
      collectSnapPoints();

      if (design3D.controls) {
        design3D.controls.enabled = false;
      }

      design3D.renderer.domElement.addEventListener('click', handleClick);
      design3D.renderer.domElement.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyDown);

      document.body.style.cursor = 'crosshair';

      return () => {
        design3D.renderer.domElement.removeEventListener('click', handleClick);
        design3D.renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyDown);

        cleanupAllMeasurements();
        if (snapMarkerRef.current) {
          design3D.scene.remove(snapMarkerRef.current);
          snapMarkerRef.current.geometry.dispose();
          if (snapMarkerRef.current.material instanceof THREE.Material) {
            snapMarkerRef.current.material.dispose();
          }
          snapMarkerRef.current = null;
        }
        snapTargetsRef.current = [];
        if (css2DRendererRef.current && css2DRendererRef.current.domElement.parentNode) {
          css2DRendererRef.current.domElement.parentNode.removeChild(css2DRendererRef.current.domElement);
          css2DRendererRef.current = null;
        }

        if (design3D.controls) {
          design3D.controls.enabled = true;
        }

        startPointRef.current = null;
        document.body.style.cursor = 'default';
        design3D.renderer.render(design3D.scene, design3D.camera);
      };
    }
  }, [
    isActive,
    handleClick,
    handleMouseMove,
    handleKeyDown,
    cleanupAllMeasurements,
    initCSS2DRenderer,
    createSnapMarker,
    collectSnapPoints,
    design3D.controls,
    design3D.scene,
    design3D.renderer,
    design3D.camera,
  ]);

  useEffect(() => {
    return () => {
      cleanupAllMeasurements();
      if (css2DRendererRef.current && css2DRendererRef.current.domElement.parentNode) {
        css2DRendererRef.current.domElement.parentNode.removeChild(css2DRendererRef.current.domElement);
        css2DRendererRef.current = null;
      }
    };
  }, [cleanupAllMeasurements]);

  return null;
};

export default MeasurementTool;