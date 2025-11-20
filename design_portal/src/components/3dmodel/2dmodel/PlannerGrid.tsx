import { useEffect, useRef, useState } from 'react';
import { ReactSVGPanZoom, Tool, TOOL_AUTO, Value } from 'react-svg-pan-zoom';
import { GRID_SIZE, REACTSVGPANZOOM_INITIAL_VALUE } from './constants';
import { Grids } from './grid';

export default function PlannerGrid() {
  const Viewer = useRef<ReactSVGPanZoom | null>(null);

  const [value, setValue] = useState<Value>(REACTSVGPANZOOM_INITIAL_VALUE);
  const [tool, setTool] = useState<Tool>(TOOL_AUTO);

  // zoom and move automatically so the entire SVG grid fits inside the screen.
  useEffect(() => {
    if (Viewer.current) {
      Viewer.current.fitToViewer();
    }
  }, []);

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
        </svg>
      </ReactSVGPanZoom>
    </div>
  );
}
