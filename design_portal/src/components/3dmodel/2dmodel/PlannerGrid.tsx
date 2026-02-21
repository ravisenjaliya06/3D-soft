// PlannerGrid.tsx
import { useEffect, useRef, useState } from 'react';
import { ReactSVGPanZoom, Tool, TOOL_AUTO, Value } from 'react-svg-pan-zoom';
import { GRID_SIZE, REACTSVGPANZOOM_INITIAL_VALUE } from './constants';
import { Grids } from './grid';
import { useWallDrawing } from './walls/useWallDrawing';
import { Wall2D } from './walls/wall2D';
import { findRoomsFromWalls, getFloorPolygon } from './walls/wallFloor';

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
  } = useWallDrawing(GRID_SIZE.WIDTH, GRID_SIZE.HEIGHT);

  // Get data for preview wall
  const preview = getPreviewData();

  const rooms = findRoomsFromWalls(walls);

  useEffect(() => {
    Viewer.current?.fitToViewer();
  }, []);

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
    <div className="fixed inset-0 overflow-hidden bg-[#fafafa]">
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
          {/* CENTER EVERYTHING */}
          <g transform={`translate(${GRID_SIZE.WIDTH / 2}, ${GRID_SIZE.HEIGHT / 2})`}>
            <Grids width={GRID_SIZE.WIDTH} height={GRID_SIZE.HEIGHT} />

            {walls.map((wall) => (
              <Wall2D key={wall.id} wall={wall} />
            ))}

            {rooms.map((room, i) => {
              const floorPoints = getFloorPolygon(room);
              return (
                <polygon
                  key={i}
                  points={floorPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="#f2f2f2"
                  stroke="#bbb"
                  strokeWidth={2}
                  opacity={0.9}
                />
              );
            })}

            <defs>
              <pattern
                id="wallDoubleHatch"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#3700ffff" strokeWidth="1" />
                <line x1="8" y1="0" x2="8" y2="8" stroke="#b0b0b0" strokeWidth="1" />
              </pattern>
            </defs>

            {preview && (
              <g
                transform={`translate(${preview.start.x}, ${preview.start.y}) rotate(${preview.angle})`}
              >
                {/* Hatched wall fill */}
                <rect
                  x={0}
                  y={-15}
                  width={preview.length}
                  height={30}
                  fill="url(#wallDoubleHatch)"
                  opacity="0.6"
                />

                {/* Blue guideline top */}
                <line
                  x1={0}
                  y1={-17}
                  x2={preview.length}
                  y2={-17}
                  stroke="#1290ff"
                  strokeWidth={2}
                />

                {/* Blue guideline bottom */}
                <line x1={0} y1={17} x2={preview.length} y2={17} stroke="#1290ff" strokeWidth={2} />

                {/* End circles */}
                <circle cx={0} cy={0} r={6} fill="#1290ff" stroke="#fff" strokeWidth={2} />
                <circle
                  cx={preview.length}
                  cy={0}
                  r={6}
                  fill="#1290ff"
                  stroke="#fff"
                  strokeWidth={2}
                />

                {/* Measurement text (centered) */}
                <text
                  x={preview.length / 2}
                  y={-25}
                  fill="#000"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {(preview.length / 30.48).toFixed(2)} ft
                </text>
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
          </g>
        </svg>
      </ReactSVGPanZoom>
    </div>
  );
}
