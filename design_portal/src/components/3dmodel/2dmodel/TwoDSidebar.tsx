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
            <div className={styles.sidebarRow} style={{ marginTop: '0.75rem' }}>
              <span style={{ fontWeight: 500, color: '#555' }}>Length (ft):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  style={{
                    width: '5rem',
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>FT</span>
              </div>
            </div>
            <div className={styles.sidebarRow} style={{ marginTop: '0.75rem' }}>
              <span style={{ fontWeight: 500, color: '#555' }}>Length (mm):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  style={{
                    width: '5rem',
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>MM</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '0.5rem' }}>
            Select a wall to edit dimensions.
          </div>
        )}
      </div>
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Points Selection</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {(['internal', 'center', 'external'] as const).map((mode) => (
            <label
              key={mode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#444',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="wall-point-mode"
                checked={pointMode === mode}
                onChange={() => onPointModeChange(mode)}
              />
              <span style={{ textTransform: 'capitalize' }}>{mode}</span>
            </label>
          ))}
        </div>
      </div>
    </SidebarContainer>
  );
};
