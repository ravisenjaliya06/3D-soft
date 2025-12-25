import { store } from '../store';

/** Supported unit types for measurement conversion. */
export const UNIT_OPTIONS = ['mm', 'cm', 'm', 'inch', 'feet'] as const;

/** Type representing valid measurement units. */
export type Unit = (typeof UNIT_OPTIONS)[number];

/** Conversion factors to millimeters for each supported unit. */
export const CONVERSION_FACTORS: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
  feet: 304.8,
};

/** Converts a numeric value from the given unit to millimeters. */
export const convertToMM = (value: number, unit: Unit): number => value * CONVERSION_FACTORS[unit];

/** Converts a numeric value from millimeters to the specified unit. */
export const convertFromMM = (value: number, unit: Unit): number =>
  value / CONVERSION_FACTORS[unit];

/** Converts a value in millimeters to meters. */
export const mmToMeters = (valueMm: number | undefined | null): number =>
  ((valueMm ?? 0) as number) / 1000;

/** Converts a value in meters to millimeters. */
export const metersToMM = (valueM: number): number => valueM * 1000;

/** Converts a numeric value from one unit to another. */
export const convertUnit = (value: number, fromUnit: Unit, toUnit: Unit): number => {
  const mmValue = convertToMM(value, fromUnit);
  return convertFromMM(mmValue, toUnit);
};

// Unit conversion helpers now it is work with MM but this will be helpful in future
export const metersToUnit = (m: number, unit: string): number => {
  switch (unit) {
    case 'mm':
      return m * 1000;
    case 'cm':
      return m * 100;
    case 'm':
      return m;
    case 'in':
      return m * 39.37007874015748;
    case 'ft':
      return m * 3.280839895013123;
    default:
      return m * 1000;
  }
};

export const unitToMeters = (v: number, unit: string): number => {
  switch (unit) {
    case 'mm':
      return v / 1000;
    case 'cm':
      return v / 100;
    case 'm':
      return v;
    case 'in':
      return v / 39.37007874015748;
    case 'ft':
      return v / 3.280839895013123;
    default:
      return v / 1000;
  }
};

export const getActiveUnit = (): string => {
  try {
    const unit = store.getState()?.measurement?.unitType as string | undefined;
    return unit || 'mm';
  } catch {
    return 'mm';
  }
};

export const unitSuffix = (unit: string): string => {
  return unit;
};
