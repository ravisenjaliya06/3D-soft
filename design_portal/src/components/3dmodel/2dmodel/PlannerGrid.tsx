import { useEffect, useRef, useState } from 'react';
import { ReactSVGPanZoom, Tool, TOOL_AUTO, Value } from 'react-svg-pan-zoom';
import { GRID_SIZE, REACTSVGPANZOOM_INITIAL_VALUE } from './constants';
import { Grids } from './grid';
import { useWallDrawing } from './walls/useWallDrawing';
import { Wall2D } from './walls/wall2D';

export default function PlannerGrid() {
  const Viewer = useRef<ReactSVGPanZoom | null>(null);

  const [value, setValue] = useState<Value>(REACTSVGPANZOOM_INITIAL_VALUE);
  const [tool, setTool] = useState<Tool>(TOOL_AUTO);

  const {
    points,
    walls,
    startPointId,
    getPreviewData,
    handleViewerClick,
    handleViewerMouseMove,
    resetDrawing,
  } = useWallDrawing();

  // Get data for preview wall
  const preview = getPreviewData();

  // zoom and move automatically so the entire SVG grid fits inside the screen.
  useEffect(() => {
    if (Viewer.current) {
      Viewer.current.fitToViewer();
    }
  }, []);

  // Handle ESC key to reset wall drawing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetDrawing]);

  return (
    <div className="fixed top-0 left-0 h-screen w-screen overflow-hidden bg-[#fafafa]">
      <ReactSVGPanZoom
        ref={Viewer}
        width={window.innerWidth}
        height={window.innerHeight}
        tool={tool}
        onChangeTool={setTool}
        value={value}
        onChangeValue={setValue}
        onClick={handleViewerClick}
        onMouseMove={handleViewerMouseMove}
        toolbarProps={{
          position: 'none',
        }}
        miniatureProps={{
          position: 'none',
          background: 'transparent',
          width: 0,
          height: 0,
        }}
        background="#fafafa"
        SVGBackground="#fafafa"
        detectWheel={true}
        detectAutoPan={false}
        scaleFactorOnWheel={1.1}
      >
        <svg width={GRID_SIZE.WIDTH} height={GRID_SIZE.HEIGHT}>
          <Grids width={GRID_SIZE.WIDTH} height={GRID_SIZE.HEIGHT} />

          {walls.map((wall) => (
            <Wall2D key={wall.id} wall={wall} />
          ))}

          {preview && (
            <g
              transform={`translate(${preview.start.x}, ${preview.start.y}) rotate(${preview.angle})`}
            >
              <rect
                x={0}
                y={-10}
                width={preview.length}
                height={20}
                fill="none"
                stroke="#ff0000"
                strokeWidth={3}
                strokeDasharray="8 4"
                opacity={0.8}
              />
            </g>
          )}

          {points.map((point) => (
            <circle
              key={point.id}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={point.id === startPointId ? '#ff0000' : '#0066ff'}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </svg>
      </ReactSVGPanZoom>
    </div>
  );
}
