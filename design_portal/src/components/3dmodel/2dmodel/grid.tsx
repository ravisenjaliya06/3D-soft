import { GridRecordFactory } from './constants';
import GridStreak from './grid-creator';
import { GridData, GridRecord, GridsProps } from './interface';

export class Grid extends GridRecordFactory implements GridRecord {
  constructor(json: Partial<GridData>) {
    super({
      ...json,
      properties: json.properties || { step: 20 },
    });
  }
}

function createGrid(id: string, type:string): GridRecord {
  return new Grid({
    id,
    type,
    properties: {
      step: 20,
      colors: ['#808080', '#ddd', '#ddd', '#ddd', '#ddd'],
    },
  });
}

const grids: Map<string, GridRecord> = new Map([
  ['h1', createGrid('h1', 'horizontal-streak')],
  ['v1', createGrid('v1', 'vertical-streak')],
]);

export const Grids: React.FC<GridsProps> = ({ width, height }) => {
  return (
    <g>
      {Array.from(grids.entries()).map(([gridID, grid]) => {
        const isHorizontal = grid.type === 'horizontal-streak';
        const loopLimit = isHorizontal ? height : width;
        return (
          <GridStreak
            key={gridID}
            grid={grid}
            loopLimit={loopLimit}
            renderLine={(position, color) => (
              <line
                key={position}
                x1={isHorizontal ? 0 : position}
                y1={isHorizontal ? position : 0}
                x2={isHorizontal ? width : position}
                y2={isHorizontal ? position : height}
                strokeWidth={1}
                stroke={color}
              />
            )}
          />
        );
      })}
    </g>
  );
};
