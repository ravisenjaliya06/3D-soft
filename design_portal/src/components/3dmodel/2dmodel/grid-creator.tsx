import { GridStreakProps } from './interface';

export default function GridStreak({ loopLimit, grid, renderLine }: GridStreakProps) {
  const step = grid.properties.step;
  const colors = grid.properties.colors ?? ['#cccccc'];
  const rendered = [];
  let i = 0;

  // shift grid origin to (0,0)
  const half = loopLimit / 2;

  for (let pos = -half; pos <= half; pos += step) {
    const colorValue = colors[i % colors.length] ?? '#cccccc';
    i++;
    rendered.push(renderLine(pos, colorValue));
  }

  return <g>{rendered}</g>;
}
