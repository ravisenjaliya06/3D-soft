import { useState, useEffect, useRef } from 'react';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';

export function useStageManager(panelWidth: number, panelHeight: number) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight - 120; // Adjusted for header, subtoolbar, and footer
      setStageSize({ width, height });
      setStagePosition({ x: width / 2, y: height / 2 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (panelWidth > 0 && panelHeight > 0 && stageSize.width > 0 && stageSize.height > 0) {
      const padding = 50;
      const availableWidth = stageSize.width - padding * 2;
      const availableHeight = stageSize.height - padding * 2;

      const scaleX = availableWidth / panelWidth;
      const scaleY = availableHeight / panelHeight;
      const newScale = Math.min(scaleX, scaleY, 1.0);

      setStageScale(newScale);
      setStagePosition({
        x: stageSize.width / 2,
        y: stageSize.height / 2
      });
    }
  }, [panelWidth, panelHeight, stageSize.width, stageSize.height]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  return {
    stageRef,
    stageSize,
    stageScale,
    setStageScale,
    stagePosition,
    setStagePosition,
    handleWheel,
  };
}
