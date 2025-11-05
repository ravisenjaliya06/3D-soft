import { useAppSelector } from '@/components/3dmodel/hooks';
import React, { useEffect, useRef, useState } from 'react';
import { FaEdit, FaExclamationTriangle, FaGripVertical } from 'react-icons/fa';
import * as THREE from 'three';
import { HelperToolsProps } from '../../interface';
import styles from './HelperTools.module.css';

const EditPopup: React.FC<{ onClose: () => void; onConfirm: () => void }> = ({
  onClose,
  onConfirm,
}) => {
  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popup}>
        <div className={styles.popupHeader}>
          <FaExclamationTriangle className={styles.warningIcon} />
          <h2 className={styles.popupTitle}>Convert to Editable Model?</h2>
        </div>
        <div className={styles.popupContent}>
          After conversion, the model can be customized and edited, but its shape parameters will be
          lost. Double-click the model to quickly convert it.
        </div>
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.cancelButton}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.button} ${styles.confirmButton}`} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const HelperTools: React.FC<HelperToolsProps> = ({ position: initialPosition }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({
    x: initialPosition.x,
    y: initialPosition.y,
  });
  const [showEditPopup, setShowEditPopup] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const selectedShapeId = useAppSelector((state) => state.customDesign.selectedShapeId);
  const scene = useAppSelector((state) => state.customDesign.sceneState.scene);

  // Set initial position when component mounts
  useEffect(() => {
    setCurrentPosition({ x: initialPosition.x, y: initialPosition.y });
  }, [initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setCurrentPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleShowEditPopup = () => {
    setShowEditPopup(true);
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
  };

  const handleConfirmEdit = () => {
    // Add your conversion logic here
    const object = scene.children.find((child) => child.userData.objectId === selectedShapeId);
    // scene.remove(object as THREE.Object3D);
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry;
    if (geometry.index) {
      (object as THREE.Mesh).geometry = geometry.toNonIndexed();
    }
    // scene.add(object as THREE.Object3D);
    setShowEditPopup(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      <div
        ref={dragRef}
        className={`${styles.helperTools} ${isDragging ? styles.dragging : ''}`}
        style={{ left: currentPosition.x, top: currentPosition.y }}
      >
        <div className={styles.contentWrapper}>
          <div className={styles.dotsContainer} onMouseDown={handleMouseDown}>
            <FaGripVertical />
          </div>
          <div className={styles.toolsContainer}>
            <div className={styles.toolItem} title="Edit" onClick={handleShowEditPopup}>
              <FaEdit />
            </div>
          </div>
        </div>
      </div>
      {showEditPopup && <EditPopup onClose={handleCloseEditPopup} onConfirm={handleConfirmEdit} />}
    </>
  );
};

export default HelperTools;
