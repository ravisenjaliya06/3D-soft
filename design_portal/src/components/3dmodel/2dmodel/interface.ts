import { RecordOf } from 'immutable';

export interface Dimansions {
  width: number;
  height: number;
}

export interface GridsProps {
  width: number;
  height: number;
}

export interface GridProperties {
  step: number;
  color?: string;
  colors?: string[];
}

export interface GridData {
  id: string;
  type: string;
  properties: GridProperties;
}

export interface GridStreakProps extends GridComponentProps {
  loopLimit: number;
  renderLine: (pos: number, color: string) => JSX.Element;
}

export type GridRecord = RecordOf<GridData>;

export interface GridComponentProps {
  grid: GridRecord;
  key: string;
}
