import React from 'react';
import { DEFAULT_OFFSET } from '../constants';
import { HoleOffsetInputsProps, Point } from '../types';
import { getHoleBounds, getPanelBounds } from '../utils/boundsUtils';

const INPUT_STYLE: React.CSSProperties = {
  position: 'fixed',
  transform: 'translate(-50%, -50%)',
  width: 56,
  height: 20,
  fontSize: 11,
  padding: 0,
  margin: 0,
  border: '1px solid #666',
  outline: 'none',
  textAlign: 'center',
  zIndex: 50,
};

export const HoleOffsetInputs: React.FC<HoleOffsetInputsProps> = ({
  hole,
  shapePoints,
  defaultPanelPoints,
  stageRef,
  stagePosition,
  stageScale,
  leftValue,
  topValue,
  onLeftChange,
  onTopChange,
  onCommit,
}) => {
  const stage = stageRef.current;
  const container = stage?.container();
  if (!stage || !container) return null;

  const panelB = getPanelBounds(shapePoints, defaultPanelPoints);
  const holeB = getHoleBounds(hole);

  const leftMidWorld = {
    x: (panelB.minX + holeB.minX) / 2,
    y: holeB.minY - DEFAULT_OFFSET,
  };
  const topMidWorld = {
    x: holeB.minX + DEFAULT_OFFSET,
    y: (panelB.minY + holeB.minY) / 2,
  };

  const rect = container.getBoundingClientRect();
  const toScreen = (p: Point) => ({
    left: rect.left + (stagePosition.x + p.x * stageScale),
    top: rect.top + (stagePosition.y + p.y * stageScale),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
  };

  return (
    <>
      <input
        value={leftValue}
        onChange={(e) => onLeftChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        style={{
          ...INPUT_STYLE,
          left: toScreen(leftMidWorld).left,
          top: toScreen(leftMidWorld).top,
        }}
      />
      <input
        value={topValue}
        onChange={(e) => onTopChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        style={{ ...INPUT_STYLE, left: toScreen(topMidWorld).left, top: toScreen(topMidWorld).top }}
      />
    </>
  );
};
