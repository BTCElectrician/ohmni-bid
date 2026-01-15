import type { EstimateCategory, EstimateParameters } from './types';

export const DEFAULT_PARAMETERS: EstimateParameters = {
  laborRate: 118.0,
  materialTaxRate: 0.1025,
  overheadProfitRate: 0
};

export const CATEGORY_ORDER: EstimateCategory[] = [
  'TEMP_POWER',
  'ELECTRICAL_SERVICE',
  'MECHANICAL_CONNECTIONS',
  'INTERIOR_LIGHTING',
  'EXTERIOR_LIGHTING',
  'POWER_RECEPTACLES',
  'SITE_CONDUITS',
  'SECURITY',
  'FIRE_ALARM',
  'GENERAL_CONDITIONS'
];
