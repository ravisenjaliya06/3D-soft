import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';

import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { generateCompartmentsFromMesh } from '../../handler/items';
import { store } from '../../store';
import { addObjects } from '../../store/dataSlice';
import { parseDesignIdsFromPathname } from '../../utils/routeIds';
import { HelperToolProps, OBJECT_TYPES } from '../interface';
import {
  collectSceneObjectIds,
  createCopiedStoreObjects,
  createIdMap,
  deleteObject,
  detachInvisibleBoxes,
  restoreInvisibleBoxes,
  updateCloneIds,
} from '../utils';
import styles from './helpertool.module.css';

const HelperTool: React.FC<HelperToolProps> = ({
  design3D,
  selectedObject,
  moveHandler,
  setShowSavePopup,
  setCatalogName,
  setError,
}) => {
  const helperToolRef = useRef<CSS2DObject | null>(null);
  const rendererRef = useRef<CSS2DRenderer | null>(null);
  const isMovingRef = useRef(false);
  const router = useRouter();

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

  const handleCopy = useCallback(
    async (object: THREE.Mesh) => {
      if (!moveHandler || isMovingRef.current) return;

      const rootId = object.userData.objectId;
      if (!rootId) return;

      const allObjects = store.getState().data.objects;
      const rootData = allObjects.find((o) => o.id === rootId);
      if (!rootData) return;

      isMovingRef.current = true;
      design3D.controls.enabled = false;

      try {
        const sceneIds = collectSceneObjectIds(object);
        sceneIds.add(rootId);

        const objectsToCopy = allObjects.filter((o) => sceneIds.has(o.id));
        if (!objectsToCopy.length) return;

        const idMap = createIdMap(sceneIds);

        const invisibleBoxes = detachInvisibleBoxes(object);
        const clone = object.clone();
        restoreInvisibleBoxes(object, invisibleBoxes, rootId);

        updateCloneIds(clone, rootId, idMap);

        clone.position.add(new THREE.Vector3(0.5, 0, 0.5));
        design3D.scene.add(clone);

        const finalPos = await moveHandler.enableDragging(clone);
        if (!finalPos) {
          design3D.scene.remove(clone);
          return;
        }

        clone.position.copy(finalPos);

        const newObjects = createCopiedStoreObjects(objectsToCopy, rootId, idMap, finalPos);

        store.dispatch(addObjects(newObjects));
        generateCompartmentsFromMesh(clone);
      } catch (e) {
        console.error('Copy operation failed:', e);
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

  const handlePanelDesign = useCallback(() => {
    const { designId, versionId } = parseDesignIdsFromPathname(window.location.pathname);

    if (designId && versionId) {
      router.push(`/design/${designId}/${versionId}/paneldesign`);
    } else {
      router.push(`/design/${designId}/paneldesign`);
    }
  }, [router]);

  const handleSave = useCallback(() => {
    setCatalogName('');
    setError(null);
    setShowSavePopup(true);
  }, []);

  const actions = useCallback(() => {
    if (!moveHandler) return [];

    const baseActions = [
      {
        id: 'move',
        icon: assets.moveObject,
        title: 'Move',
        onClick: handleMove,
      },
      {
        id: 'delete',
        icon: assets.delete_helper,
        title: 'Delete',
        onClick: handleDelete,
      },
      {
        id: 'panel-design',
        icon: assets.panel_design,
        title: 'Panel Design',
        onClick: handlePanelDesign,
      },
      {
        id: 'copy',
        icon: assets.copy_helper,
        title: 'Copy',
        onClick: handleCopy,
      },
      {
        id: 'save',
        icon: assets.saveHelper,
        title: 'Save to library',
        onClick: handleSave,
      },
    ];

    const isModel =
      selectedObject?.userData?.type === 'model' ||
      selectedObject?.userData?.type === OBJECT_TYPES.MODEL;

    if (isModel) {
      return baseActions.filter((a) => a.id !== 'panel-design');
    }

    return baseActions;
  }, [selectedObject, handleMove, handleDelete, handlePanelDesign, handleCopy, handleSave]);

  const createTool = useCallback(
    (object: THREE.Mesh) => {
      removeTool();

      const container = document.createElement('div');
      container.className = styles.helperTool;

      actions().forEach((action) => {
        const btn = document.createElement('button');
        btn.className = styles.helperToolBtn;
        btn.dataset.action = action.id;
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
      label.position.y += size.y / 2 + 0.55;

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

    if (selectedObject) {
      createTool(selectedObject);
    } else {
      removeTool();
    }
  }, [selectedObject, createTool, removeTool]);

  useEffect(() => {
    if (!selectedObject) return;

    const update = () => {
      if (!helperToolRef.current) return;

      const box = new THREE.Box3().setFromObject(selectedObject);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      helperToolRef.current.position.set(center.x, center.y + size.y / 2 + 0.55, center.z);

      rendererRef.current?.render(design3D.scene, design3D.camera);
      requestAnimationFrame(update);
    };

    update();
  }, [selectedObject, design3D]);

  return null;
};

export default HelperTool;
