import React, { useEffect, useRef, useState } from 'react';
import { LuBox, LuChevronUp, LuLayers, LuSquareDashed } from 'react-icons/lu';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { FLOOR_PLAN_TYPES, OBJECT_TYPES } from '../sceneCreator/interface';
import { RootState } from '../store';
import { setWireframeColor, toggleWireframe } from '../store/dataSlice';
import styles from './footer.module.css';
import { FooterProps } from './interface';

const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  const dispatch = useDispatch();
  const isWireframeVisible = useSelector((state: RootState) => state.data.isWireframeVisible);
  const wireframeColor = useSelector((state: RootState) => state.data.wireframeColor);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWireframeToggle = (newValue: boolean) => {
    dispatch(toggleWireframe(newValue));
    setShowModeDropdown(false);

    if (!scene) return;

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const type = obj.userData.type;
      if (
        type === OBJECT_TYPES.SINK ||
        type === OBJECT_TYPES.MODEL ||
        type === FLOOR_PLAN_TYPES.FLOOR ||
        obj.userData.isMain ||
        obj.userData.isInvisibleBox
      ) {
        return;
      }

      obj.children.forEach((child) => {
        if (child.userData.isWireframeEdge) {
          child.visible = newValue;
        }
      });
    });
  };

  const handleColorChange = (color: string) => {
    dispatch(setWireframeColor(color));

    if (!scene) return;

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.children.forEach((child) => {
        if (child.userData.isWireframeEdge && child instanceof THREE.LineSegments) {
          if (child.material instanceof THREE.LineBasicMaterial) {
            child.material.color.set(color);
          }
        }
      });
    });
  };

  return (
    <div className={styles.dock} role="toolbar" aria-label="View options">
      {/* View: 2D plan or 3D model */}
      <div className={styles.segment}>
        <span className={styles.segmentLabel}>View</span>
        <div className={styles.switch}>
          <button
            type="button"
            onClick={() => onViewModeChange('2d')}
            className={`${styles.switchButton} ${viewMode === '2d' ? styles.switchButtonActive : ''}`}
            aria-pressed={viewMode === '2d'}
          >
            <LuSquareDashed aria-hidden="true" />
            2D
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('3d')}
            className={`${styles.switchButton} ${viewMode === '3d' ? styles.switchButtonActive : ''}`}
            aria-pressed={viewMode === '3d'}
          >
            <LuBox aria-hidden="true" />
            3D
          </button>
        </div>
      </div>

      <span className={styles.divider} aria-hidden="true" />

      {/* Display: solid or solid with panel edges */}
      <div className={styles.segment} ref={dropdownRef}>
        <span className={styles.segmentLabel}>Display</span>
        <button
          type="button"
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          className={`${styles.modeButton} ${showModeDropdown ? styles.modeButtonOpen : ''}`}
          aria-expanded={showModeDropdown}
        >
          <LuLayers aria-hidden="true" />
          <span>{isWireframeVisible ? 'Solid + Edge' : 'Solid'}</span>
          <LuChevronUp aria-hidden="true" className={styles.modeChevron} />
        </button>
        {showModeDropdown && (
          <div className={styles.modeMenu}>
            <button
              type="button"
              onClick={() => handleWireframeToggle(false)}
              className={`${styles.modeOption} ${!isWireframeVisible ? styles.modeOptionActive : ''}`}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => handleWireframeToggle(true)}
              className={`${styles.modeOption} ${isWireframeVisible ? styles.modeOptionActive : ''}`}
            >
              Solid + Edge
            </button>
          </div>
        )}
      </div>

      {/* Edge colour, only when edges are shown */}
      {isWireframeVisible && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.segment}>
            <span className={styles.segmentLabel}>Edges</span>
            <div className={styles.swatches}>
              <button
                type="button"
                onClick={() => handleColorChange('#000000')}
                className={`${styles.swatch} ${wireframeColor === '#000000' ? styles.swatchActive : ''}`}
                title="Black edges"
                aria-label="Black edges"
                aria-pressed={wireframeColor === '#000000'}
              >
                <span className={styles.swatchDot} style={{ background: '#000000' }} />
              </button>
              <button
                type="button"
                onClick={() => handleColorChange('#FFFFFF')}
                className={`${styles.swatch} ${wireframeColor === '#FFFFFF' ? styles.swatchActive : ''}`}
                title="White edges"
                aria-label="White edges"
                aria-pressed={wireframeColor === '#FFFFFF'}
              >
                <span className={styles.swatchDot} style={{ background: '#FFFFFF' }} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Footer;
