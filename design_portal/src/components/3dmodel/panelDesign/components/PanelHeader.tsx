import React, { useEffect, useRef, useState } from 'react';
import { PANEL_TOOLS } from '../constants';
import styles from '../panelDesign.module.css';
import { PanelHeaderProps } from '../types';

const DIG_SUB_TOOLS: { value: 'rect' | 'circle' | 'polygon'; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'polygon', label: 'Pen' },
  { value: 'circle', label: 'Circle' },
];

const DigSubToolIcon = ({ value }: { value: string; label: string }) => {
  const svgProps = { width: 20, height: 16, viewBox: '0 0 20 16', fill: 'currentColor' };
  const stroke = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.5 };
  if (value === 'rect')
    return (
      <svg {...svgProps}>
        <rect x={1} y={1} width={18} height={14} rx={1} {...stroke} />
      </svg>
    );
  if (value === 'polygon')
    return (
      <svg {...svgProps}>
        <path d="M10 1 L18 6 L15 14 L5 14 L2 6 Z" {...stroke} />
      </svg>
    );
  if (value === 'circle')
    return (
      <svg {...svgProps}>
        <circle cx={10} cy={8} r={6} {...stroke} />
      </svg>
    );
  return null;
};

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  tools,
  activeTool,
  setActiveTool,
  holeShape,
  setHoleShape,
  handleCancel,
  handleComplete,
  handleRestoreDefault,
}) => {
  const digButtonRef = useRef<HTMLDivElement | null>(null);
  const [digButtonRect, setDigButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (activeTool !== 'Dig' || !digButtonRef.current) {
      setDigButtonRect(null);
      return;
    }
    const update = () =>
      digButtonRef.current && setDigButtonRect(digButtonRef.current.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeTool]);

  const subToolbarStyle = digButtonRect
    ? { left: digButtonRect.left + digButtonRect.width / 2, top: digButtonRect.bottom + 8 }
    : { left: '50%', top: 76 };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerEyebrow}>Workshop</span>
          Panel Designer
        </div>
        <div className={styles.headerCenter}>
          {tools.map(({ name, icon }) => (
            <div
              key={name}
              className={styles.toolButton}
              onClick={() => {
                if (name === PANEL_TOOLS.RESTORE) {
                  handleRestoreDefault();
                  return;
                }
                if (name === PANEL_TOOLS.DIG) {
                  setActiveTool(activeTool === PANEL_TOOLS.DIG ? null : PANEL_TOOLS.DIG);
                  if (activeTool !== PANEL_TOOLS.DIG && !holeShape) {
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

      {activeTool === PANEL_TOOLS.DIG && (
        <div className={styles.digSubToolbar} style={subToolbarStyle}>
          {DIG_SUB_TOOLS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`${styles.digSubToolButton} ${holeShape === value ? styles.digSubToolButtonActive : ''}`}
              onClick={() => setHoleShape(value)}
              title={label}
            >
              <DigSubToolIcon value={value} label={label} />
            </button>
          ))}
        </div>
      )}
    </>
  );
};
