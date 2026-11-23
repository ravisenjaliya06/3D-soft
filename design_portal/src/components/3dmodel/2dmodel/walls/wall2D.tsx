import { useDispatch } from 'react-redux';
import { MeshObjectData } from '../../sceneCreator/interface';
import { getWallFootprintQuad } from '../../sceneCreator/utils';
import { setobjectSelected } from '../../store/dataSlice';

export function Wall2D({ wall }: { wall: MeshObjectData }) {
  const dispatch = useDispatch();
  const [a, b, c, d] = getWallFootprintQuad(wall);
  const points = `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        dispatch(setobjectSelected(wall.id));
      }}
      style={{ cursor: 'pointer' }}
    >
      <polygon
        points={points}
        fill="#ddd"
        stroke={wall.selected ? '#0066ff' : '#333'}
        strokeWidth={2}
      />
    </g>
  );
}
