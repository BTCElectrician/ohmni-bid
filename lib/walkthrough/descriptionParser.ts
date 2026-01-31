type ParsedJob = {
  jobType?: 'residential' | 'commercial';
  floors?: number;
  includeBasement?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  kitchen?: boolean;
  living?: number;
  dining?: number;
  storefronts?: number;
  offices?: number;
  restrooms?: number;
  openAreas?: number;
  serviceSize?: string;
};

const toNumber = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const findNumber = (text: string, pattern: RegExp) => {
  const match = text.match(pattern);
  return toNumber(match?.[1]);
};

export const parseJobDescription = (input: string): ParsedJob => {
  const text = input.toLowerCase();
  const parsed: ParsedJob = {};

  if (text.includes('residential') || text.includes('house')) {
    parsed.jobType = 'residential';
  }

  if (text.includes('commercial') || text.includes('storefront') || text.includes('office')) {
    parsed.jobType = 'commercial';
  }

  const floors = findNumber(text, /(\d+)\s*(?:floors?|levels?)/);
  if (floors) parsed.floors = floors;

  const bedrooms = findNumber(text, /(\d+)\s*(?:bed|bedroom)s?/);
  if (bedrooms !== undefined) parsed.bedrooms = bedrooms;

  const bathrooms = findNumber(text, /(\d+)\s*(?:bath|bathroom)s?/);
  if (bathrooms !== undefined) parsed.bathrooms = bathrooms;

  const living = findNumber(text, /(\d+)\s*(?:living|family)\s*rooms?/);
  if (living !== undefined) parsed.living = living;

  const dining = findNumber(text, /(\d+)\s*dining\s*rooms?/);
  if (dining !== undefined) parsed.dining = dining;

  if (text.includes('basement')) parsed.includeBasement = true;
  if (text.includes('no basement')) parsed.includeBasement = false;

  if (text.includes('kitchen')) parsed.kitchen = true;

  const storefronts = findNumber(text, /(\d+)\s*storefronts?/);
  if (storefronts !== undefined) parsed.storefronts = storefronts;

  const offices = findNumber(text, /(\d+)\s*offices?/);
  if (offices !== undefined) parsed.offices = offices;

  const restrooms = findNumber(text, /(\d+)\s*restrooms?/);
  if (restrooms !== undefined) parsed.restrooms = restrooms;

  const openAreas = findNumber(text, /(\d+)\s*(?:open|sales)\s*areas?/);
  if (openAreas !== undefined) parsed.openAreas = openAreas;

  const service = text.match(/(\d{2,4}\s*a)\s*service/);
  if (service?.[1]) parsed.serviceSize = service[1].toUpperCase() + ' service';

  return parsed;
};
