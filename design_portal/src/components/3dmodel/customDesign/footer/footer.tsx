import img2D from '@/assets/customdesign/2d.svg';
import img3D from '@/assets/customdesign/3d.svg';
import imgArrange from '@/assets/customdesign/arrange.svg';
import imgArrow from '@/assets/customdesign/arrow.svg';
import imgSelect from '@/assets/customdesign/cursor.svg';
import imgCurve from '@/assets/customdesign/curve.svg';
import imgCut from '@/assets/customdesign/cut.svg';
import imgEraser from '@/assets/customdesign/eresar.svg';
import imgFlip from '@/assets/customdesign/flip.svg';
import imgLine from '@/assets/customdesign/line.svg';
import imgMaterialBrush from '@/assets/customdesign/matiralbrush.svg';
import imgMeasure from '@/assets/customdesign/measure.svg';
import imgMove from '@/assets/customdesign/move.svg';
import imgpushpull from '@/assets/customdesign/pull-push.svg';
import imgReference from '@/assets/customdesign/refrenceline.svg';
import imgReverse from '@/assets/customdesign/reversnormal.svg';
import imgRotation from '@/assets/customdesign/rotation.svg';
import imgRounded from '@/assets/customdesign/rounded.svg';
import imgShape from '@/assets/customdesign/shape.svg';
import { createArcCreator } from '@/components/3dmodel/customDesign/handler/arcCreator';
import { createCircleCreator } from '@/components/3dmodel/customDesign/handler/circleCreator';
import { createMeasureHandler } from '@/components/3dmodel/customDesign/handler/measureHandler';
import { MoveHandler } from '@/components/3dmodel/customDesign/handler/moveHandler';
import { getDesignId } from '@/components/3dmodel/customDesign/handler/objectCreator';
import { createPolygonCreator } from '@/components/3dmodel/customDesign/handler/polygonCreator';
import { createRectangleCreator } from '@/components/3dmodel/customDesign/handler/rectangleCreator';
import { createScaleHandler } from '@/components/3dmodel/customDesign/handler/scaleHandler';
import { useAppDispatch, useAppSelector } from '@/components/3dmodel/hooks';
import { removeShapeFromHistory } from '@/components/3dmodel/store/customDesignHistorySlice';
import {
  addShape,
  removeShape,
  selectShape,
  updateShape,
} from '@/components/3dmodel/store/customDesignSlice';
import { updateObjectInDatabase } from '@/components/3dmodel/utils/objectUtils';
import commonService from '@/services/CommonService';
import { useRouter } from 'next/router';
import path from 'path';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { createCurveHandler } from '../handler/curveHandler';
import { createLineCreator } from '../handler/lineCreator';
import { PushPullHandler } from '../handler/pullPushHandler';
import { ReferenceLineHandler } from '../handler/referenceLineHandler';
import { FooterProps, footerShapeData, ViewModeTool } from '../interface';
import styles from './footer.module.css';

