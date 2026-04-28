// Utilities for normalizing values while constructing rendering scene payloads.
export const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toText = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
};

export const toMm = (value: number, unitType: 'mm' | 'cm' | 'in'): number => {
  if (unitType === 'cm') return value * 10;
  if (unitType === 'in') return value * 25.4;
  return value;
};
