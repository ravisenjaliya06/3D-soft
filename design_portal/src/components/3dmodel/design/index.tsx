import commonService from '@/services/CommonService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { loadDesignObjects } from '../handler/items';
import { MoveHandler } from '../handler/moveHandler';
import { useAppDispatch, useAppSelector } from '../hooks';
import { ResponseStatus } from '../interface';
import { store } from '../store';
import {
  addObjects,
  copyObjectsThunk,
  removeObjectWithHistory,
  setHoverdMesh,
  setobjectSelected,
  setSelectedChildObject,
  updateObjectPosition,
} from '../store/dataSlice';
import { addToHistory } from '../store/historySlice';
import { Object3D } from '../store/interface';
import { setScene } from '../store/sceneSlice';
import HelperTools from './HelperTools';
import { DesignProps, itemType, ThreeDView } from './interface';
import MeasurementTool from './MeasurementTool';
import {
  cleanupThreeDView,
  clearAllPlankDimensions,
  enablePlankDimensionEditing,
  init3DDesign,
  showPlankDimensions,
} from './scene';

export const gettingDesignID = () => {
  const designID = window.location.pathname.split('/')[2];
  return designID;
};

export function removeExistingLines() {
  const design3D = store.getState().scene.scene;

  const toRemove: THREE.Object3D[] = [];

  design3D.traverse((child) => {
    if (child.name.includes('outline')) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((obj) => {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
}

export function createOutlineForObject(
  obj: THREE.Object3D,
): THREE.LineSegments | null {
  if (!obj) return null;
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const geo = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(size.x, size.y, size.z),
  );
  const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const outline = new THREE.LineSegments(geo, mat);
  outline.name = `outline-${obj.id}`;
  outline.position.copy(center);
  outline.userData.isOutline = true;
  return outline;
}

const Design: React.FC<DesignProps> = ({ setDesign3D }) => {
  const dispatch = useAppDispatch();
  const sceneFromState = useAppSelector((state) => state.scene.scene);
  const isQuickHideActive = useAppSelector(
    (state) => state.data.isQuickHideActive,
  );
  const isMeasurementActive = useAppSelector(
    (state) => state.data.isMeasurementActive,
  );
  const isAlignmentActive = useAppSelector(
    (state) => state.data.isAlignmentActive,
  );

  const currentUnitType = useAppSelector((state) => state.data.currentUnitType);
  const objects = useAppSelector((state) => state.data.objects);
  const mountRef = useRef<HTMLDivElement>(null);
  const [design3D, setLocalDesign3D] = useState<ThreeDView | null>(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Mesh | null>(null);
  const [outline, setOutline] = useState<THREE.Object3D | null>(null);
  const [helperTools, setHelperTools] = useState<boolean>(false);
  const [toolPosition, setToolPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [moveHandler, setMoveHandler] = useState<MoveHandler | null>(null);
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const originalMaterialsRef = useRef(new Map());
  const outlinesRef = useRef(new Map<THREE.Mesh, THREE.LineSegments>());
  const dimensionLabelsRef = useRef(new Map<THREE.Mesh, THREE.Sprite[]>());
  const hoverOutlineRef = useRef<THREE.LineSegments | null>(null);
  const lastHoveredObjectRef = useRef<THREE.Mesh | null>(null);
  const alignmentIndicatorsRef = useRef<THREE.Object3D[]>([]);
  // const linesRef = useRef(new Map<THREE.Mesh, THREE.Line[]>());
  const childOutlineGroupsRef = useRef(new Map<THREE.Mesh, THREE.Group>());
  const minifixMarkersRef = useRef<Map<THREE.Mesh, THREE.Object3D[]>>(
    new Map(),
  );

  const showAlignmentDistances = useCallback(() => {
    if (!design3D) return;

    alignmentIndicatorsRef.current.forEach((indicator) => {
      design3D.scene.remove(indicator);
      if (indicator instanceof THREE.Line && indicator.geometry) {
        indicator.geometry.dispose();
      }
      if (indicator instanceof THREE.Sprite && indicator.material) {
        if (indicator.material.map) indicator.material.map.dispose();
        indicator.material.dispose();
      }
    });
    alignmentIndicatorsRef.current = [];

    const topLevelObjects: THREE.Mesh[] = [];
    design3D.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.parent instanceof THREE.Scene &&
        object.name !== 'grid' &&
        object.name !== 'floor' &&
        object.name !== 'daysky' &&
        object.name !== 'nightsky' &&
        !(object instanceof THREE.GridHelper)
      ) {
        topLevelObjects.push(object);
      }
    });

    if (topLevelObjects.length < 2) {
      design3D.renderer.render(design3D.scene, design3D.camera);
      return;
    }

    for (let i = 0; i < topLevelObjects.length; i++) {
      for (let j = i + 1; j < topLevelObjects.length; j++) {
        const obj1 = topLevelObjects[i];
        const obj2 = topLevelObjects[j];

        const box1 = new THREE.Box3().setFromObject(obj1);
        const box2 = new THREE.Box3().setFromObject(obj2);

        const closestPoint1 = new THREE.Vector3();
        const closestPoint2 = new THREE.Vector3();

        const findClosestPoints = (
          boxA: THREE.Box3,
          boxB: THREE.Box3,
          pointA: THREE.Vector3,
          pointB: THREE.Vector3,
        ) => {
          pointA.copy(
            boxA.clampPoint(
              boxB.getCenter(new THREE.Vector3()),
              new THREE.Vector3(),
            ),
          );
          pointB.copy(boxB.clampPoint(pointA, new THREE.Vector3()));
        };

        findClosestPoints(box1, box2, closestPoint1, closestPoint2);

        const distance = closestPoint1.distanceTo(closestPoint2);
        if (distance < 0.01) continue;

        const distanceInUnit =
          currentUnitType === 'cm' ? distance * 100 : distance;
        const distanceText = `${distanceInUnit.toFixed(2)} ${currentUnitType}`;

        const line = createDistanceLine(closestPoint1, closestPoint2);
        design3D.scene.add(line);
        alignmentIndicatorsRef.current.push(line);

        const midPoint = closestPoint1.clone().lerp(closestPoint2, 0.5);
        const sprite = createAlignDimension(distanceText, midPoint);
        if (sprite) {
          design3D.scene.add(sprite);
          alignmentIndicatorsRef.current.push(sprite);
        }
      }
    }

    design3D.renderer.render(design3D.scene, design3D.camera);
  }, [design3D, currentUnitType]);

  // Handle alignment mode
  useEffect(() => {
    if (!design3D) return;

    if (isAlignmentActive) {
      showAlignmentDistances();
    } else {
      alignmentIndicatorsRef.current.forEach((indicator) => {
        design3D.scene.remove(indicator);
        if (indicator instanceof THREE.Line && indicator.geometry) {
          indicator.geometry.dispose();
        }
        if (indicator instanceof THREE.Sprite && indicator.material) {
          if (indicator.material.map) indicator.material.map.dispose();
          indicator.material.dispose();
        }
      });
      alignmentIndicatorsRef.current = [];
    }

    return () => {
      alignmentIndicatorsRef.current.forEach((indicator) => {
        if (design3D) {
          design3D.scene.remove(indicator);
        }
        if (indicator instanceof THREE.Line && indicator.geometry) {
          indicator.geometry.dispose();
        }
        if (indicator instanceof THREE.Sprite && indicator.material) {
          if (indicator.material.map) indicator.material.map.dispose();
          indicator.material.dispose();
        }
      });
      alignmentIndicatorsRef.current = [];
    };
  }, [design3D, isAlignmentActive, showAlignmentDistances]);

  // This must be inside the component
  //   debounce(showAlignmentDistances, 100),
  //   [showAlignmentDistances],
  // );

  useEffect(() => {
    if (mountRef.current && !design3D) {
      const initializeScene = async () => {
        if (!mountRef.current) return;

        const threeDView = await init3DDesign(mountRef.current);
        setLocalDesign3D(threeDView);
        setDesign3D(threeDView);
        dispatch(setScene(threeDView.scene));
        enablePlankDimensionEditing(threeDView);
        const handler = new MoveHandler({
          scene: threeDView.scene,
          camera: threeDView.camera as THREE.PerspectiveCamera,
          renderer: threeDView.renderer,
          movableObjects: [],
          // onDragUpdate: (object, position) => {
          //   if (isAlignmentActive) {
          //     debouncedShowAlignmentDistances(); // Update alignment dimensions during drag
          //   }
          // },
        });
        setMoveHandler(handler);

        const designId = gettingDesignID();
        if (designId) {
          try {
            const loadedObjects = await loadDesignObjects(
              designId,
              threeDView.scene,
            );
            dispatch(addObjects(loadedObjects));
          } catch (error) {
            console.error('Failed to load design objects:', error);
          }
        } else {
          console.warn('No designId found in URL');
        }

        threeDView.scene.traverse((object) => {
          if (
            object.name === 'grid' ||
            object instanceof THREE.GridHelper ||
            object.name === 'floor' ||
            object.name === 'Sky'
          ) {
            object.raycast = () => [];
          }
        });
      };

      initializeScene();

      return () => {
        if (design3D) {
          cleanupThreeDView(design3D);
          setDesign3D(null);
          setLocalDesign3D(null);
          if (moveHandler) {
            moveHandler.disableDragging();
          }
        }
      };
    }
  }, [
    design3D,
    setDesign3D,
    dispatch,
    isAlignmentActive,
    // debouncedShowAlignmentDistances,
  ]);

  useEffect(() => {
    if (design3D && sceneFromState) {
      sceneFromState.children.forEach((child) => {
        if (!design3D.scene.getObjectById(child.id)) {
          design3D.scene.add(child.clone());
        }
      });
      design3D.renderer.render(design3D.scene, design3D.camera);
    }
  }, [sceneFromState, design3D]);

  const createAlignDimension = (message: string, position: THREE.Vector3) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get 2D context for text sprite');
      return null;
    }

    canvas.width = 8000;
    canvas.height = 1120;
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(0, 0, 0, 1)';
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 60rem Arial';
    context.fillStyle = 'rgba(0, 0, 0, 1.0)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(0.15, 0.06, 1); // Smaller scale to reduce overlap
    return sprite;
  };

  // Create a line for distance visualization
  const createDistanceLine = (start: THREE.Vector3, end: THREE.Vector3) => {
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2,
    });
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.name = 'distance_line';
    return line;
  };

  // Calculate and display distances for alignment

  useEffect(() => {
    if (!design3D) return;
    const toggleOutline = () => {
      design3D.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.name !== 'grid' &&
          object.name !== 'floor' &&
          object.name !== 'daysky' &&
          object.name !== 'nightsky' &&
          !(object instanceof THREE.GridHelper)
        ) {
          const mesh = object as THREE.Mesh;
          const isTopLevel = object.parent instanceof THREE.Scene;

          if (isQuickHideActive) {
            if (!originalMaterialsRef.current.has(mesh)) {
              originalMaterialsRef.current.set(mesh, mesh.material);
            }

            const hiddenMaterial = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            mesh.material = hiddenMaterial;

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => (mat.needsUpdate = true));
            } else if (mesh.material instanceof THREE.Material) {
              mesh.material.needsUpdate = true;
            }

            if (isTopLevel) {
              const labels: THREE.Sprite[] = [];
              const outlineGroup = new THREE.Group();
              outlineGroup.position.copy(mesh.position);
              outlineGroup.scale.set(0.01, 0.01, 0.01);
              outlineGroup.name = `outline_group_${mesh.uuid}`;

              const processedPlankTypes = new Set<string>();
              mesh.userData.processedPlankTypes = processedPlankTypes;

              const minifixMarkers: THREE.Object3D[] = [];

              mesh.traverse((child) => {
                if (child.name.includes('Minifix')) {
                  child.visible = true;
                }
                const childName = child.name;

                if (
                  child instanceof THREE.Mesh &&
                  childName.toLowerCase().includes('minifix')
                ) {
                  let colorHex = 0xcc0000;
                  const lowerName = childName.toLowerCase();
                  if (lowerName.includes('screw')) colorHex = 0x0066cc;
                  else if (lowerName.includes('cam')) colorHex = 0xcc0000;
                  else if (lowerName.includes('dowel')) colorHex = 0x00cc00;
                  else if (
                    lowerName.includes('bolt') ||
                    lowerName.includes('drill')
                  )
                    colorHex = 0x999999;

                  const cylGeo = new THREE.CylinderGeometry(
                    0.004,
                    0.004,
                    0.008,
                    16,
                  );
                  const cylMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(colorHex),
                  });
                  const marker = new THREE.Mesh(cylGeo, cylMat);

                  child.updateWorldMatrix(true, true);
                  marker.position.setFromMatrixPosition(child.matrixWorld);

                  const normalMatrix = new THREE.Matrix3().getNormalMatrix(
                    child.matrixWorld,
                  );
                  const direction = new THREE.Vector3(0, 1, 0)
                    .applyMatrix3(normalMatrix)
                    .normalize();

                  const quaternion = new THREE.Quaternion();
                  quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction,
                  );
                  marker.quaternion.copy(quaternion);

                  marker.name = `minifix_marker_${child.uuid}`;
                  marker.renderOrder = 2;

                  design3D.scene.add(marker);
                  minifixMarkers.push(marker);
                }

                const isVerticalPlank = childName.includes('VERTICAL');
                const isHorizontalPlank = childName.includes('HORIZONTAL');
                const isStandardPlank = [
                  'LEFT_PLANK',
                  'RIGHT_PLANK',
                  'TOP_PLANK',
                  'BOTTOM_PLANK',
                  'BACK_PLANK',
                ].includes(childName);

                if (
                  child instanceof THREE.Mesh &&
                  (isStandardPlank || isVerticalPlank || isHorizontalPlank)
                ) {
                  child.updateMatrixWorld(true);

                  const box = new THREE.Box3().setFromObject(child);
                  const size = new THREE.Vector3();
                  box.getSize(size);
                  const center = new THREE.Vector3();
                  box.getCenter(center);

                  const labelPosition = new THREE.Vector3();

                  let plankKey = childName;
                  if (
                    childName === 'LEFT_PLANK' ||
                    childName === 'RIGHT_PLANK'
                  ) {
                    plankKey = 'SIDE_PLANK';
                  } else if (childName === 'TOP_PLANK') {
                    plankKey = 'HORIZONTAL_TOP_PLANK';
                  } else if (childName === 'BOTTOM_PLANK') {
                    plankKey = 'HORIZONTAL_BOTTOM_PLANK';
                  } else if (childName === 'BACK_PLANK') {
                    plankKey = 'BACK_PLANK';
                  }

                  if (processedPlankTypes.has(plankKey))
                    processedPlankTypes.add(plankKey);

                  if (childName === 'LEFT_PLANK') {
                    labelPosition.set(box.min.x - 0.05, center.y, center.z);
                  } else if (childName === 'RIGHT_PLANK') {
                    labelPosition.set(box.max.x + 0.05, center.y, center.z);
                  } else if (childName === 'TOP_PLANK') {
                    labelPosition.set(center.x, box.max.y + 0.05, center.z);
                  } else if (childName === 'BOTTOM_PLANK') {
                    labelPosition.set(center.x, box.min.y - 0.05, center.z);
                  } else if (childName === 'BACK_PLANK') {
                    labelPosition.set(center.x, center.y, box.min.z - 0.05);
                  } else if (isVerticalPlank || isHorizontalPlank) {
                    labelPosition.set(center.x, center.y, box.max.z + 0.05);
                  }

                  // const sprite = createTextSprite(labelText, labelPosition);
                  // if (sprite) {
                  //   design3D.scene.add(sprite);
                  //   labels.push(sprite);
                  // }

                  if (child.geometry) {
                    const edges = new THREE.EdgesGeometry(child.geometry);
                    const outlineMaterial = new THREE.LineBasicMaterial({
                      color: 0x392579,
                      linewidth: 1,
                      depthTest: false,
                    });
                    const childOutline = new THREE.LineSegments(
                      edges,
                      outlineMaterial,
                    );
                    childOutline.position.copy(child.position);
                    childOutline.rotation.copy(child.rotation);
                    childOutline.scale.set(1, 1, 1);
                    childOutline.name = `outline_${childName}`;
                    childOutline.renderOrder = 1;
                    outlineGroup.add(childOutline);
                  }
                  // === Add groove outlines if grooves exist ===
                  if (Array.isArray(child.userData.grooves)) {
                    child.userData.grooves.forEach((groove) => {
                      const position = groove.position;
                      const orientation = groove.orientation;
                      const grooveType = groove.type;

                      // Scale groove values (if needed)
                      const scaleFactor = 0.01; // Adjust if your scene scale differs
                      const grooveGeometry = new THREE.BufferGeometry();
                      const grooveMaterial = new THREE.LineBasicMaterial({
                        color: grooveType === 'fitment' ? 0xff0000 : 0x0000ff,
                        linewidth: 1,
                        depthTest: false,
                      });

                      // Define start and end points based on groove orientation
                      const points: THREE.Vector3[] = [];
                      const childWorldPos = new THREE.Vector3();
                      child.getWorldPosition(childWorldPos);

                      const localOffset = new THREE.Vector3(
                        groove.x * scaleFactor,
                        groove.y * scaleFactor,
                        0,
                      );

                      if (orientation === 'horizontal') {
                        points.push(
                          new THREE.Vector3(
                            -child.geometry.parameters.width / 2,
                            0,
                            0,
                          ).add(localOffset),
                          new THREE.Vector3(
                            child.geometry.parameters.width / 2,
                            0,
                            0,
                          ).add(localOffset),
                        );
                      } else if (orientation === 'vertical') {
                        points.push(
                          new THREE.Vector3(
                            0,
                            -child.geometry.parameters.height / 2,
                            0,
                          ).add(localOffset),
                          new THREE.Vector3(
                            0,
                            child.geometry.parameters.height / 2,
                            0,
                          ).add(localOffset),
                        );
                      }

                      grooveGeometry.setFromPoints(points);
                      const grooveLine = new THREE.Line(
                        grooveGeometry,
                        grooveMaterial,
                      );

                      grooveLine.position.copy(position);
                      grooveLine.rotation.copy(child.rotation);
                      grooveLine.scale.copy(child.scale);

                      grooveLine.name = `groove_outline_${child.name}`;
                      grooveLine.renderOrder = 2;

                      outlineGroup.add(grooveLine);
                    });
                  }
                }
              });

              if (outlineGroup.children.length > 0) {
                design3D.scene.add(outlineGroup);
                childOutlineGroupsRef.current.set(mesh, outlineGroup);
              }

              if (labels.length > 0) {
                dimensionLabelsRef.current.set(mesh, labels);
              }

              if (minifixMarkers.length > 0) {
                minifixMarkersRef.current.set(mesh, minifixMarkers);
              }
            }
          } else {
            if (originalMaterialsRef.current.has(mesh)) {
              mesh.material = originalMaterialsRef.current.get(mesh);
              (mesh.material as THREE.Material).needsUpdate = true;
            }

            design3D.scene.traverse((object) => {
              if (object.name.includes('Minifix')) {
                object.visible = false;
              }
            });

            if (isTopLevel) {
              const outline = outlinesRef.current.get(mesh);
              if (outline) {
                design3D.scene.remove(outline);
                outline.geometry?.dispose();
                if (outline.material instanceof THREE.Material)
                  outline.material.dispose();
                outlinesRef.current.delete(mesh);
              }

              const labels = dimensionLabelsRef.current.get(mesh);
              if (labels) {
                labels.forEach((label) => {
                  design3D.scene.remove(label);
                  if (label.material.map) label.material.map.dispose();
                  if (label.material instanceof THREE.Material)
                    label.material.dispose();
                });
                dimensionLabelsRef.current.delete(mesh);
              }

              const outlineGroup = childOutlineGroupsRef.current.get(mesh);
              if (outlineGroup) {
                outlineGroup.children.forEach((child) => {
                  if (child instanceof THREE.LineSegments) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material)
                      child.material.dispose();
                  }
                });
                design3D.scene.remove(outlineGroup);
                childOutlineGroupsRef.current.delete(mesh);
              }

              const markers = minifixMarkersRef.current.get(mesh);
              if (markers) {
                markers.forEach((marker) => {
                  design3D.scene.remove(marker);
                });
                minifixMarkersRef.current.delete(mesh);
              }
            }
          }
        }
      });
    };

    toggleOutline();

    return () => {
      outlinesRef.current.forEach((outline) => {
        design3D.scene.remove(outline);
        outline.geometry?.dispose();
        if (outline.material instanceof THREE.Material)
          outline.material.dispose();
      });
      outlinesRef.current.clear();

      dimensionLabelsRef.current.forEach((labels) => {
        labels.forEach((label) => {
          design3D.scene.remove(label);
          if (label.material.map) label.material.map.dispose();
          if (label.material instanceof THREE.Material)
            label.material.dispose();
        });
      });
      dimensionLabelsRef.current.clear();

      childOutlineGroupsRef.current.forEach((group) => {
        group.children.forEach((child) => {
          if (child instanceof THREE.LineSegments) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material)
              child.material.dispose();
          }
        });
        design3D.scene.remove(group);
      });
      childOutlineGroupsRef.current.clear();

      minifixMarkersRef.current.forEach((markers) => {
        markers.forEach((marker) => {
          design3D.scene.remove(marker);
        });
      });
      minifixMarkersRef.current.clear();
    };
  }, [design3D, isQuickHideActive, objects]);

  const createSelectionOutline = (mesh: THREE.Mesh) => {
    if (!mesh.geometry) return null;

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      depthTest: false,
    });
    const outlineLines = new THREE.LineSegments(edges, outlineMaterial);

    outlineLines.position.copy(mesh.position);
    outlineLines.rotation.copy(mesh.rotation);
    outlineLines.scale.copy(mesh.scale);
    outlineLines.name = 'selected_outline';
    outlineLines.userData.isOutline = true;
    outlineLines.userData.outlineFor = mesh.userData.objectId;

    return outlineLines;
  };

  const createHoverOutline = (
    mesh: THREE.Mesh,
    worldPosition: THREE.Vector3,
  ) => {
    if (!mesh.geometry) return null;

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x0088ff,
      linewidth: 2,
      depthTest: false,
    });
    const outlineLines = new THREE.LineSegments(edges, outlineMaterial);

    outlineLines.position.copy(worldPosition);
    outlineLines.scale.copy(mesh.parent?.scale || new THREE.Vector3(1, 1, 1));
    outlineLines.name = 'hover_outline';

    return outlineLines;
  };

  const updateHelperToolsPosition = useCallback(() => {
    if (!design3D || !selectedObject) return;

    if (selectedObject instanceof THREE.Mesh) {
      const vector = new THREE.Vector3();
      vector.setFromMatrixPosition(selectedObject.matrixWorld);
      vector.project(design3D.camera);
      const offset = { x: 30, y: -40 };
      const x = ((vector.x + 1) / 2) * window.innerWidth + offset.x;
      const y = (-(vector.y - 1) / 2) * window.innerHeight + offset.y;
      setToolPosition({ x, y });
    }
  }, [design3D, selectedObject]);

  useEffect(() => {
    if (!design3D) return;

    if (outline) {
      design3D.scene.remove(outline);
      if (outline instanceof THREE.LineSegments) {
        outline.geometry?.dispose();
        if (outline.material instanceof THREE.Material) {
          outline.material.dispose();
        } else if (Array.isArray(outline.material)) {
          outline.material.forEach((material) => material.dispose());
        }
      }
      setOutline(null);
    }

    if (selectedObject instanceof THREE.Mesh) {
      const selectedObjectId = store.getState().data.selectedObject;
      const scene = store.getState().scene.scene;
      const newOutline = createSelectionOutline(selectedObject);
      if (newOutline) {
        scene.children.forEach((child) => {
          if (child.children.length > 0) {
            child.children.forEach((grandChild) => {
              if (grandChild.name === 'selected_outline') {
                child.remove(grandChild);
              }
            });
          }
        });
        if (selectedObject.parent?.userData.objectId === selectedObjectId) {
          selectedObject.parent?.add(newOutline);
        } else {
          design3D.scene.add(newOutline);
        }
        setOutline(newOutline);
      }

      updateHelperToolsPosition();

      if (design3D.controls) {
        design3D.controls.addEventListener('change', updateHelperToolsPosition);
      }
    }

    return () => {
      if (design3D && design3D.controls) {
        design3D.controls.removeEventListener(
          'change',
          updateHelperToolsPosition,
        );
      }
    };
  }, [selectedObject, design3D, updateHelperToolsPosition]);

  const createBoundingBoxOutline = (
    object: THREE.Object3D,
  ): THREE.LineSegments | null => {
    if (!object) return null;

    try {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0xffff00 }),
      );
      wireframe.position.copy(center);
      wireframe.rotation.copy(object.rotation);

      wireframe.name = `outline-${object.id}`;

      return wireframe;
    } catch (error) {
      console.error('Error creating outline:', error);
      return null;
    }
  };

  const handleObjectSelection = () => {
    removeExistingLines();
    if (design3D) {
      clearAllPlankDimensions(design3D.scene);
    }
    if (!design3D) return;

    let newOutline: THREE.LineSegments | null = null;
    const hoveredMesh = store.getState().data
      .hoverdMesh as unknown as THREE.Mesh | null;
    const selectedObjectId = store.getState().data.selectedObject;
    const selectedChildObjectId = store.getState().data.selectedChildObject;
    console.log('Hovered Mesh on Click:', hoveredMesh);
    console.log('Selected Object ID:', selectedObjectId);
    console.log('Selected Child Object ID:', selectedChildObjectId);

    if (!hoveredMesh) {
      dispatch(setobjectSelected(null));
      dispatch(setSelectedChildObject(null));
      return;
    }

    if (
      hoveredMesh?.parent?.userData.objectId !== selectedObjectId &&
      hoveredMesh?.parent?.userData.type === itemType.CUPBOARD
    ) {
      dispatch(setobjectSelected(hoveredMesh?.parent?.userData.objectId));
      setHelperTools(true);
      if (hoveredMesh.parent instanceof THREE.Mesh) {
        setSelectedObject(hoveredMesh.parent);
      }
      newOutline = createOutlineForObject(hoveredMesh.parent);
    } else if (
      hoveredMesh?.parent?.userData.objectId !== selectedChildObjectId &&
      (hoveredMesh?.parent?.userData.type === itemType.DRAWER ||
        hoveredMesh?.parent?.userData.type === itemType.DOOR)
    ) {
      dispatch(setSelectedChildObject(hoveredMesh?.parent?.userData.objectId));
      setHelperTools(true);
      if (hoveredMesh.parent instanceof THREE.Mesh) {
        setSelectedObject(hoveredMesh.parent);
      }
      newOutline = createOutlineForObject(hoveredMesh.parent);
    } else {
      dispatch(setSelectedChildObject(hoveredMesh?.userData.objectId));
      setHelperTools(true);
      setSelectedObject(hoveredMesh as THREE.Mesh);
      if (!hoveredMesh.name.includes('WALL')) {
        setHelperTools(false);
        setSelectedObject(null);
      }
      newOutline = createOutlineForObject(hoveredMesh || null);
    }
    if (newOutline) design3D.scene.add(newOutline);

    // If a plank is selected, show CAD-like dimensions
    const tryShowDims = (m: THREE.Object3D | null) => {
      if (!design3D || !m) return;
      const name = m.name.toUpperCase();
      if (
        name.includes('VERTICAL_PLANK') ||
        name.includes('HORIZONTAL_PLANK')
      ) {
        if (m instanceof THREE.Mesh) {
          showPlankDimensions(design3D.scene, m);
        }
      }
    };

    const hoveredObj = hoveredMesh as unknown as THREE.Object3D | null;
    if (hoveredMesh instanceof THREE.Mesh) {
      tryShowDims(hoveredMesh);
    } else if (hoveredObj?.parent instanceof THREE.Mesh) {
      tryShowDims(hoveredObj.parent);
    }
    design3D.renderer.render(design3D.scene, design3D.camera);
  };

  const SELECTABLE_KEYS = ['PLANK', 'DOOR', 'DRAWER', 'INVISIBLEBOX', 'WALL'];
  const isSelectableMesh = (obj: THREE.Object3D) =>
    obj instanceof THREE.Mesh &&
    SELECTABLE_KEYS.some((key) => obj.name.toUpperCase().includes(key));

  const handleObjectHover = useCallback(
    (event: MouseEvent) => {
      if (!design3D || isQuickHideActive || isMeasurementActive) return;
      const selectedChildObjectId = store.getState().data.selectedChildObject;
      const selectedInvisibleBoxId = store.getState().data.selectedInvisibleBox;

      /** 1. Mouse setup */
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1 + 0.15,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, design3D.camera);

      /** 2. Remove previous hover outline if any */
      if (hoverOutlineRef.current) {
        design3D.scene.remove(hoverOutlineRef.current);
        hoverOutlineRef.current.geometry?.dispose();
        if (hoverOutlineRef.current.material instanceof THREE.Material) {
          hoverOutlineRef.current.material.dispose();
        }
        hoverOutlineRef.current = null;
        lastHoveredObjectRef.current = null;
      }

      /** 3. Collect relevant meshes */
      const invisibleBoxes: THREE.Object3D[] = [];
      const selectableParts: THREE.Mesh[] = [];

      design3D.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (isSelectableMesh(obj)) {
            selectableParts.push(obj);
          } else if (obj.name.includes(itemType.INVISIBLE_BOX)) {
            invisibleBoxes.push(obj);
          }
        }
      });

      /** 4. Raycasting */
      const hitsSelectable = raycaster.intersectObjects(selectableParts, false);

      let hoveredMesh: THREE.Mesh | null = null;

      if (hitsSelectable.length > 0) {
        hoveredMesh = hitsSelectable[0].object as THREE.Mesh;
        if (
          hoveredMesh?.userData.objectId === selectedChildObjectId &&
          hitsSelectable.length > 1
        ) {
          hoveredMesh = hitsSelectable[1].object as THREE.Mesh;
        } else if (
          hoveredMesh?.name.includes(itemType.INVISIBLE_BOX) &&
          (hoveredMesh as THREE.Mesh)?.userData.objectId ===
            selectedInvisibleBoxId
        ) {
          hoveredMesh = hitsSelectable[2].object as THREE.Mesh;
        }
      }

      if (hoveredMesh) {
        dispatch(setHoverdMesh(hoveredMesh));
        lastHoveredObjectRef.current = hoveredMesh;

        const worldPosition = hoveredMesh.getWorldPosition(new THREE.Vector3());
        const outline = createHoverOutline(hoveredMesh, worldPosition);
        if (outline) {
          design3D.scene.add(outline);
          hoverOutlineRef.current = outline;
        }
      } else {
        dispatch(setHoverdMesh(null));
      }

      /** 5. Re-render */
      design3D.renderer.render(design3D.scene, design3D.camera);
    },
    [design3D, isQuickHideActive, isMeasurementActive, dispatch],
  );

  useEffect(() => {
    if (isMeasurementActive && design3D && hoverOutlineRef.current) {
      design3D.scene.remove(hoverOutlineRef.current);
      if (hoverOutlineRef.current.geometry) {
        hoverOutlineRef.current.geometry.dispose();
      }
      if (hoverOutlineRef.current.material instanceof THREE.Material) {
        hoverOutlineRef.current.material.dispose();
      }
      hoverOutlineRef.current = null;
      lastHoveredObjectRef.current = null;
    }
  }, [isMeasurementActive, design3D]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      if (!design3D || !helperTools) return;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, design3D.camera);
      const intersects = raycaster.intersectObjects(
        design3D.scene.children,
        true,
      );

      if (intersects.length === 0) {
        setHelperTools(false);
        return;
      }
      let hitFurnitureObject = false;

      for (const intersect of intersects) {
        let currentObject = intersect.object;

        while (currentObject && !(currentObject instanceof THREE.Mesh)) {
          currentObject = currentObject.parent as THREE.Object3D;
        }
        if (
          currentObject &&
          currentObject instanceof THREE.Mesh &&
          currentObject.name !== 'grid' &&
          !(currentObject instanceof THREE.GridHelper) &&
          currentObject.name !== 'floor' &&
          currentObject.name !== 'daysky' &&
          currentObject.name !== 'nightsky' &&
          currentObject.userData.objectId
        ) {
          hitFurnitureObject = true;
          break;
        }
      }

      if (!hitFurnitureObject) {
        setHelperTools(false);
      }
    },
    [design3D, helperTools],
  );

  useEffect(() => {
    window.addEventListener('dblclick', handleObjectSelection);
    window.addEventListener('click', handleCanvasClick);
    window.addEventListener('mousemove', handleObjectHover);

    return () => {
      window.removeEventListener('dblclick', handleObjectSelection);
      window.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('mousemove', handleObjectHover);

      // Clean up hover outline
      if (design3D && hoverOutlineRef.current) {
        design3D.scene.remove(hoverOutlineRef.current);
        if (hoverOutlineRef.current.geometry)
          hoverOutlineRef.current.geometry.dispose();
        if (hoverOutlineRef.current.material instanceof THREE.Material) {
          hoverOutlineRef.current.material.dispose();
        }
        hoverOutlineRef.current = null;
      }
    };
  }, [design3D, handleObjectHover, handleCanvasClick]);

  const deleteObject = async () => {
    removeExistingLines();
    return new Promise<void>(async (reject) => {
      if (!selectedObject || !selectedObject.userData.objectId) {
        reject(console.error('No selected object or missing object ID'));
        return;
      }

      const formData = new FormData();
      formData.append('ids', selectedObject.userData.objectId);

      const response = (await commonService.deleteDesignObjectsData(
        'design',
        gettingDesignID(),
        'object',
        formData,
      )) as ResponseStatus;

      if (response && response.status === 200) {
        removeExistingLines();
        removeObjectAndChildrenFromScene(selectedObject);
        dispatch(
          removeObjectWithHistory(
            selectedObject.userData.objectId,
            selectedObject,
          ),
        );
      } else {
        console.error('Failed to delete object from backend');
      }
    });
  };

  const removeObjectAndChildrenFromScene = (parentObject: THREE.Object3D) => {
    if (!design3D || !parentObject) return;

    parentObject.children.forEach((child) => {
      child.parent?.remove(child);
    });

    parentObject.parent?.remove(parentObject);
  };
  const updateObjectPositionInDatabase = async (
    objectId: string,
    originalObj: Object3D,
    position: THREE.Vector3,
  ) => {
    try {
      const updatedObj = { ...originalObj };
      updatedObj.position = {
        x: position.x,
        y: position.y,
        z: position.z,
      };

      const payload = {
        data: {
          catalog: { id: objectId, name: updatedObj.name, data: updatedObj },
        },
      };
      const response: { status: number } = await commonService.putObjectData(
        'design',
        gettingDesignID(),
        'object',
        payload,
      );
      if (response && response.status === 200) {
        dispatch(
          updateObjectPosition({
            id: objectId,
            position: { x: position.x, y: position.y, z: position.z },
          }),
        );
        return true;
      }
      console.error('Failed to update object position in DB:', response);
      return false;
    } catch (error) {
      console.error('Error updating object position:', error);
      return false;
    }
  };

  const handleMoveObject = async () => {
    if (!selectedObject || !design3D || !moveHandler) return;

    const objectId = selectedObject.userData.objectId;
    if (!objectId) return;

    const object = store
      .getState()
      .data.objects.find((obj) => obj.id === objectId);
    if (!object) return;

    try {
      const originalPosition = selectedObject.position.clone();
      if (outline) {
        design3D.scene.remove(outline);
        setOutline(null);
      }
      if (selectedObject instanceof THREE.Mesh) {
        const moveOutline = createSelectionOutline(selectedObject);
        if (
          moveOutline &&
          moveOutline.material instanceof THREE.LineBasicMaterial
        ) {
          moveOutline.material.color.set(0x00ff00);
          design3D.scene.add(moveOutline);
          setOutline(moveOutline);
        }
      }
      if (design3D.controls) design3D.controls.enabled = false;

      const finalPosition = await moveHandler.enableDragging(selectedObject);

      if (design3D.controls) design3D.controls.enabled = true;
      if (finalPosition) {
        selectedObject.position.copy(finalPosition);
        const success = await updateObjectPositionInDatabase(
          objectId,
          object,
          finalPosition,
        );
        if (!success) {
          console.error('Failed to update position in DB, reverting...');
          selectedObject.position.copy(originalPosition);
        } else if (isAlignmentActive) {
          showAlignmentDistances(); // Final update
        }
      } else {
        selectedObject.position.copy(originalPosition);
      }

      if (outline) {
        design3D.scene.remove(outline);
        setOutline(null);
      }
      const newOutline = createBoundingBoxOutline(selectedObject);
      if (newOutline) {
        design3D.scene.add(newOutline);
        setOutline(newOutline);
      }

      setIsMoveMode(false);
    } catch (error) {
      console.error('Error during move operation:', error);
      setIsMoveMode(false);
      if (design3D.controls) design3D.controls.enabled = true;
    }
  };

  const handleKeyboardEvents = (event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedObject) {
      if (selectedObject?.userData.objectId) {
        deleteObject()
          .then(() => {
            removeObjectAndChildrenFromScene(selectedObject);
            setSelectedObject(null);
            setHelperTools(false);
          })
          .catch((error) => {
            console.error('Error during object deletion:', error);
          });
      }
    }

    if (event.key === 'm' || event.key === 'M') {
      if (selectedObject && selectedObject.userData.objectId) {
        setIsMoveMode(true);
        handleMoveObject();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardEvents);
    return () => {
      window.removeEventListener('keydown', handleKeyboardEvents);
    };
  }, [selectedObject, design3D, moveHandler, isMoveMode]);

  const handleCopyObject = async () => {
    if (!selectedObject || !design3D || !moveHandler) return;

    const objectId = selectedObject?.userData.objectId;
    if (!objectId) return;

    const clonedObject = selectedObject.clone();
    clonedObject.userData = {
      ...selectedObject.userData,
      isTemporaryCopy: true,
    };
    clonedObject.position.x += 0.1;
    design3D.scene.add(clonedObject);

    if (design3D.controls) {
      design3D.controls.enabled = false;
    }
    const finalPosition = await moveHandler.enableDragging(clonedObject);

    if (design3D.controls) {
      design3D.controls.enabled = true;
    }

    if (finalPosition) {
      clonedObject.position.copy(finalPosition);

      const result = await dispatch(copyObjectsThunk(objectId)).unwrap();
      if (!result || !result.mainObjects.length) {
        design3D.scene.remove(clonedObject);
        throw new Error('Failed to copy object');
      }

      const newObjectId = result.mainObjects[0].id;
      const mainObject = result.mainObjects[0];

      clonedObject.userData.objectId = newObjectId;
      clonedObject.userData.isTemporaryCopy = false;
      clonedObject.name = mainObject.name;

      const updateSuccess = await updateObjectPositionInDatabase(
        newObjectId,
        mainObject,
        finalPosition,
      );

      if (!updateSuccess) {
        design3D.scene.remove(clonedObject);
        console.error('Failed to update position in DB');
        return;
      }
      for (const obj of result.mainObjects) {
        dispatch(
          addToHistory({
            id: uuidv4(),
            type: 'ADD',
            data: {
              object: obj,
              mesh: clonedObject,
              childObjects: result.childObjects,
            },
          }),
        );
      }
      setSelectedObject(clonedObject);
      setHelperTools(true);
      dispatch(setobjectSelected(newObjectId));
    } else {
      design3D.scene.remove(clonedObject);
    }
  };

  const handleLock = () => {};

  const handleUnlock = () => {};

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {helperTools && (
        <HelperTools
          position={toolPosition}
          onCopy={handleCopyObject}
          onDelete={() => {
            if (selectedObject?.userData.objectId) {
              deleteObject()
                .then(() => {
                  removeObjectAndChildrenFromScene(selectedObject);
                  setSelectedObject(null);
                  setHelperTools(false);
                })
                .catch((error) => {
                  console.error('Error during object deletion:', error);
                });
            }
          }}
          onMove={() => {
            setIsMoveMode(true);
            handleMoveObject();
          }}
          onLock={handleLock}
          onUnlock={handleUnlock}
        />
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
      {design3D && (
        <MeasurementTool
          design3D={design3D}
          isActive={isMeasurementActive}
          unitType={currentUnitType}
          onComplete={() => {}}
        />
      )}
    </div>
  );
};

export default Design;
