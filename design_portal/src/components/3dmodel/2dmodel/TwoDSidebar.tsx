import React, { useEffect, useState } from 'react';
import { SidebarContainer } from '../panelDesign/components/Sidebars';
import styles from '../panelDesign/panelDesign.module.css';
import { FLOOR_PLAN_TYPES, MeshObjectData } from '../sceneCreator/interface';
import { SyncManager } from '../sceneCreator/syncState';
import { FEET_CHANGE } from './constants';
import { TwoDSidebarProps } from './interface';
import { useWallAdjustment } from './walls/useWallAdjustment';

export const TwoDSidebar: React.FC<TwoDSidebarProps> = ({ object, pos, onDragStart }) => {
  const { adjustWallLength } = useWallAdjustment();

  // Wall-specific state (Feet and MM)
  const [wallLengthFt, setWallLengthFt] = useState(
    (object.dimensions.width / FEET_CHANGE).toFixed(2)
  );
  const [wallLengthMm, setWallLengthMm] = useState((object.dimensions.width * 10).toFixed(2));

  // Generic states (CM)
  const [width, setWidth] = useState(object.dimensions.width.toString());
  const [height, setHeight] = useState(object.dimensions.height.toString());
  const [depth, setDepth] = useState(object.dimensions.depth.toString());

  useEffect(() => {
    if (object.type === FLOOR_PLAN_TYPES.WALL) {
      setWallLengthFt((object.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((object.dimensions.width * 10).toFixed(2));
    } else {
      setWidth(object.dimensions.width.toString());
      setHeight(object.dimensions.height.toString());
      setDepth(object.dimensions.depth.toString());
    }
  }, [object.dimensions.width, object.dimensions.height, object.dimensions.depth, object.type]);

  const handleWallLengthChangeFt = () => {
    const val = parseFloat(wallLengthFt);
    if (!isNaN(val) && val > 0) {
      const newLengthInCm = val * FEET_CHANGE;
      adjustWallLength(object.id, newLengthInCm);
    } else {
      setWallLengthFt((object.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((object.dimensions.width * 10).toFixed(2));
    }
  };

  const handleWallLengthChangeMm = () => {
    const val = parseFloat(wallLengthMm);
    if (!isNaN(val) && val > 0) {
      const newLengthInCm = val / 10;
      adjustWallLength(object.id, newLengthInCm);
    } else {
      setWallLengthFt((object.dimensions.width / FEET_CHANGE).toFixed(2));
      setWallLengthMm((object.dimensions.width * 10).toFixed(2));
    }
  };

  const handleDimensionUpdate = async (dim: 'width' | 'height' | 'depth', val: string) => {
    const newVal = parseFloat(val);
    if (!isNaN(newVal) && newVal > 0) {
      const newDimensions = { ...object.dimensions, [dim]: newVal };
      const updateData = { id: object.id, dimensions: newDimensions };

      // Perform 3D sync
      const syncManager = new SyncManager({ ...object, ...updateData } as MeshObjectData);
      await syncManager.syncData();
    } else {
      // Revert if invalid
      if (dim === 'width') setWidth(object.dimensions.width.toString());
      if (dim === 'height') setHeight(object.dimensions.height.toString());
      if (dim === 'depth') setDepth(object.dimensions.depth.toString());
    }
  };

  const isWall = object.type === FLOOR_PLAN_TYPES.WALL;

  return (
    <SidebarContainer
      title={isWall ? 'Wall Properties' : 'Object Properties'}
      pos={pos}
      onDragStart={onDragStart}
    >
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Dimensions</div>
        {isWall ? (
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
          <div
            style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <div className={styles.sidebarRow}>
              <span style={{ minWidth: '3.75rem' }}>Width:</span>
              <input
                type="text"
                className={styles.propertyInputSmall}
                style={{ textAlign: 'right', paddingRight: '0.5rem' }}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                onBlur={() => handleDimensionUpdate('width', width)}
                onKeyDown={(e) => e.key === 'Enter' && handleDimensionUpdate('width', width)}
              />
              <span style={{ fontSize: '0.625rem', color: '#888' }}>cm</span>
            </div>
            <div className={styles.sidebarRow}>
              <span style={{ minWidth: '3.75rem' }}>Height:</span>
              <input
                type="text"
                className={styles.propertyInputSmall}
                style={{ textAlign: 'right', paddingRight: '0.5rem' }}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onBlur={() => handleDimensionUpdate('height', height)}
                onKeyDown={(e) => e.key === 'Enter' && handleDimensionUpdate('height', height)}
              />
              <span style={{ fontSize: '0.625rem', color: '#888' }}>cm</span>
            </div>
            <div className={styles.sidebarRow}>
              <span style={{ minWidth: '3.75rem' }}>Depth:</span>
              <input
                type="text"
                className={styles.propertyInputSmall}
                style={{ textAlign: 'right', paddingRight: '0.5rem' }}
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                onBlur={() => handleDimensionUpdate('depth', depth)}
                onKeyDown={(e) => e.key === 'Enter' && handleDimensionUpdate('depth', depth)}
              />
              <span style={{ fontSize: '0.625rem', color: '#888' }}>cm</span>
            </div>
          </div>
        )}
      </div>
    </SidebarContainer>
  );
};
