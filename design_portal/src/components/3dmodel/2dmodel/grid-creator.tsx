import { GridStreakProps } from './interface';

export default function GridStreak({ loopLimit, grid, renderLine }: GridStreakProps) {
  const step = grid.properties.step;
  const colors = grid.properties.colors ?? ['#cccccc'];
  const rendered = [];
  let i = 0;

  /**
    Renders a set of grid lines based on a loop limit and step value.
    This component generates grid lines by iterating from position 0 up to `loopLimit`,
    incrementing by the grid's `step` value. For each position, it selects a color
    from the grid's color list.
   */
  for (let pos = 0; pos <= loopLimit; pos += step) {
    const colorValue = colors[i % colors.length] ?? '#cccccc';
    i++;
    rendered.push(renderLine(pos, colorValue));
  }

  return <g>{rendered}</g>;
}
