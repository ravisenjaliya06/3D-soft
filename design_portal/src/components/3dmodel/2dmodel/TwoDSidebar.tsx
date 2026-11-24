import React, { useEffect, useState } from 'react';
import { SidebarContainer } from '../panelDesign/components/Sidebars';
import styles from '../panelDesign/panelDesign.module.css';
import { FLOOR_PLAN_TYPES } from '../sceneCreator/interface';
import { FEET_CHANGE } from './constants';
import { TwoDSidebarProps } from './interface';
import { useWallAdjustment } from './walls/useWallAdjustment';

export const TwoDSidebar: React.FC<TwoDSidebarProps> = ({
  object,
  pos,
  onDragStart,
  pointMode,
  onPointModeChange,
}) => {
  const { adjustWallLength } = useWallAdjustment();
  const selectedWall = object && object.type === FLOOR_PLAN_TYPES.WALL ? object : null;

  // Wall-specific state (Feet and MM)
  const [wallLengthFt, setWallLengthFt] = useState(
    selectedWall ? (selectedWall.dimensions.width / FEET_CHANGE).toFixed(2) : ''
  );
  const [wallLengthMm, setWallLengthMm] = useState(
    selectedWall ? (selectedWall.dimensions.width * 10).toFixed(2) : ''
  );

  useEffect(() => {
    if (selectedWall) {
      setWallLengthFt((selectedWall.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((selectedWall.dimensions.width * 10).toFixed(2));
    } else {
      setWallLengthFt('');
      setWallLengthMm('');
    }
  }, [selectedWall]);

  const handleWallLengthChangeFt = () => {
    if (!selectedWall) return;
    const val = parseFloat(wallLengthFt);
    if (!isNaN(val) && val > 0) {
      const newLengthInCm = val * FEET_CHANGE;
      adjustWallLength(selectedWall.id, newLengthInCm);
    } else {
      setWallLengthFt((selectedWall.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((selectedWall.dimensions.width * 10).toFixed(2));
    }
  };

  const handleWallLengthChangeMm = () => {
    if (!selectedWall) return;
    const val = parseFloat(wallLengthMm);
    if (!isNaN(val) && val > 0) {
      const newLengthInCm = val / 10;
      adjustWallLength(selectedWall.id, newLengthInCm);
    } else {
      setWallLengthFt((selectedWall.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((selectedWall.dimensions.width * 10).toFixed(2));
    }
  };

  return (
    <SidebarContainer title="Wall Properties" pos={pos} onDragStart={onDragStart}>
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Dimensions</div>
        {selectedWall ? (
          <>
            <div className={`${styles.sidebarRow} ${styles.wallRow}`}>
              <span className={styles.wallLabel}>Length (ft):</span>
              <div className={styles.wallField}>
                <input
                  type="text"
                  value={wallLengthFt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWallLengthFt(val);
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                      setWallLengthMm((parsed * FEET_CHANGE * 10).toFixed(2));
                    } else {
                      setWallLengthMm('');
                    }
                  }}
                  onBlur={handleWallLengthChangeFt}
                  onKeyDown={(e) => e.key === 'Enter' && handleWallLengthChangeFt()}
                  className={styles.wallInput}
                />
                <span className={styles.wallUnit}>FT</span>
              </div>
            </div>
            <div className={`${styles.sidebarRow} ${styles.wallRow}`}>
              <span className={styles.wallLabel}>Length (mm):</span>
              <div className={styles.wallField}>
                <input
                  type="text"
                  value={wallLengthMm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWallLengthMm(val);
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                      setWallLengthFt((parsed / 10 / FEET_CHANGE).toFixed(2));
                    } else {
                      setWallLengthFt('');
                    }
                  }}
                  onBlur={handleWallLengthChangeMm}
                  onKeyDown={(e) => e.key === 'Enter' && handleWallLengthChangeMm()}
                  className={styles.wallInput}
                />
                <span className={styles.wallUnit}>MM</span>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.wallEmpty}>Select a wall to edit dimensions.</div>
        )}
      </div>
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Points Selection</div>
        <div className={styles.pointModes} role="radiogroup" aria-label="Points selection">
          {(['internal', 'center', 'external'] as const).map((mode) => (
            <label
              key={mode}
              className={`${styles.pointMode} ${pointMode === mode ? styles.pointModeActive : ''}`}
            >
              <input
                type="radio"
                name="wall-point-mode"
                checked={pointMode === mode}
                onChange={() => onPointModeChange(mode)}
              />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </div>
    </SidebarContainer>
  );
};
