import type { UnitType } from './types';

export const normalizeUnitType = (value?: string | null): UnitType => {
  if (!value) return 'E';
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'e':
    case 'ea':
    case 'each':
      return 'E';
    case 'c':
    case 'per 100':
    case 'hundred':
      return 'C';
    case 'm':
    case 'per 1000':
    case 'thousand':
      return 'M';
    case 'lot':
      return 'Lot';
    default:
      return 'E';
  }
};
