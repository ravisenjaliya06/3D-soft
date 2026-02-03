import { assets } from '@/svgPaths';
import { getActiveUnit, metersToUnit } from '../handler/unitConversion';
import { DistanceInputProps } from './interface';

export const DistanceInput: React.FC<DistanceInputProps> = ({
  label,
  direction,
  rotate,
  width,
  value,
  disabled,
  onChange,
}) => {
  return (
    <div className="flex flex-col items-start gap-[0.1rem]">
      <p className="mt-0 mb-0 text-[0.5rem] font-[700] text-[var(--primary-color)]">{label}</p>

      <div
        className={`flex h-[1.19rem] ${width} items-center rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] px-[0.2rem]`}
      >
        <img src={assets.directionIcon} className={`h-[0.5rem] w-[0.5rem] ${rotate}`} />

        <img src={assets.vrLine} className="ml-[0.3rem] h-[1rem] w-[0.5rem]" />

        <input
          type="number"
          value={value !== null ? metersToUnit(value, getActiveUnit()).toFixed(0) : ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
              onChange(direction, val);
            }
          }}
          disabled={disabled || value === null}
          className="h-full flex-1 border-0 bg-transparent text-[0.58rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
};
