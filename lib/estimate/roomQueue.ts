import type { EstimateCategory, UnitType } from './types';

export interface RoomQueuedItem {
  name: string;
  category: EstimateCategory;
  quantity: number;
  unitType: UnitType;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  pricingItemId?: string | null;
}

const STORAGE_KEY = 'ohmni_room_queue_v1';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readQueue = (storage: Storage): RoomQueuedItem[] => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoomQueuedItem[]) : [];
  } catch {
    return [];
  }
};

export const queueRoomItems = (items: RoomQueuedItem[]): number => {
  const storage = getStorage();
  if (!storage) return 0;
  const existing = readQueue(storage);
  const next = [...existing, ...items];
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return items.length;
};

export const consumeRoomQueue = (): RoomQueuedItem[] => {
  const storage = getStorage();
  if (!storage) return [];
  const items = readQueue(storage);
  storage.removeItem(STORAGE_KEY);
  return items;
};
