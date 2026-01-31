import type { StarterTemplate } from './templates';

const STORAGE_KEY = 'ohmni_walkthrough_template_v1';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const queueWalkthroughTemplate = (template: StarterTemplate) => {
  const storage = getStorage();
  if (!storage) return false;
  storage.setItem(STORAGE_KEY, JSON.stringify(template));
  return true;
};

export const consumeWalkthroughTemplate = (): StarterTemplate | null => {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  storage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as StarterTemplate;
  } catch {
    return null;
  }
};
