import React from 'react';
import styles from '../panelDesign.module.css';
import { PanelHeaderProps } from '../types';


export const PanelHeader: React.FC<PanelHeaderProps> = ({
  tools,
  activeTool,
  setActiveTool,
  holeShape,
  setHoleShape,
  handleCancel,
  handleComplete,
}) => {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>Panel Designer</div>
        <div className={styles.headerCenter}>
          {tools.map(({ name, icon }) => (
            <div
              key={name}
              className={styles.toolButton}
              onClick={() => {
                if (name === 'Dig') {
                  setActiveTool(activeTool === 'Dig' ? null : 'Dig');
                  if (activeTool !== 'Dig' && !holeShape) {
                    setHoleShape('rect');
                  }
                  return;
                }
                setActiveTool(name);
              }}
              title={name}
            >
              <img src={icon} alt={name} />
              <div>{name}</div>
            </div>
          ))}
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.actionButton} ${styles.completeButton}`}
            onClick={handleComplete}
          >
            Complete
          </button>
        </div>
      </div>

      {activeTool === 'Dig' && (
        <div className={styles.subToolbar}>
          <div className={styles.subToolbarLabel}>Dig Options:</div>
          <select
            value={holeShape}
            onChange={(e) => setHoleShape(e.target.value as any)}
            className={styles.holeTypeDropdown}
          >
            <option value="rect">Rectangle Hole</option>
            <option value="circle">Circle Hole</option>
            <option value="polygon">Polygon Hole</option>
            <option value="slotting">Slotting Hole</option>
          </select>
        </div>
      )}
    </>
  );
};
