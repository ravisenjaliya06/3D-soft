import React from 'react';
import styles from '../panelDesign.module.css';

interface RulersProps {
  stageSize: { width: number; height: number };
  stagePosition: { x: number; y: number };
  stageScale: number;
  activeTool: string | null;
}

export const HorizontalRuler: React.FC<RulersProps> = ({
  stageSize,
  stagePosition,
  stageScale,
  activeTool,
}) => {
  const ticks = [];
  const tickSpacing = 100;
  const viewWidth = stageSize.width;
  const offset = stagePosition.x;
  const scale = stageScale;
  const totalTicks = Math.ceil(viewWidth / (tickSpacing * scale)) * 2;

  for (let i = -totalTicks; i < totalTicks; i++) {
    const x = i * tickSpacing * scale + offset;
    ticks.push(
      <div
        key={`h-tick-${i}`}
        className={styles.tickLine}
        style={{ left: `${x}px`, top: 0, width: '1px', height: '10px' }}
      />
    );
    ticks.push(
      <div
        key={`h-label-${i}`}
        className={styles.tickLabel}
        style={{ left: `${x - 2}px`, top: '10px' }}
      >
        {i * tickSpacing}
      </div>
    );
  }

  return (
    <div className={styles.rulerHorizontal} style={{ top: activeTool === 'Dig' ? '95px' : '60px' }}>
      {ticks}
    </div>
  );
};

export const VerticalRuler: React.FC<RulersProps> = ({
  stageSize,
  stagePosition,
  stageScale,
  activeTool,
}) => {
  const ticks = [];
  const tickSpacing = 100;
  const viewHeight = stageSize.height;
  const offset = stagePosition.y;
  const scale = stageScale;
  const totalTicks = Math.ceil(viewHeight / (tickSpacing * scale)) * 2;

  for (let i = -totalTicks; i < totalTicks; i++) {
    const y = i * tickSpacing * scale + offset;
    ticks.push(
      <div
        key={`v-tick-${i}`}
        className={styles.tickLine}
        style={{ top: `${y}px`, left: 0, width: '10px', height: '1px' }}
      />
    );
    ticks.push(
      <div
        key={`v-label-${i}`}
        className={styles.tickLabel}
        style={{
          top: `${y - 2}px`,
          left: '10px',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
      >
        {i * tickSpacing}
      </div>
    );
  }

  return (
    <div className={styles.rulerVertical} style={{ top: activeTool === 'Dig' ? '120px' : '85px' }}>
      {ticks}
    </div>
  );
};
