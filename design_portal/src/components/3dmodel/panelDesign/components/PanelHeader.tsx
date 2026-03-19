import React, { useRef, useState, useEffect } from 'react';
import { assets } from '@/svgPaths';
import styles from '../panelDesign.module.css';
import { PanelHeaderProps } from '../types';

const DIG_SUB_TOOLS: { value: 'rect' | 'circle' | 'polygon' | 'slotting'; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'circle', label: 'Circle' },
  { value: 'slotting', label: 'Slotting' },
];

const SLOTTING_FILTER = 'invert(18%) sepia(87%) saturate(1913%) hue-rotate(241deg) brightness(87%) contrast(98%)';

const DigSubToolIcon = ({ value, label }: { value: string; label: string }) => {
  if (value === 'slotting') {
    return <img src={assets.slotting} alt={label} style={{ width: 20, height: 16, objectFit: 'contain', filter: SLOTTING_FILTER }} />;
  }
  const svgProps = { width: 20, height: 16, viewBox: '0 0 20 16', fill: 'currentColor' };
  const stroke = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.5 };
  if (value === 'rect') return <svg {...svgProps}><rect x={1} y={1} width={18} height={14} rx={1} {...stroke} /></svg>;
  if (value === 'polygon') return <svg {...svgProps}><path d="M10 1 L18 6 L15 14 L5 14 L2 6 Z" {...stroke} /></svg>;
  if (value === 'circle') return <svg {...svgProps}><circle cx={10} cy={8} r={6} {...stroke} /></svg>;
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
}) => {
  const digButtonRef = useRef<HTMLDivElement | null>(null);
  const [digButtonRect, setDigButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (activeTool !== 'Dig' || !digButtonRef.current) {
      setDigButtonRect(null);
      return;
    }
    const update = () => digButtonRef.current && setDigButtonRect(digButtonRef.current.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeTool]);

  const handleToolClick = (name: string) => {
    if (name === 'Dig') {
      setActiveTool(activeTool === 'Dig' ? null : 'Dig');
      if (activeTool !== 'Dig' && !holeShape) setHoleShape('rect');
    } else {
      setActiveTool(name);
    }
  };

  const subToolbarStyle = digButtonRect
    ? { left: digButtonRect.left + digButtonRect.width / 2, top: digButtonRect.bottom + 8 }
    : { left: '50%', top: 76 };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>Panel Designer</div>
        <div className={styles.headerCenter}>
          {tools.map(({ name, icon }) => (
            <div
              key={name}
              ref={name === 'Dig' ? digButtonRef : undefined}
              className={`${styles.toolButton} ${activeTool === name ? styles.toolButtonActive : ''}`}
              onClick={() => handleToolClick(name)}
              title={name}
            >
              <img src={icon} alt={name} />
              <div>{name}</div>
            </div>
          ))}
        </div>
        <div className={styles.headerRight}>
          <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleCancel}>Cancel</button>
          <button className={`${styles.actionButton} ${styles.completeButton}`} onClick={handleComplete}>Complete</button>
        </div>
      </div>

      {activeTool === 'Dig' && (
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
