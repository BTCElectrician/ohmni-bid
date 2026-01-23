import type { LineItemTemplate, ProjectInfo } from './types';

export const EMPTY_LINE_ITEM_TEMPLATE: LineItemTemplate = {
  category: 'GENERAL_CONDITIONS',
  name: 'New item',
  materialUnitCost: 0,
  unitType: 'E',
  laborHoursPerUnit: 0
};

export const EMPTY_PROJECT: ProjectInfo = {
  projectName: 'Untitled Estimate'
};
