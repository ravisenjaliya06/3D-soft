export const UNIT_OPTIONS = ['mm', 'cm', 'm', 'inch', 'feet'] as const;

export type Unit = (typeof UNIT_OPTIONS)[number];

export const CONVERSION_FACTORS: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
  feet: 304.8,
};

export const convertToMM = (value: number, unit: Unit): number =>
  value * CONVERSION_FACTORS[unit];
export const convertFromMM = (value: number, unit: Unit): number =>
  value / CONVERSION_FACTORS[unit];

export const mmToMeters = (valueMm: number | undefined | null): number =>
  ((valueMm ?? 0) as number) / 1000;

export const metersToMM = (valueM: number): number => valueM * 1000;

export const convertUnit = (
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
): number => {
  const mmValue = convertToMM(value, fromUnit);
  return convertFromMM(mmValue, toUnit);
};
