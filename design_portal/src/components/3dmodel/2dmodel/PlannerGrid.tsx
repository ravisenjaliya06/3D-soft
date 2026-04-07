// PlannerGrid.tsx
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ReactSVGPanZoom, Tool, TOOL_AUTO, Value } from 'react-svg-pan-zoom';
import { FLOOR_PLAN_TYPES, MeshObjectData } from '../sceneCreator/interface';
import { RootState } from '../store';
import { setobjectSelected } from '../store/dataSlice';
import { GRID_SIZE, REACTSVGPANZOOM_INITIAL_VALUE } from './constants';
import { Grids } from './grid';
import { TwoDSidebar } from './TwoDSidebar';
import { useWallDrawing } from './walls/useWallDrawing';
import { Wall2D } from './walls/wall2D';
import { findRoomsFromWalls, getFloorPolygon } from './walls/wallFloor';

export default function PlannerGrid() {
  const Viewer = useRef<ReactSVGPanZoom | null>(null);
  const dispatch = useDispatch();

  const [value, setValue] = useState<Value>(REACTSVGPANZOOM_INITIAL_VALUE);
  const [tool, setTool] = useState<Tool>(TOOL_AUTO);

  const {
    points,
    walls,
    startPointId,
    inputLength,
    setInputLength,
    getPreviewData,
    handleViewerClick,
    handleViewerMouseMove,
    finalizeWallByInput,
    resetDrawing,
  } = useWallDrawing(GRID_SIZE.WIDTH, GRID_SIZE.HEIGHT);

  const [localInput, setLocalInput] = useState<string | null>(null);

  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const objects = useSelector((state: RootState) => state.data.objects);
  const isDrawingActive = useSelector((state: RootState) => state.data.isWallDrawingActive);

  const selectedWall = objects.find(
    (obj: MeshObjectData) => obj.id === selectedObjectId && obj.type === FLOOR_PLAN_TYPES.WALL
  );

  const [sidebarPos, setSidebarPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 300 : 0,
    y: 100,
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar) {
        setSidebarPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
    };

    if (isDraggingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSidebar]);

  // Get data for preview wall
  const preview = getPreviewData();

  useEffect(() => {
    if (!preview) {
      setLocalInput(null);
    }
  }, [preview]);

  const rooms = findRoomsFromWalls(walls);

  useEffect(() => {
    if (Viewer.current) {
      Viewer.current.fitSelection(
        GRID_SIZE.WIDTH / 2 - window.innerWidth / 2,
        GRID_SIZE.HEIGHT / 2 - window.innerHeight / 2,
        window.innerWidth,
        window.innerHeight
      );
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrawing();
        dispatch(setobjectSelected(null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetDrawing, dispatch]);

  const onViewerClick = (event: any) => {
    if (isDrawingActive) {
      handleViewerClick(event);
    } else {
      // If clicking background, deselect
      dispatch(setobjectSelected(null));
    }
  };

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
        onClick={onViewerClick}
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

                {/* Measurement Input (centered) */}
                <foreignObject
                  x={preview.length / 2 - 40}
                  y={-45}
                  width={80}
                  height={30}
                  style={{ overflow: 'visible' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={
                        localInput !== null
                          ? localInput
                          : (preview.length / 30.48).toFixed(2)
                      }
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setLocalInput(valStr);
                        const valNum = parseFloat(valStr);
                        if (!isNaN(valNum)) {
                          setInputLength(valNum * 30.48);
                        } else {
                          setInputLength(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          finalizeWallByInput();
                          setLocalInput(null);
                        } else if (e.key === 'Escape') {
                          resetDrawing();
                          setLocalInput(null);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      style={{
                        width: '60px',
                        padding: '2px 4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        border: '2px solid #1290ff',
                        borderRadius: '4px',
                        outline: 'none',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    />
                    <span
                      style={{
                        marginLeft: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#333',
                        textShadow: '0 0 2px white',
                      }}
                    >
                      ft
                    </span>
                  </div>
                </foreignObject>
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

      {selectedWall && (
        <TwoDSidebar
          object={selectedWall}
          pos={sidebarPos}
          onDragStart={() => setIsDraggingSidebar(true)}
        />
      )}
    </div>
  );
}
