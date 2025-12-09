import { Wall } from '../interface';

export function Wall2D({ wall }: { wall: Wall }) {
  const x1 = wall.startPoint.x;
  const y1 = wall.startPoint.y;
  const x2 = wall.endPoint.x;
  const y2 = wall.endPoint.y;

  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const thickness = wall.thickness ?? 30;

  return (
    <g transform={`translate(${x1}, ${y1}) rotate(${angle})`}>
      <rect
        x={0}
        y={-thickness / 2}
        width={length}
        height={thickness}
        fill="#ddd"
        stroke={wall.selected ? '#0066ff' : '#333'}
        strokeWidth={2}
      />
    </g>
  );
}
