import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { FaArrowsAlt, FaCopy, FaDoorOpen, FaTrash } from 'react-icons/fa';
import * as THREE from 'three';
import { toggleDoor, toggleDrawer } from '../handler/items';
import { store } from '../store';
import styles from './HelperTools.module.css';
import { HelperToolsProps } from './interface';

const HelperTools: React.FC<HelperToolsProps> = ({
  onCopy,
  onDelete,
  onMove,
  isLocked = false,
}) => {
  const designId = window.location.pathname.split('/')[2];
  const router = useRouter();
  const [isChildObject, setIsChildObject] = useState(false);

  useEffect(() => {
    const selectedChildMesh = store.getState().data.selectedChildObject;
    if (selectedChildMesh) {
      setIsChildObject(true);
    }
  }, [store.getState().data.selectedChildObject]);

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMove) onMove();
  };

  const handleOpenClose = () => {
    const selectedObject = store.getState().data.selectedChildObject;
    const scene = store.getState().scene.scene;
    scene.traverse((child) => {
      if (child.userData.objectId === selectedObject) {
        if (child.name.includes('DOOR')) {
          toggleDoor(child as THREE.Mesh);
        }
        if (child.name.includes('DRAWER')) {
          toggleDrawer(child as THREE.Mesh);
        }
      }
    });
  };

  const handlePanelDesign = () => {
    router.push(`/design/${designId}/paneldesign`);
  };

  return (
    <div className={styles.helperTools} onClick={handleContainerClick}>
      {isChildObject && (
        <div className={styles.toolItem} onClick={handlePanelDesign} title="Panel Design">
          <img src={assets.edit} />
        </div>
      )}
      <div className={styles.toolItem} onClick={handleCopy} title="Copy">
        <FaCopy />
      </div>
      <div className={styles.toolItem} onClick={handleDelete} title="Delete">
        <FaTrash />
      </div>
      {onMove && !isLocked && (
        <div className={styles.toolItem} onClick={handleMove} title="Move">
          <FaArrowsAlt />
        </div>
      )}
      <div className={styles.toolItem} onClick={handleOpenClose} title="OpenClose">
        <FaDoorOpen />
      </div>
    </div>
  );
};

export default HelperTools;
