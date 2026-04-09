// PlannerGrid.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ReactSVGPanZoom, Tool, TOOL_AUTO, Value } from 'react-svg-pan-zoom';
import { FLOOR_PLAN_TYPES, MeshObjectData } from '../sceneCreator/interface';
import { getFootprintQuadFromReferenceEdge, perpLeft2D } from '../sceneCreator/utils';
import { RootState } from '../store';
import { setobjectSelected, toggleWallDrawing } from '../store/dataSlice';
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

  let previewWallLayer: ReactNode = null;
  if (preview && preview.length > 0.5) {
    const t = preview.thickness ?? 30;
    const sign = preview.offsetSign ?? 1;
    const [rs, re, oppRe, oppRs] = getFootprintQuadFromReferenceEdge(
      preview.start,
      preview.effectiveEnd,
      sign,
      t
    );
    const footprintPts = `${rs.x},${rs.y} ${re.x},${re.y} ${oppRe.x},${oppRe.y} ${oppRs.x},${oppRs.y}`;
    const midRef = { x: (rs.x + re.x) / 2, y: (rs.y + re.y) / 2 };
    const midOpp = { x: (oppRe.x + oppRs.x) / 2, y: (oppRe.y + oppRs.y) / 2 };
    const dx = preview.effectiveEnd.x - preview.start.x;
    const dy = preview.effectiveEnd.y - preview.start.y;
    const plen = Math.hypot(dx, dy) || 1;
    const pl = perpLeft2D(dx / plen, dy / plen);
    const labelLift = 36;
    const labelX = midRef.x - pl.x * sign * labelLift - 40;
    const labelY = midRef.y - pl.y * sign * labelLift - 14;
    previewWallLayer = (
      <g>
        <polygon points={footprintPts} fill="url(#wallDoubleHatch)" opacity="0.6" stroke="none" />

        <line x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} stroke="#1290ff" strokeWidth={2} />
        <line
          x1={oppRs.x}
          y1={oppRs.y}
          x2={oppRe.x}
          y2={oppRe.y}
          stroke="#1290ff"
          strokeWidth={2}
        />

        <line x1={re.x} y1={re.y} x2={oppRe.x} y2={oppRe.y} stroke="#1290ff" strokeWidth={2} />
        <line x1={rs.x} y1={rs.y} x2={oppRs.x} y2={oppRs.y} stroke="#1290ff" strokeWidth={2} />

        <line
          x1={midRef.x}
          y1={midRef.y}
          x2={midOpp.x}
          y2={midOpp.y}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="6 4"
        />

        <circle cx={rs.x} cy={rs.y} r={6} fill="#1290ff" stroke="#fff" strokeWidth={2} />
        <circle cx={re.x} cy={re.y} r={6} fill="#1290ff" stroke="#fff" strokeWidth={2} />

        <foreignObject x={labelX} y={labelY} width={80} height={30} style={{ overflow: 'visible' }}>
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
              value={localInput !== null ? localInput : (preview.length / 30.48).toFixed(2)}
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
                  dispatch(toggleWallDrawing(false));
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
    );
  }

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
        dispatch(toggleWallDrawing(false));
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

            {previewWallLayer}

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