const Footer: React.FC<FooterProps> = ({ design3D }) => {
  const router = useRouter();
  const transformControlsRef = useRef({
    object: null as THREE.Mesh | null,
    initialPosition: new THREE.Vector3(),
    initialRotation: new THREE.Euler(),
    initialScale: new THREE.Vector3(),
    isTransforming: false,
  });
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [is2DMode, setIs2DMode] = useState(false);
  const dispatch = useAppDispatch();
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const [showFlipDropdown, setShowFlipDropdown] = useState(false);
  const shapes = useAppSelector((state) => state.customDesign.shapes);
  const selectedShapeId = useAppSelector((state) => state.customDesign.selectedShapeId);
  const moveToolRef = useRef<MoveHandler | null>(null);
  const circleCreatorRef = useRef<ReturnType<typeof createCircleCreator> | null>(null);
  const rectangleCreatorRef = useRef<ReturnType<typeof createRectangleCreator> | null>(null);
  const polygonCreatorRef = useRef<ReturnType<typeof createPolygonCreator> | null>(null);
  const arcCreatorRef = useRef<ReturnType<typeof createArcCreator> | null>(null);
  const shapeButtonRef = useRef<HTMLDivElement>(null);
  const flipButtonRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<THREE.LineSegments | null>(null);
  const measureHandlerRef = useRef<ReturnType<typeof createMeasureHandler> | null>(null);
  const pushPullHandlerRef = useRef<PushPullHandler | null>(null);
  const referenceLineHandlerRef = useRef<ReferenceLineHandler | null>(null);
  const lineCreatorRef = useRef<ReturnType<typeof createLineCreator> | null>(null);
  const scaleHandlerRef = useRef<ReturnType<typeof createScaleHandler> | null>(null);
  const curveHandlerRef = useRef<ReturnType<typeof createCurveHandler> | null>(null);

  const createOutline = useCallback(
    (mesh: THREE.Mesh): void => {
      if (!design3D || !mesh.geometry) return;
      if (outlineRef.current) {
        design3D.scene.remove(outlineRef.current);
        if (outlineRef.current.geometry) outlineRef.current.geometry.dispose();
        if (outlineRef.current.material instanceof THREE.Material) {
          outlineRef.current.material.dispose();
        }
        outlineRef.current = null;
      }

      mesh.geometry.computeBoundingBox();
      const boundingBox = mesh.geometry.boundingBox;
      if (!boundingBox) return;

      // Calculate dimensions
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const width = size.x;
      const height = size.y;
      const depth = size.z;

      const boxGeometry = new THREE.BoxGeometry(width, height, depth);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2,
        depthTest: false,
      });
      const outlineLines = new THREE.LineSegments(edges, outlineMaterial);

      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      outlineLines.position.copy(mesh.position).add(center.multiply(mesh.scale));

      outlineLines.rotation.copy(mesh.rotation);
      outlineLines.scale.copy(mesh.scale);

      outlineLines.name = 'object_outline';
      outlineLines.renderOrder = 999;

      design3D.scene.add(outlineLines);
      outlineRef.current = outlineLines;

      outlineLines.userData.linkedMesh = mesh;
      outlineLines.userData.linkedMeshId = mesh.userData.objectId;
    },
    [design3D]
  );

  // Function to remove outline
  const removeOutline = useCallback(() => {
    if (!design3D || !outlineRef.current) return;

    design3D.scene.remove(outlineRef.current);
    if (outlineRef.current.geometry) outlineRef.current.geometry.dispose();
    if (outlineRef.current.material instanceof THREE.Material) {
      outlineRef.current.material.dispose();
    }
    outlineRef.current = null;
  }, [design3D]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shapeButtonRef.current &&
        !shapeButtonRef.current.contains(event.target as Node) &&
        showShapeDropdown
      ) {
        setShowShapeDropdown(false);
      }
      if (
        flipButtonRef.current &&
        !flipButtonRef.current.contains(event.target as Node) &&
        showFlipDropdown
      ) {
        setShowFlipDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShapeDropdown, showFlipDropdown]);

  const handle2DModeToggle = () => {
    setIs2DMode((prev) => !prev);
    if (design3D) {
      design3D.toggle2DMode(!is2DMode);
    }
  };

  useEffect(() => {
    if (!design3D || !design3D.transformControls) return;

    const handleTransformStart = (event: {
      type: 'mouseDown';
      target: TransformControls;
      object?: THREE.Mesh;
    }) => {
      if (!event.target.object) return;
      if (event.target.object instanceof THREE.Mesh) {
        const object = event.target.object;
        transformControlsRef.current.object = object;
        transformControlsRef.current.initialPosition.copy(object.position);
        transformControlsRef.current.initialRotation.copy(object.rotation);
        transformControlsRef.current.initialScale.copy(object.scale);
        transformControlsRef.current.isTransforming = true;
        createOutline(object);
      }
    };
    const handleTransformEnd = () => {
      if (!transformControlsRef?.current?.isTransforming || !transformControlsRef.current.object)
        return;
      const object = transformControlsRef.current.object;
      const objectId = object.userData.objectId;
      if (!objectId) {
        console.error('No object ID found for transformed object');
        return;
      }
      // Find the shape data from Redux store
      const shapeData = shapes.find((shape) => shape.id === objectId);
      if (!shapeData) {
        console.error('No shape data found for ID:', objectId);
        return;
      }
      // Prepare updates
      const updates = {
        position: {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        },
        rotation: {
          x: object.rotation.x,
          y: object.rotation.y,
          z: object.rotation.z,
        },
        scale: {
          x: object.scale.x,
          y: object.scale.y,
          z: object.scale.z,
        },
      };
      dispatch(
        updateShape({
          id: objectId,
          updates,
        })
      );

      // Update database
      const designId = getDesignId();

      if (designId) {
        updateObjectInDatabase(shapeData, updates);
      }
      transformControlsRef.current.isTransforming = false;
    };

    const handleObjectChange = () => {
      if (!transformControlsRef.current) return;
      if (!transformControlsRef.current.isTransforming || !transformControlsRef.current.object)
        return;

      const object = transformControlsRef.current.object;
      const objectId = object.userData.objectId;
      if (!objectId) return;
      // Update Redux store with live changes
      dispatch(
        updateShape({
          id: objectId,
          updates: {
            position: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z,
            },
            rotation: {
              x: object.rotation.x,
              y: object.rotation.y,
              z: object.rotation.z,
            },
            scale: {
              x: object.scale.x,
              y: object.scale.y,
              z: object.scale.z,
            },
          },
        })
      );
      if (outlineRef.current && outlineRef.current.userData.linkedMesh === object) {
        if (!object.scale.equals(transformControlsRef.current.initialScale)) {
          createOutline(object);
        } else {
          outlineRef.current.position.copy(object.position);
          outlineRef.current.rotation.copy(object.rotation);
          outlineRef.current.scale.copy(object.scale);
        }
      }
    };

    design3D.transformControls.addEventListener('mouseDown', handleTransformStart);
    design3D.transformControls.addEventListener('mouseUp', handleTransformEnd);
    design3D.transformControls.addEventListener('objectChange', handleObjectChange);
    return () => {
      design3D.transformControls.removeEventListener('mouseDown', handleTransformStart);
      design3D.transformControls.removeEventListener('mouseUp', handleTransformEnd);
      design3D.transformControls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [design3D, dispatch, shapes, createOutline, router.query.designid]);

  const handleSelectTool = useCallback(
    (event: MouseEvent) => {
      if (!design3D) {
        return;
      }

      const canvas = design3D.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, design3D.camera);

      const allSelectableMeshes: THREE.Mesh[] = [];
      design3D.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          !object.name.includes('grid') &&
          !object.name.includes('helper') &&
          !object.name.includes('daysky') &&
          !object.name.includes('nightsky') &&
          !object.name.includes('object_outline') &&
          !object.name.includes('face_outline') &&
          !object.name.includes('edge_outline') &&
          !object.name.includes('object_outline') &&
          object.userData.objectId
        ) {
          allSelectableMeshes.push(object);
        }
      });

      const intersects = raycaster.intersectObjects(allSelectableMeshes, false);

      // Remove old selection and transform controls
      if (outlineRef.current) {
        removeOutline();
      }
      if (design3D.transformControls) {
        design3D.transformControls.detach();
      }
      if (intersects.length > 0) {
        if (intersects[0].object instanceof THREE.Mesh) {
          const interObjetcs = intersects[0].object;
          createOutline(interObjetcs);
          dispatch(selectShape(interObjetcs.userData.objectId));
          if (!interObjetcs.userData.isEditable) {
            design3D.transformControls.attach(interObjetcs);
            design3D.scene.add(design3D.transformControls.getHelper());
          }
        }
      } else {
        design3D.transformControls.detach();
        dispatch(selectShape(null));
      }
    },
    [design3D, createOutline, removeOutline]
  );

  const handleHoverEffect = useCallback(
    (event: MouseEvent) => {
      if (!design3D) return;
      // Get normalized device coordinates
      const canvas = design3D.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, design3D.camera);

      // Remove previous hover highlights
      design3D.scene.traverse((object) => {
        if (object.userData && object.userData.isHoverHighlight) {
          design3D.scene.remove(object);
        }

        if (object.userData && object.userData.isHovered && !object.userData.isSelected) {
          // Reset hovered material if it's not selected
          if (object instanceof THREE.Mesh && object.userData.originalMaterial) {
            object.material = object.userData.originalMaterial;
            delete object.userData.originalMaterial;
          }
          object.userData.isHovered = false;
        }
      });

      // Find intersectable objects (exclude outlines and helpers)
      const selectableObjects: THREE.Mesh[] = [];
      design3D.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          !object.name.includes('grid') &&
          !object.name.includes('helper') &&
          !object.name.includes('daysky') &&
          !object.name.includes('nightsky') &&
          !object.name.includes('outline')
        ) {
          selectableObjects.push(object);
        }
      });

      const intersects = raycaster.intersectObjects(selectableObjects, false);

      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object;
        document.body.style.cursor = 'pointer';

        // Check if this is a face
        if (hoveredObject.userData && hoveredObject.userData.faceInfo) {
          const face = hoveredObject as THREE.Mesh;
          face.userData.isHovered = true;

          // Change material for highlighting
          if (face.material instanceof THREE.MeshStandardMaterial) {
            face.userData.originalMaterial = face.material.clone();
            const hoverMaterial = face.material.clone();

            // Use different highlighting colors for inner vs outer faces
            if (face.userData.faceInfo.isInnerFace) {
              hoverMaterial.emissive.setHex(0xff6600); // Brighter orange for inner face hover
              hoverMaterial.emissiveIntensity = 0.5; // Stronger emission for inner faces
            } else {
              hoverMaterial.emissive.setHex(0x88ff88); // Light green for outer face hover
              hoverMaterial.emissiveIntensity = 0.3;
            }

            hoverMaterial.opacity = 0.9;
            hoverMaterial.needsUpdate = true;
            face.material = hoverMaterial;
          }

          // Create a temporary outline for the hovered face
          const faceGeometry = face.geometry.clone();
          const edges = new THREE.EdgesGeometry(faceGeometry);
          const hoverMaterial = new THREE.LineBasicMaterial({
            color: face.userData.faceInfo.isInnerFace ? 0xff6600 : 0x88ff88, // Orange for inner, green for outer
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
          });

          const hoverOutline = new THREE.LineSegments(edges, hoverMaterial);
          hoverOutline.position.copy(face.position);
          hoverOutline.rotation.copy(face.rotation);
          hoverOutline.scale.copy(face.scale);

          // Apply parent transformations for correct positioning
          if (face.parent) {
            const segmentGroup = face.parent;
            hoverOutline.position.add(segmentGroup.position);

            if (segmentGroup.parent) {
              const parentBox = segmentGroup.parent;
              hoverOutline.position.add(parentBox.position);
              hoverOutline.rotation.copy(parentBox.rotation);
              hoverOutline.scale.copy(parentBox.scale);
            }
          }

          hoverOutline.userData.isHoverHighlight = true;
          hoverOutline.renderOrder = 998; // Just below selection outlines
          hoverOutline.name = 'hover_outline';
          design3D.scene.add(hoverOutline);
        }
        // If it's an edge (existing code stays the same)
        else if (hoveredObject.userData.edgeInfo) {
          const edge = hoveredObject as THREE.Line;
          edge.userData.isHovered = true;

          // Highlight the edge
          if (edge.material instanceof THREE.LineBasicMaterial) {
            edge.userData.originalMaterial = edge.material;
            const highlightMaterial = edge.material.clone();
            highlightMaterial.color.setHex(0x00ff00);
            highlightMaterial.linewidth = 3;
            edge.material = highlightMaterial;
          }
        }
        // Handle other types of objects if needed
        else if (hoveredObject.parent && hoveredObject.parent.name.startsWith('segment_')) {
          // Hovering over a segment but not a specific face/edge
          // For now, let's just change the cursor
        }
      } else {
        // Reset cursor when not hovering over anything
        document.body.style.cursor = 'default';
      }
    },
    [design3D]
  );

  const handleEraserTool = useCallback(
    (event: MouseEvent) => {
      if (!design3D) return;

      const canvas = design3D.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, design3D.camera);

      const meshObjects: THREE.Mesh[] = [];
      design3D.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          !object.name.includes('grid') &&
          !object.name.includes('helper') &&
          !object.name.includes('sky') &&
          !object.name.includes('outline') &&
          !object.name.includes('measurement') &&
          object.userData.objectId
        ) {
          meshObjects.push(object);
        }
      });

      const intersects = raycaster.intersectObjects(meshObjects, true);
      if (intersects.length > 0) {
        let objectToRemove: THREE.Mesh | null = null;
        let objectId: string | null = null;

        for (const intersect of intersects) {
          let currentObj: THREE.Object3D | null = intersect.object;

          while (currentObj) {
            if (currentObj instanceof THREE.Mesh && currentObj.userData.objectId) {
              objectToRemove = currentObj;
              objectId = currentObj.userData.objectId;
              break;
            }
            currentObj = currentObj.parent;
          }

          if (objectToRemove) break;
        }

        if (objectToRemove && objectId) {
          if (
            outlineRef.current &&
            (outlineRef.current.userData.linkedMesh === objectToRemove ||
              outlineRef.current.userData.linkedMeshId === objectId)
          ) {
            removeOutline();
          }
          const shapeToRemove = shapes.find((shape) => shape.id === objectId);

          if (shapeToRemove) {
            dispatch(removeShapeFromHistory(shapeToRemove, objectToRemove));
          }
          design3D.scene.remove(objectToRemove);

          objectToRemove.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((material) => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });

          dispatch(removeShape(objectId));

          const designId = getDesignId() || '';
          const formData = new FormData();
          formData.append('ids', objectId);
          commonService
            .deleteDesignObjectsData('design', designId, 'object', formData)
            .then((response: { status: number }) => {
              if (response.status === 200 || response.status === 204) {
                handleToolClick('eraser');
              }
            })
            .catch((error) => {
              console.error('Error deleting object from database:', error);
            });
        }
      }
    },
    [design3D, dispatch, removeOutline, shapes]
  );
  const handleMoveTool = useCallback(() => {
    if (!design3D) return;

    // Deactivate if already active
    if (moveToolRef.current) {
      moveToolRef.current.deactivate();
      moveToolRef.current = null;
      setActiveTool(null);
      document.body.style.cursor = 'default';
      return;
    }

    const moveHandler = new MoveHandler({
      scene: design3D.scene,
      camera: design3D.camera as THREE.PerspectiveCamera,
      renderer: design3D.renderer,
      controls: design3D.controls,
      movableObjects: design3D.scene.children.filter(
        (object) =>
          object instanceof THREE.Mesh &&
          !object.name.includes('grid') &&
          !object.name.includes('sky') &&
          !object.name.includes('helper') &&
          !object.name.includes('daysky') &&
          !object.name.includes('nightsky') &&
          !object.name.includes('floor') &&
          !object.name.includes('ground') &&
          !object.name.includes('plane') &&
          !object.name.includes('Grid')
      ),
    });

    if (typeof moveHandler.setOnObjectMoved === 'function') {
      moveHandler.setOnObjectMoved(async (object) => {
        const objectId = object.userData.objectId;
        if (objectId) {
          dispatch(
            updateShape({
              id: objectId,
              updates: {
                position: {
                  x: object.position.x,
                  y: object.position.y,
                  z: object.position.z,
                },
              },
            })
          );

          // Update outline position if it exists
          if (outlineRef.current && outlineRef.current.userData.linkedMesh === object) {
            outlineRef.current.position.copy(object.position);
          }

          const designId = getDesignId();
          if (!designId) return;

          const mainDataObject = {
            position: {
              x: object.position?.x ?? 0,
              y: object.position?.y ?? 0,
              z: object.position?.z ?? 0,
            },
            rotateX: object.rotation?.x ?? 0,
            rotateY: object.rotation?.y ?? 0,
            rotateZ: object.rotation?.z ?? 0,
            scale: {
              x: object.scale?.x ?? 1,
              y: object.scale?.y ?? 1,
              z: object.scale?.z ?? 1,
            },
          };

          const payload = {
            data: {
              catalog: {
                id: objectId,
                name: object.name || '',
                data: mainDataObject,
                is_custom: true,
                is_default: true,
              },
            },
          };

          const response: { status: number } = await commonService.putObjectData(
            'design',
            designId.toString(),
            'object',
            payload
          );
          if (response.status !== 200) {
            console.error('Error updating object position in database');
          }
        }
      });
    }

    moveToolRef.current = moveHandler;
    setActiveTool('move');
    document.body.style.cursor = 'move';
  }, [design3D, dispatch]);

  const handleFlipObject = useCallback(
    (flipType: 'xy' | 'xz' | 'yz') => {
      if (!design3D || !selectedShapeId) {
        return;
      }

      // Find the selected object in the scene
      let selectedObject: THREE.Mesh | null = null;
      design3D.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object.userData.objectId === selectedShapeId) {
          selectedObject = object;
        }
      });

      if (!selectedObject) {
        console.error('Selected object not found in scene');
        return;
      }

      // Get current scale
      const currentScale = (selectedObject as THREE.Mesh).scale.clone();
      const newScale = currentScale.clone();

      // Apply flip based on type
      switch (flipType) {
        case 'xy':
          newScale.x *= -1;
          newScale.y *= -1;
          break;
        case 'xz':
          newScale.x *= -1;
          newScale.z *= -1;
          break;
        case 'yz':
          newScale.y *= -1;
          newScale.z *= -1;
          break;
      }

      // Apply new scale to the object
      (selectedObject as THREE.Mesh).scale.copy(newScale);

      // Update the object in Redux
      dispatch(
        updateShape({
          id: selectedShapeId,
          updates: {
            scale: {
              x: newScale.x,
              y: newScale.y,
              z: newScale.z,
            },
          },
        })
      );

      // Update the object in the database
      const shapeData = shapes.find((shape) => shape.id === selectedShapeId);
      if (shapeData) {
        handlePositionUpdate(selectedObject, selectedShapeId, shapeData);
      }

      // Update the outline
      if (selectedObject as THREE.Mesh) {
        createOutline(selectedObject);
      }

      // Clear the selection after flipping
      dispatch(selectShape(''));
      removeOutline();
      setShowFlipDropdown(false);
      setActiveTool(null); // Deactivate flip tool after operation
    },
    [design3D, selectedShapeId, shapes, dispatch, createOutline, removeOutline]
  );

  useEffect(() => {
    if (activeTool === 'flip' && !selectedShapeId) {
      setActiveTool(null);
      setShowFlipDropdown(false);
    }
  }, [selectedShapeId, activeTool]);

  const handleCircleTool = useCallback(() => {
    if (!design3D) return;

    // Close the shape dropdown
    setShowShapeDropdown(false);

    // Deactivate any existing circle creator
    if (circleCreatorRef.current) {
      circleCreatorRef.current.deactivate();
      circleCreatorRef.current = null;
      setActiveTool(null);
      return;
    }

    // Deactivate other tools
    cleanupEventListeners();

    // Create a new circle creator
    const circleCreator = createCircleCreator(design3D.scene, design3D.camera);

    circleCreatorRef.current = circleCreator;
    circleCreator.activate();
    setActiveTool('circle');
  }, [design3D, dispatch]);

  const handleRectangleTool = useCallback(() => {
    if (!design3D) return;

    // Close the shape dropdown
    setShowShapeDropdown(false);

    // Deactivate any existing rectangle creator
    if (rectangleCreatorRef.current) {
      rectangleCreatorRef.current.deactivate();
      rectangleCreatorRef.current = null;
      setActiveTool(null);
      return;
    }

    // Deactivate other tools
    cleanupEventListeners();

    // Create a new rectangle creator
    const rectangleCreator = createRectangleCreator(
      design3D.scene,
      design3D.camera,
      design3D.renderer
    );

    rectangleCreatorRef.current = rectangleCreator;
    rectangleCreator.activate();
    setActiveTool('rectangle');
  }, [design3D, dispatch]);

  const handlePolygonTool = useCallback(() => {
    if (!design3D) return;

    // Close the shape dropdown
    setShowShapeDropdown(false);

    // Deactivate any existing polygon creator
    if (polygonCreatorRef.current) {
      polygonCreatorRef.current.deactivate();
      polygonCreatorRef.current = null;
      setActiveTool(null);
      return;
    }

    // Deactivate other tools
    cleanupEventListeners();

    // Create a new polygon creator
    const polygonCreator = createPolygonCreator(design3D.scene, design3D.camera, design3D.renderer);

    // Set the number of sides

    polygonCreatorRef.current = polygonCreator;
    polygonCreator.activate();
    setActiveTool('polygon');
  }, [design3D, dispatch]);

  const handleArcTool = useCallback(() => {
    if (!design3D) return;

    // Close the shape dropdown
    setShowShapeDropdown(false);

    // Deactivate any existing arc creator
    if (arcCreatorRef.current) {
      arcCreatorRef.current.deactivate();
      arcCreatorRef.current = null;
      setActiveTool(null);
      return;
    }

    // Deactivate other tools
    cleanupEventListeners();

    // Create a new arc creator
    const arcCreator = createArcCreator(design3D.scene, design3D.camera, design3D.renderer);

    arcCreatorRef.current = arcCreator;
    arcCreator.activate();
    setActiveTool('arc');
  }, [design3D, dispatch]);

  const cleanupEventListeners = useCallback(() => {
    if (design3D) {
      const canvas = design3D.renderer.domElement;
      canvas.removeEventListener('click', handleSelectTool);
      canvas.removeEventListener('click', handleEraserTool);
      canvas.removeEventListener('mousemove', handleHoverEffect);
      document.body.style.cursor = 'default';
    }

    if (moveToolRef.current) {
      moveToolRef.current.deactivate();
      moveToolRef.current = null;
    }

    if (circleCreatorRef.current) {
      circleCreatorRef.current.deactivate();
      circleCreatorRef.current = null;
    }

    if (rectangleCreatorRef.current) {
      rectangleCreatorRef.current.deactivate();
      rectangleCreatorRef.current = null;
    }

    if (polygonCreatorRef.current) {
      polygonCreatorRef.current.deactivate();
      polygonCreatorRef.current = null;
    }

    if (arcCreatorRef.current) {
      arcCreatorRef.current.deactivate();
      arcCreatorRef.current = null;
    }

    if (measureHandlerRef.current) {
      measureHandlerRef.current.deactivate();
      measureHandlerRef.current = null;
    }

    if (lineCreatorRef.current) {
      lineCreatorRef.current.deactivate();
      lineCreatorRef.current = null;
    }

    if (scaleHandlerRef.current) {
      scaleHandlerRef.current.deactivate();
      scaleHandlerRef.current = null;
    }

    if (pushPullHandlerRef.current) {
      pushPullHandlerRef.current.deactivate();
      pushPullHandlerRef.current = null;
    }

    if (referenceLineHandlerRef.current) {
      referenceLineHandlerRef.current.deactivate();
      referenceLineHandlerRef.current = null;
    }

    // Remove outline when switching tools
    removeOutline();
  }, [design3D, handleSelectTool, handleEraserTool, removeOutline, handleHoverEffect]);

  const handleReferenceLineTool = useCallback((): void => {
    if (!design3D) return;

    if (referenceLineHandlerRef.current && activeTool === 'reference') {
      referenceLineHandlerRef.current.deactivate();
      referenceLineHandlerRef.current = null;
      setActiveTool(null);
      return;
    }

    cleanupEventListeners();

    referenceLineHandlerRef.current = new ReferenceLineHandler({
      scene: design3D.scene,
      camera: design3D.camera as THREE.PerspectiveCamera,
      renderer: design3D.renderer,
      controls: design3D.controls,
    });

    referenceLineHandlerRef.current.activate();
    setActiveTool('reference');
    document.body.style.cursor = 'crosshair';
  }, [design3D, cleanupEventListeners, activeTool]);

  const handlePushPullTool = useCallback((): void => {
    if (!design3D) return;

    if (pushPullHandlerRef.current && activeTool === 'pushpull') {
      pushPullHandlerRef.current.deactivate();
      pushPullHandlerRef.current = null;
      setActiveTool(null);
      return;
    }

    cleanupEventListeners();

    pushPullHandlerRef.current = new PushPullHandler(design3D);
    pushPullHandlerRef.current.activate();
    setActiveTool('pushpull');
    document.body.style.cursor = 'crosshair';
  }, [design3D, cleanupEventListeners, activeTool]);

  const handleMeasureTool = useCallback((): void => {
    if (!design3D) return;

    if (measureHandlerRef.current && activeTool === 'measure') {
      measureHandlerRef.current.deactivate();
      measureHandlerRef.current = null;
      setActiveTool(null);
      return;
    }

    cleanupEventListeners();

    if (!measureHandlerRef.current) {
      measureHandlerRef.current = createMeasureHandler(
        design3D.scene,
        design3D.camera,
        design3D.renderer
      );
    }

    measureHandlerRef.current.activate();
    setActiveTool('measure');
    document.body.style.cursor = 'crosshair';
  }, [design3D, cleanupEventListeners, activeTool]);

  const handleCurveTool = useCallback(() => {
    if (!design3D) return;
    // Deactivate if already active
    if (curveHandlerRef.current && activeTool === 'curve') {
      curveHandlerRef.current.deactivate();
      curveHandlerRef.current = null;
      setActiveTool(null);
      document.body.style.cursor = 'default';
      return;
    }
    cleanupEventListeners();
    // Create curve handler if it doesn't exist
    if (!curveHandlerRef.current) {
      curveHandlerRef.current = createCurveHandler({
        scene: design3D.scene,
        camera: design3D.camera,
        renderer: design3D.renderer,
        controls: design3D.controls,
        onCurveCreated: (curveData) => {
          dispatch(addShape(curveData));
        },
      });
    }
    // Activate curve handler
    curveHandlerRef.current.activate();
    setActiveTool('curve');
    document.body.style.cursor = 'crosshair';
  }, [design3D, dispatch, activeTool]);

  const handleLineTool = useCallback(() => {
    if (!design3D) return;

    // Deactivate if already active
    if (lineCreatorRef.current) {
      lineCreatorRef.current.deactivate();
      lineCreatorRef.current = null;
      setActiveTool(null);
      document.body.style.cursor = 'default';
      return;
    }

    const lineCreator = createLineCreator(design3D.scene, design3D.camera, design3D.renderer);
    lineCreatorRef.current = lineCreator;
    lineCreatorRef.current.activate();
    setActiveTool('line');
    document.body.style.cursor = 'crosshair';
  }, [design3D, dispatch]);

  const handleScaleTool = useCallback(() => {
    if (!design3D) return;

    // Deactivate if already active
    if (scaleHandlerRef.current && activeTool === 'scale') {
      scaleHandlerRef.current.deactivate();
      scaleHandlerRef.current = null;
      setActiveTool(null);
      return;
    }

    // Deactivate other tools
    cleanupEventListeners();

    // Create scale handler if it doesn't exist
    if (!scaleHandlerRef.current) {
      scaleHandlerRef.current = createScaleHandler({
        scene: design3D.scene,
        camera: design3D.camera as THREE.PerspectiveCamera,
        renderer: design3D.renderer,
        controls: design3D.controls,
      });
    }

    // Activate scale handler
    scaleHandlerRef.current.activate();
    setActiveTool('scale');
    document.body.style.cursor = 'crosshair';
  }, [design3D, activeTool, cleanupEventListeners]);

  const handleDottedLineTool = useCallback(() => {
    if (!design3D) return;

    if (activeTool === 'dottedline') {
      setActiveTool(null);
      document.body.style.cursor = 'default';
      return;
    }

    cleanupEventListeners();
    setActiveTool('dottedline');
    document.body.style.cursor = 'crosshair';

    const handleClick = (event: MouseEvent) => {
      const canvas = design3D.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, design3D.camera);

      const intersects = raycaster.intersectObjects(design3D.scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;

        // Remove any existing transform controls
        if (design3D.transformControls) {
          design3D.transformControls.detach();
        }

        // Set isEditable to true for dotted lines
        object.userData.isEditable = true;
        createOutline(object);
      }
    };

    const canvas = design3D.renderer.domElement;
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [design3D, activeTool, cleanupEventListeners, createOutline]);

  const handleToolClick = useCallback(
    (tool: string) => {
      if (!design3D) {
        return;
      }

      const canvas = design3D.renderer.domElement;

      if (activeTool === tool) {
        cleanupEventListeners();
        if (design3D.transformControls) {
          design3D.transformControls.detach();
          design3D.controls.enableRotate = true;
        }
        setActiveTool(null);
        setShowFlipDropdown(false);
        return;
      }

      cleanupEventListeners();
      if (design3D.transformControls) {
        design3D.transformControls.detach();
        design3D.controls.enableRotate = true;
      }

      if (tool === 'select') {
        document.body.style.cursor = 'pointer';
        canvas.addEventListener('click', handleSelectTool);
        canvas.addEventListener('mousemove', handleHoverEffect);
        setActiveTool('select');
      } else if (tool === 'move') {
        handleMoveTool();
      } else if (tool === 'eraser') {
        document.body.style.cursor = 'not-allowed';
        canvas.addEventListener('click', handleEraserTool);
        setActiveTool('eraser');
      } else if (tool === 'rotation') {
        document.body.style.cursor = 'move';
        canvas.addEventListener('click', handleSelectTool);
        if (design3D.transformControls) {
          design3D.transformControls.setMode('rotate');
          design3D.transformControls.size = 0.7;
        }
        setActiveTool('rotation');
      } else if (tool === 'measure') {
        handleMeasureTool();
      } else if (tool === 'shape') {
        setShowShapeDropdown(!showShapeDropdown);
      } else if (tool === 'flip') {
        if (!selectedShapeId) {
          setActiveTool(null);
          return;
        }
        setShowFlipDropdown(!showFlipDropdown);
        setActiveTool('flip');
      } else if (tool === 'pushpull') {
        handlePushPullTool();
      } else if (tool === 'reference') {
        handleReferenceLineTool();
      } else if (tool === 'line') {
        handleLineTool();
      } else if (tool === 'scale') {
        handleScaleTool();
      } else if (tool === 'curve') {
        handleCurveTool();
      } else if (tool === 'dottedline') {
        handleDottedLineTool();
      } else {
        document.body.style.cursor = 'default';
        setActiveTool(null);
      }
    },
    [
      activeTool,
      design3D,
      handleSelectTool,
      handleEraserTool,
      handleMoveTool,
      handleHoverEffect,
      handlePushPullTool,
      handleReferenceLineTool,
      handleLineTool,
      handleScaleTool,
      cleanupEventListeners,
      showShapeDropdown,
      selectedShapeId,
      handleDottedLineTool,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEventListeners();
      removeOutline();
    };
  }, [cleanupEventListeners, removeOutline]);

  const handlePositionUpdate = (
    object: THREE.Object3D,
    objectId: string,
    shapeData: footerShapeData
  ) => {
    const designId = path.basename(window.location.pathname);
    if (!designId) return;

    updateObjectInDatabase(shapeData, {
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      },
    });
  };

  const shapeOptions = [
    {
      option: 'circle',
      name: 'Circle',
      icon: imgShape,
      onClick: handleCircleTool,
    },
    {
      option: 'rectangle',
      name: 'Rectangle',
      icon: imgShape,
      onClick: handleRectangleTool,
    },
    {
      option: 'polygon',
      name: 'Polygon',
      icon: imgShape,
      onClick: handlePolygonTool,
      sidesSelector: true,
    },
    {
      option: 'arc',
      name: 'Arc',
      icon: imgShape,
      onClick: handleArcTool,
    },
  ];

  const flipOptions = [
    {
      option: 'xy',
      name: 'Flip XY',
      icon: imgFlip,
      onClick: () => {
        if (!selectedShapeId) {
          return;
        }
        handleFlipObject('xy');
      },
    },
    {
      option: 'xz',
      name: 'Flip XZ',
      icon: imgFlip,
      onClick: () => {
        if (!selectedShapeId) {
          return;
        }
        handleFlipObject('xz');
      },
    },
    {
      option: 'yz',
      name: 'Flip YZ',
      icon: imgFlip,
      onClick: () => {
        if (!selectedShapeId) {
          return;
        }
        handleFlipObject('yz');
      },
    },
  ];

  const footerTools = [
    {
      option: 'select',
      name: 'Select',
      icon: imgSelect,
      disabled: false,
      onClick: () => handleToolClick('select'),
    },
    {
      option: 'move',
      name: 'Move',
      icon: imgMove,
      disabled: false,
      onClick: () => handleToolClick('move'),
    },
    {
      option: 'eraser',
      name: 'Eraser',
      icon: imgEraser,
      disabled: false,
      onClick: () => handleToolClick('eraser'),
    },
    {
      option: 'shape',
      name: 'Shape',
      icon: imgShape,
      disabled: false,
      onClick: () => handleToolClick('shape'),
      ref: shapeButtonRef,
    },
    {
      option: 'arrow',
      name: 'Arrow',
      icon: imgArrow,
      disabled: true,
    },
    {
      option: 'rounded',
      name: 'Rounded',
      icon: imgRounded,
      disabled: true,
    },
    {
      option: 'flip',
      name: 'Flip',
      icon: imgFlip,
      disabled: false,
      onClick: () => handleToolClick('flip'),
      ref: flipButtonRef,
    },
    {
      option: 'curve',
      name: 'Curve',
      icon: imgCurve,
      disabled: true,
    },
    {
      option: 'curve',
      name: 'Curve',
      icon: imgCurve,
      disabled: false,
      onClick: () => handleToolClick('curve'),
    },
    {
      option: 'arrange',
      name: 'Arrange',
      icon: imgArrange,
      disabled: true,
    },
    {
      option: 'line',
      name: 'Line',
      icon: imgLine,
      disabled: false,
      onClick: () => handleToolClick('line'),
    },
    {
      option: 'cut',
      name: 'Cut',
      icon: imgCut,
      disabled: true,
    },
    {
      option: 'rotation',
      name: 'Rotation',
      icon: imgRotation,
      disabled: false,
      onClick: () => handleToolClick('rotation'),
    },
    {
      option: 'reference',
      name: 'Reference Line',
      icon: imgReference,
      disabled: false,
      onClick: () => handleToolClick('reference'),
    },
    {
      option: 'measure',
      name: 'Measure',
      icon: imgMeasure,
      disabled: false,
      onClick: () => handleToolClick('measure'),
    },
    {
      option: 'material-brush',
      name: 'Material Brush',
      icon: imgMaterialBrush,
      disabled: true,
    },
    {
      option: 'reverse',
      name: 'Reverse Normal',
      icon: imgReverse,
      disabled: true,
    },
    {
      option: 'pushpull',
      name: 'Push/Pull',
      icon: imgpushpull,
      disabled: false,
      onClick: () => handleToolClick('pushpull'),
    },
    {
      option: 'scale',
      name: 'Scale',
      icon: imgReverse,
      disabled: false,
      onClick: () => handleToolClick('scale'),
    },
  ];

  const viewModeTools: ViewModeTool[] = [
    {
      option: '2d',
      icon: img2D,
      disabled: is2DMode,
      onClick: () => handle2DModeToggle(),
    },
    {
      option: '3d',
      icon: img3D,
      disabled: !is2DMode,
      onClick: () => handle2DModeToggle(),
    },
  ];

  return (
    <div className={styles.footerContainer}>
      <div className={styles.viewModeSection}>
        {viewModeTools.map(({ option, name, icon, disabled, onClick }) => (
          <div
            key={option}
            className={`${styles.viewModeButton} ${disabled ? styles.disabled : styles.active}`}
            onClick={disabled ? undefined : onClick}
            title={name}
          >
            <img
              src={icon.src || '/placeholder.svg'}
              alt={name}
              className={styles.viewModetoolIcon}
            />
            <span>{name}</span>
          </div>
        ))}
      </div>

      <div className={styles.mainToolbarSection}>
        <div className={styles.toolsContainer}>
          {footerTools.map(
            ({ option, name, icon, disabled, onClick }) =>
              !disabled && (
                <div
                  key={option}
                  className={`${styles.toolButton} ${activeTool === option ? styles.active : ''}`}
                  onClick={onClick}
                  title={name}
                  ref={
                    option === 'shape' ? shapeButtonRef : option === 'flip' ? flipButtonRef : null
                  }
                >
                  <img
                    src={icon.src || '/placeholder.svg'}
                    alt={name}
                    className={styles.toolIcon}
                  />
                  {option === 'shape' && showShapeDropdown && (
                    <div className={styles.shapeDropdown}>
                      {shapeOptions.map((shape) => (
                        <div
                          key={shape.option}
                          className={styles.shapeOption}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (shape.onClick) {
                              shape.onClick();
                            } else {
                              setShowShapeDropdown(false);
                            }
                          }}
                        >
                          <img
                            src={shape.icon.src || '/placeholder.svg'}
                            alt={shape.name}
                            className={styles.shapeIcon}
                          />
                          <span className={styles.shapeName}>{shape.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {option === 'flip' && showFlipDropdown && (
                    <div className={styles.shapeDropdown}>
                      {flipOptions.map((flip) => (
                        <div
                          key={flip.option}
                          className={styles.shapeOption}
                          onClick={(e) => {
                            e.stopPropagation();
                            flip.onClick();
                          }}
                        >
                          <img
                            src={flip.icon.src || '/placeholder.svg'}
                            alt={flip.name}
                            className={styles.shapeIcon}
                          />
                          <span className={styles.shapeName}>{flip.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
};

export default Footer;
