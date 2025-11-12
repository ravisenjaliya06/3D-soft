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
