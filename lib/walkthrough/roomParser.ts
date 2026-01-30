import type { RoomDraftCounts, RoomDraftUpdate } from './types';

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
};

const DEVICE_PATTERNS: Array<{ key: keyof RoomDraftCounts; pattern: RegExp }> = [
  { key: 'outlets', pattern: /(outlet|receptacle)s?/i },
  { key: 'switches', pattern: /switch(?:es)?/i },
  { key: 'cans', pattern: /can(?:s)?|recessed(?: light)?s?/i },
  { key: 'lights', pattern: /light(?:s)?|fixture(?:s)?/i },
  { key: 'smokes', pattern: /smoke(?: detector)?s?/i }
];

const numberFromToken = (token: string) => {
  const normalized = token.toLowerCase();
  if (normalized in NUMBER_WORDS) return NUMBER_WORDS[normalized];
  const parsed = Number(token);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDimensions = (text: string) => {
  const match =
    text.match(/(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)/i) || null;
  if (!match) return null;
  const length = Number(match[1]);
  const width = Number(match[2]);
  if (!Number.isFinite(length) || !Number.isFinite(width)) return null;
  return { length, width, sqft: Number((length * width).toFixed(2)) };
};

const parseCounts = (text: string): RoomDraftCounts => {
  const counts: RoomDraftCounts = {
    outlets: 0,
    switches: 0,
    cans: 0,
    lights: 0,
    smokes: 0
  };

  for (const { key, pattern } of DEVICE_PATTERNS) {
    const regex = new RegExp(
      `(?:\\b(\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\b\\s+${pattern.source})`,
      'gi'
    );
    let match;
    while ((match = regex.exec(text))) {
      const value = numberFromToken(match[1]);
      if (value !== null) counts[key] += value;
    }
  }

  return counts;
};

export const parseRoomDraft = (text: string): RoomDraftUpdate => {
  const dimensions = parseDimensions(text);
  const counts = parseCounts(text);

  return {
    notes: text.trim(),
    dimensions,
    counts
  };
};
