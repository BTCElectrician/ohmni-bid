import type { EstimateCategory, UnitType } from './types';

export interface CatalogQueuedItem {
  id: string;
  category: EstimateCategory;
  name: string;
  unitType: UnitType;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  pricingItemId?: string | null;
  quantity?: number;
}

const STORAGE_KEY = 'ohmni_catalog_queue_v1';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readQueue = (storage: Storage): CatalogQueuedItem[] => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CatalogQueuedItem[]) : [];
  } catch {
    return [];
  }
};

export const queueCatalogItem = (item: CatalogQueuedItem): number => {
  const storage = getStorage();
  if (!storage) return 0;
  const items = readQueue(storage);
  items.push(item);
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items.length;
};

export const consumeCatalogQueue = (): CatalogQueuedItem[] => {
  const storage = getStorage();
  if (!storage) return [];
  const items = readQueue(storage);
  storage.removeItem(STORAGE_KEY);
  return items;
};
