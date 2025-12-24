import { assets } from '@/svgPaths';
import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { HelperToolProps } from '../interface';
import { deleteObject } from '../utils';
import styles from './helpertool.module.css';

const HelperTool: React.FC<HelperToolProps> = ({ design3D, selectedObject, moveHandler }) => {
  const helperToolRef = useRef<CSS2DObject | null>(null);
  const rendererRef = useRef<CSS2DRenderer | null>(null);
  const isMovingRef = useRef(false);

  const initRenderer = useCallback(() => {
    if (rendererRef.current) return;

    const renderer = new CSS2DRenderer();
    const size = design3D.renderer.getSize(new THREE.Vector2());

    renderer.setSize(size.width, size.height);
    renderer.domElement.className = styles.helperToolLayer;
    design3D.renderer.domElement.parentElement?.appendChild(renderer.domElement);

    rendererRef.current = renderer;
  }, [design3D]);

  const removeTool = useCallback(() => {
    if (!helperToolRef.current) return;

    helperToolRef.current.removeFromParent();
    helperToolRef.current.element.remove();
    helperToolRef.current = null;
  }, []);

  const handleMove = useCallback(
    async (object: THREE.Mesh) => {
      if (!moveHandler || isMovingRef.current) return;

      isMovingRef.current = true;
      design3D.controls.enabled = false;

      try {
        const finalPos = await moveHandler.enableDragging(object);
        if (finalPos) {
          object.position.copy(finalPos);
        }
      } catch (error) {
        console.error('Move failed:', error);
      } finally {
        isMovingRef.current = false;
        design3D.controls.enabled = true;
      }
    },
    [moveHandler, design3D]
  );

  const handleDelete = useCallback(() => {
    deleteObject();
    removeTool();
  }, []);

  const actions = useCallback(() => {
    if (!moveHandler) return [];

    return [
      {
        id: 'move',
        icon: assets.moveObject,
        title: 'Move',
        onClick: handleMove,
      },
      {
        id: 'delete',
        icon: assets.newclear,
        title: 'Delete',
        onClick: handleDelete,
      },
    ];
  }, [moveHandler, design3D]);

  const createTool = useCallback(
    (object: THREE.Mesh) => {
      removeTool();

      const container = document.createElement('div');
      container.className = styles.helperTool;

      actions().forEach((action) => {
        const btn = document.createElement('button');
        btn.className = styles.helperToolBtn;
        btn.innerHTML = `<img src="${action.icon}" alt="${action.title}" />`;
        btn.title = action.title;

        btn.onclick = (e) => {
          e.stopPropagation();
          action.onClick(object);
        };

        container.appendChild(btn);
      });

      const label = new CSS2DObject(container);
      label.name = 'helper_tool';

      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      label.position.copy(center);
      label.position.y += size.y / 2 + 0.12;

      design3D.scene.add(label);
      helperToolRef.current = label;
    },
    [actions, removeTool, design3D.scene]
  );

  useEffect(() => {
    initRenderer();
    return removeTool;
  }, [initRenderer, removeTool]);

  useEffect(() => {
    if (!rendererRef.current) return;

    if (selectedObject) createTool(selectedObject);
    else removeTool();
  }, [selectedObject, createTool, removeTool]);

  useEffect(() => {
    if (!selectedObject) return;

    const update = () => {
      if (!helperToolRef.current) return;

      const box = new THREE.Box3().setFromObject(selectedObject);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      helperToolRef.current.position.set(center.x, center.y + size.y / 2 + 0.12, center.z);

      rendererRef.current?.render(design3D.scene, design3D.camera);
      requestAnimationFrame(update);
    };

    update();
  }, [selectedObject, design3D]);

  return null;
};

export default HelperTool;
