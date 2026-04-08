import { useDispatch } from 'react-redux';
import { MeshObjectData } from '../../sceneCreator/interface';
import { getWall2DPoints } from '../../sceneCreator/utils';
import { setobjectSelected } from '../../store/dataSlice';

export function Wall2D({ wall }: { wall: MeshObjectData }) {
  const dispatch = useDispatch();
  //convert 3d position to 2d
  const { startPoint, endPoint } = getWall2DPoints(wall);

  const x1 = startPoint.x;
  const y1 = startPoint.y;
  const x2 = endPoint.x;
  const y2 = endPoint.y;

  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const thickness = wall.thickness ?? 30;

  return (
    <g
      transform={`translate(${x1}, ${y1}) rotate(${angle})`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch(setobjectSelected(wall.id));
      }}
      style={{ cursor: 'pointer' }}
    >
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
