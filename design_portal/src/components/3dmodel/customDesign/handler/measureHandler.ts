import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MeasureHandler } from '../interface';

export function createMeasureHandler(
  scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): MeasureHandler {
  let isMeasuring = false;
  let firstPoint: THREE.Vector3 | null = null;
  let currentLine: THREE.Group | null = null;
  let currentLabel: CSS2DObject | null = null;
  let tempLine: THREE.Group | null = null;
  let tempLabel: CSS2DObject | null = null;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let css2DRenderer: CSS2DRenderer | null = null;

  // Snapping configuration
  const SNAP_DISTANCE = 0.1;
  let snapTargets: THREE.Vector3[] = [];
  let snapMarker: THREE.Mesh | null = null;

  function initCSS2DRenderer() {
    if (!css2DRenderer) {
      css2DRenderer = new CSS2DRenderer();
      css2DRenderer.setSize(window.innerWidth, window.innerHeight);
      css2DRenderer.domElement.style.position = 'absolute';
      css2DRenderer.domElement.style.top = '0px';
      css2DRenderer.domElement.style.pointerEvents = 'none';
      document.body.appendChild(css2DRenderer.domElement);
    }
  }

  function createLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Group {
    const material = new THREE.LineBasicMaterial({
      color: 0x4287f5, // Professional blue color
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
  }

  function createArrow(base: THREE.Vector3, tip: THREE.Vector3, pointsToBase: boolean): THREE.Line {
    const direction = new THREE.Vector3().subVectors(tip, base).normalize();

    const arrowLength = 0.04;
    const arrowAngle = Math.PI / 6;
    const points = [];

    if (pointsToBase) {
      points.push(base.clone());

      const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();

      const leftWing = new THREE.Vector3().addVectors(
        base,
        new THREE.Vector3().addScaledVector(direction, arrowLength)
      );
      leftWing.addScaledVector(perpendicular, arrowLength * Math.sin(arrowAngle));
      points.push(leftWing);
      points.push(base.clone());
      const rightWing = new THREE.Vector3().addVectors(
        base,
        new THREE.Vector3().addScaledVector(direction, arrowLength)
      );
      rightWing.addScaledVector(perpendicular, -arrowLength * Math.sin(arrowAngle));
      points.push(rightWing);
    } else {
      const arrowTip = tip.clone();
      points.push(arrowTip);
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
      const leftWing = new THREE.Vector3().addVectors(
        arrowTip,
        new THREE.Vector3().addScaledVector(direction, -arrowLength)
      );
      leftWing.addScaledVector(perpendicular, arrowLength * Math.sin(arrowAngle));
      points.push(leftWing);
      points.push(arrowTip);
      const rightWing = new THREE.Vector3().addVectors(
        arrowTip,
        new THREE.Vector3().addScaledVector(direction, -arrowLength)
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
  }

  function createDistanceLabel(start: THREE.Vector3, end: THREE.Vector3): CSS2DObject {
    const distance = start.distanceTo(end) * 1000;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'measure-label';

    // Professional styling
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

    if (distance < 10) {
      labelDiv.textContent = `${distance.toFixed(2)} mm`;
    } else if (distance >= 1000) {
      const distanceCm = distance / 10;
      if (distanceCm >= 100) {
        const distanceM = distanceCm / 100;
        labelDiv.textContent = `${distanceM.toFixed(2)} m`;
      } else {
        labelDiv.textContent = `${distanceCm.toFixed(1)} cm`;
      }
    } else {
      labelDiv.textContent = `${Math.round(distance)} mm`;
    }

    const label = new CSS2DObject(labelDiv);
    const midPoint = start.clone().lerp(end, 0.5);
    label.position.copy(midPoint);

    const offset = new THREE.Vector3(0, 0.03, 0);
    label.position.add(offset);

    label.name = 'measure_label';
    return label;
  }

  function removeMeasurement() {
    if (currentLine) {
      disposeGroupContents(currentLine);
      scene.remove(currentLine);
      currentLine = null;
    }

    if (currentLabel) {
      scene.remove(currentLabel);
      currentLabel = null;
    }
    if (tempLine) {
      disposeGroupContents(tempLine);
      scene.remove(tempLine);
      tempLine = null;
    }
    if (tempLabel) {
      scene.remove(tempLabel);
      tempLabel = null;
    }
  }

  function createSnapMarker() {
    if (snapMarker) {
      scene.remove(snapMarker);
      if (snapMarker.geometry) snapMarker.geometry.dispose();
      if (snapMarker.material) {
        if (Array.isArray(snapMarker.material)) {
          snapMarker.material.forEach((mat) => mat.dispose());
        } else {
          snapMarker.material.dispose();
        }
      }
    }

    const markerGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    snapMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    snapMarker.name = 'snap_marker';
    snapMarker.renderOrder = 1000;
    scene.add(snapMarker);
    snapMarker.visible = false;
  }

  function collectSnapPoints() {
    snapTargets = [];
    scene.traverseVisible((object) => {
      if (
        object instanceof THREE.Mesh &&
        !object.name.includes('grid') &&
        !object.name.includes('helper') &&
        !object.name.includes('sky') &&
        !object.name.includes('object_outline') &&
        !object.name.includes('measure') &&
        !object.name.includes('snap_marker')
      ) {
        if (object.geometry instanceof THREE.BufferGeometry) {
          const positionAttribute = object.geometry.getAttribute('position');

          if (positionAttribute) {
            // Get vertices
            const vertices = [];
            const vertexCount = positionAttribute.count;

            for (let i = 0; i < vertexCount; i++) {
              const vertex = new THREE.Vector3();
              vertex.fromBufferAttribute(positionAttribute, i);
              vertex.applyMatrix4(object.matrixWorld);
              vertices.push(vertex);
            }

            for (let i = 0; i < vertices.length; i++) {
              let isDuplicate = false;
              for (let j = 0; j < snapTargets.length; j++) {
                if (vertices[i].distanceTo(snapTargets[j]) < 0.001) {
                  isDuplicate = true;
                  break;
                }
              }

              if (!isDuplicate) {
                snapTargets.push(vertices[i].clone());
              }
            }

            if (object.geometry.index) {
              const indices = object.geometry.index.array;
              for (let i = 0; i < indices.length; i += 3) {
                for (let j = 0; j < 3; j++) {
                  const idx1 = indices[i + j];
                  const idx2 = indices[i + ((j + 1) % 3)];

                  const v1 = new THREE.Vector3();
                  const v2 = new THREE.Vector3();
                  v1.fromBufferAttribute(positionAttribute, idx1);
                  v2.fromBufferAttribute(positionAttribute, idx2);

                  v1.applyMatrix4(object.matrixWorld);
                  v2.applyMatrix4(object.matrixWorld);

                  // Add midpoint
                  const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

                  // Check for duplicates
                  let isDuplicate = false;
                  for (let k = 0; k < snapTargets.length; k++) {
                    if (midpoint.distanceTo(snapTargets[k]) < 0.001) {
                      isDuplicate = true;
                      break;
                    }
                  }

                  if (!isDuplicate) {
                    snapTargets.push(midpoint);
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  function findNearestSnapPoint(point: THREE.Vector3): THREE.Vector3 | null {
    let minDistance = SNAP_DISTANCE;
    let nearestPoint = null;
    for (let i = 0; i < snapTargets.length; i++) {
      const distance = point.distanceTo(snapTargets[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = snapTargets[i];
      }
    }

    return nearestPoint;
  }
  function getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const meshes: THREE.Object3D[] = [];
    scene.traverseVisible((object) => {
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
        if (snapMarker) {
          snapMarker.position.copy(snappedPoint);
          snapMarker.visible = true;
        }
        return snappedPoint;
      } else {
        if (snapMarker) {
          snapMarker.visible = false;
        }
      }
      return intersectionPoint;
    }

    const intersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersect)) {
      if (snapMarker) {
        snapMarker.visible = false;
      }
      return intersect;
    }
    return null;
  }

  function onMouseClick(event: MouseEvent) {
    if (!isMeasuring) return;

    const intersect = getIntersectionPoint(event);
    if (!intersect) return;

    if (!firstPoint) {
      firstPoint = intersect.clone();
      const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5,
        transparent: true,
        opacity: 0.9,
      });

      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(firstPoint);
      marker.name = 'measure_start_marker';
      scene.add(marker);
    } else {
      const secondPoint = intersect.clone();
      removeMeasurement();

      // Remove the start marker
      scene.children.forEach((obj) => {
        if (obj.name === 'measure_start_marker') {
          scene.remove(obj);
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((mat) => mat.dispose());
              } else {
                obj.material.dispose();
              }
            }
          }
        }
      });
      currentLine = createLine(firstPoint, secondPoint);
      currentLabel = createDistanceLabel(firstPoint, secondPoint);
      scene.add(currentLine);
      scene.add(currentLabel);

      const lineDirection = new THREE.Vector3().subVectors(secondPoint, firstPoint).normalize();
      const perpendicularUp = new THREE.Vector3(0, 1, 0);
      const offset = new THREE.Vector3()
        .crossVectors(lineDirection, perpendicularUp)
        .normalize()
        .multiplyScalar(0.01);
      currentLine.position.add(offset);
      firstPoint = null;
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (!isMeasuring || !firstPoint) return;

    const intersect = getIntersectionPoint(event);
    if (!intersect) return;

    if (tempLine) {
      disposeGroupContents(tempLine);
      scene.remove(tempLine);
    }

    if (tempLabel) {
      scene.remove(tempLabel);
    }

    tempLine = createLine(firstPoint, intersect);
    tempLabel = createDistanceLabel(firstPoint, intersect);
    scene.add(tempLine);
    scene.add(tempLabel);
    const lineDirection = new THREE.Vector3().subVectors(intersect, firstPoint).normalize();
    const perpendicularUp = new THREE.Vector3(0, 1, 0);
    const offset = new THREE.Vector3()
      .crossVectors(lineDirection, perpendicularUp)
      .normalize()
      .multiplyScalar(0.01);
    tempLine.position.add(offset);
  }

  function disposeGroupContents(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((material) => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isMeasuring) {
      removeMeasurement();
      firstPoint = null;
    }
  }

  function render() {
    if (snapMarker && snapMarker.visible) {
      const time = Date.now() * 0.003;
      const scale = 1.0 + 0.2 * Math.sin(time);
      snapMarker.scale.set(scale, scale, scale);
    }
    if (css2DRenderer) {
      css2DRenderer.render(scene, camera);
    }
  }

  function activate() {
    if (isMeasuring) return;
    isMeasuring = true;
    initCSS2DRenderer();
    createSnapMarker();
    collectSnapPoints();

    // Add event listeners
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    const animate = () => {
      if (isMeasuring) {
        render();
        requestAnimationFrame(animate);
      }
    };
    animate();
    document.body.style.cursor = 'crosshair';
  }

  function deactivate() {
    if (!isMeasuring) return;
    isMeasuring = false;
    removeMeasurement();
    firstPoint = null;

    const startMarker = scene.children.find((obj) => obj.name === 'measure_start_marker');
    if (startMarker) {
      scene.remove(startMarker);
      if (startMarker instanceof THREE.Mesh) {
        startMarker.geometry.dispose();
        if (startMarker.material) {
          if (Array.isArray(startMarker.material)) {
            startMarker.material.forEach((mat) => mat.dispose());
          } else {
            startMarker.material.dispose();
          }
        }
      }
    }

    // Remove snap marker
    if (snapMarker) {
      scene.remove(snapMarker);
      if (snapMarker.geometry) snapMarker.geometry.dispose();
      if (snapMarker.material) {
        if (Array.isArray(snapMarker.material)) {
          snapMarker.material.forEach((mat) => mat.dispose());
        } else {
          snapMarker.material.dispose();
        }
      }
      snapMarker = null;
    }

    snapTargets = [];
    renderer.domElement.removeEventListener('click', onMouseClick);
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.body.style.cursor = 'default';
    if (css2DRenderer && css2DRenderer.domElement && css2DRenderer.domElement.parentNode) {
      css2DRenderer.domElement.parentNode.removeChild(css2DRenderer.domElement);
      css2DRenderer = null;
    }
  }

  return { activate, deactivate };
}
