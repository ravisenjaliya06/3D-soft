import { useAppDispatch, useAppSelector } from '@/components/3dmodel/hooks';
import { setCustomScene } from '@/components/3dmodel/store/customDesignSlice';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MoveHandler } from '../handler/moveHandler';
import { createObject, loadObjectsFromDatabase } from '../handler/objectCreator';
import { customDesignProps, GeometryData, ThreeDView } from '../interface';
import HelperTools from './helperTool/helperTool';
import { cleanupThreeDView, init3DDesign } from './scene';

const Design: React.FC<customDesignProps> = ({ setDesign3D }) => {
  const dispatch = useAppDispatch();
  const mountRef = useRef<HTMLDivElement>(null);
  const [design3D, setLocalDesign3D] = useState<ThreeDView | null>(null);
  const [helperTools, setHelperTools] = useState<boolean>(false);
  const [toolPosition, setToolPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const selectedShapeId = useAppSelector((state) => state.customDesign.selectedShapeId);
  const shapes = useAppSelector((state) => state.customDesign.shapes);
  const scene = useAppSelector((state) => state.customDesign.sceneState.scene);
  const prevShapesRef = useRef(shapes); // Store previous shapes to detect changes

  // Initialize the 3D scene
  useEffect(() => {
    if (mountRef.current && !design3D) {
      const initializeScene = async () => {
        if (!mountRef.current) return;

        const threeDView = await init3DDesign(mountRef.current);
        setLocalDesign3D(threeDView);
        setDesign3D(threeDView);
        dispatch(setCustomScene(threeDView.scene));

        // Initialize move handler
        const handler = new MoveHandler({
          scene: threeDView.scene,
          camera:
            threeDView.camera instanceof THREE.PerspectiveCamera
              ? threeDView.camera
              : new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
          renderer: threeDView.renderer,
          movableObjects: [],
          controls: threeDView.controls,
        });

        // Load objects from database
        await loadObjectsFromDatabase(threeDView.scene);

        // Handle/window resize
        const handleResize = () => {
          if (threeDView.camera instanceof THREE.PerspectiveCamera) {
            threeDView.camera.aspect = window.innerWidth / window.innerHeight;
            threeDView.camera.updateProjectionMatrix();
          }
          threeDView.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          cleanupThreeDView(threeDView);
          setDesign3D(null);
          handler.cleanup();
        };
      };

      initializeScene();
    }
  }, [design3D, setDesign3D, dispatch]);

  // Synchronize selected object's properties with the Three.js scene
  useEffect(() => {
    if (!design3D || !design3D.scene || !selectedShapeId) return;

    const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);
    if (!selectedShape) return;

    // Find the corresponding mesh in the scene
    const mesh = design3D.scene.children.find(
      (child) =>
        child.userData.objectId === selectedShapeId &&
        (child instanceof THREE.Mesh ||
          (child instanceof THREE.Group && child.children.some((c) => c instanceof THREE.Mesh)))
    ) as THREE.Mesh | THREE.Group | undefined;

    if (!mesh) return;

    // Get the actual mesh if we found a group
    const actualMesh =
      mesh instanceof THREE.Group
        ? (mesh.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh)
        : (mesh as THREE.Mesh);

    if (!actualMesh) return;

    // Update position
    actualMesh.position.set(
      selectedShape.position.x,
      selectedShape.position.y,
      selectedShape.position.z
    );

    // Update rotation
    actualMesh.rotation.set(
      selectedShape.rotation.x,
      selectedShape.rotation.y,
      selectedShape.rotation.z
    );

    // Update scale
    actualMesh.scale.set(selectedShape.scale.x, selectedShape.scale.y, selectedShape.scale.z);

    // Check if dimensions have changed
    const prevShapes = prevShapesRef.current;
    const prevShape = prevShapes.find((shape) => shape.id === selectedShapeId);
    const dimensionsChanged =
      JSON.stringify(selectedShape.properties.dimensions) !==
      JSON.stringify(prevShape?.properties.dimensions);

    if (dimensionsChanged) {
      // Create new geometry only if dimensions changed
      const geometryData: GeometryData = {
        type: selectedShape.type as
          | 'box'
          | 'sphere'
          | 'cylinder'
          | 'cone'
          | 'torus'
          | 'plane'
          | 'tetrahedron'
          | 'circle',

        dimensions: selectedShape.properties.dimensions || {},
        color: selectedShape.properties.color || 0x808080,
        material: actualMesh.material instanceof THREE.Material ? actualMesh.material : undefined,
      };

      // Create new geometry
      const newMesh = createObject(geometryData);
      if (newMesh instanceof THREE.Group) {
        const newGeometry = (
          newMesh.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh
        )?.geometry;
        if (newGeometry) {
          // Dispose of old geometry and update mesh
          if (actualMesh.geometry) {
            actualMesh.geometry.dispose();
          }
          actualMesh.geometry = newGeometry;
        }
      }

      // If the shape is a plane or circle, adjust rotation
      if (selectedShape.type === 'circle' || selectedShape.type === 'plane') {
        actualMesh.rotation.x = Math.PI / 2;
      }
    }

    // Update prevShapesRef for the next render
    prevShapesRef.current = shapes;
  }, [shapes, selectedShapeId, design3D]);

  const updateHelperToolsPosition = useCallback(() => {
    if (!design3D || !selectedShapeId) return;

    const selectedObject = scene.children.find((child) => {
      return (
        child.userData.objectId === selectedShapeId &&
        (child instanceof THREE.Mesh ||
          (child instanceof THREE.Group && child.children.some((c) => c instanceof THREE.Mesh)))
      );
    });

    if (selectedObject instanceof THREE.Mesh) {
      const vector = new THREE.Vector3();
      vector.setFromMatrixPosition(selectedObject.matrixWorld);
      vector.project(design3D.camera);
      const offset = { x: 30, y: -40 };
      const x = ((vector.x + 1) / 2) * window.innerWidth + offset.x;
      const y = (-(vector.y - 1) / 2) * window.innerHeight + offset.y;
      setToolPosition({ x, y });
    }
  }, [design3D, selectedShapeId]);

  useEffect(() => {
    if (selectedShapeId) {
      updateHelperToolsPosition();
      setHelperTools(true);
    } else {
      setHelperTools(false);
    }
  }, [design3D, selectedShapeId]);

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {helperTools && <HelperTools position={toolPosition} />}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export default Design;
