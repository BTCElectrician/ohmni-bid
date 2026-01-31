import type { RoomDraftCounts } from './types';

export type RoomTemplate = {
  name: string;
  counts: RoomDraftCounts;
  notes?: string;
};

export type StarterTemplate = {
  jobType: 'residential' | 'commercial';
  label: string;
  serviceSize?: string;
  rooms: RoomTemplate[];
};

const emptyCounts = (): RoomDraftCounts => ({
  outlets: 0,
  switches: 0,
  cans: 0,
  lights: 0,
  smokes: 0
});

export const buildResidentialTemplate = (options: {
  floors: number;
  includeBasement: boolean;
  bedrooms: number;
  bathrooms: number;
  kitchen: boolean;
  living: number;
  dining: number;
  serviceSize?: string;
}): StarterTemplate => {
  const rooms: RoomTemplate[] = [];

  if (options.includeBasement) {
    rooms.push({
      name: 'Basement',
      counts: {
        outlets: 6,
        switches: 2,
        cans: 4,
        lights: 2,
        smokes: 1
      }
    });
  }

  for (let i = 0; i < options.floors; i += 1) {
    rooms.push({
      name: options.floors > 1 ? `Floor ${i + 1}` : 'Main Level',
      counts: emptyCounts()
    });
  }

  if (options.kitchen) {
    rooms.push({
      name: 'Kitchen',
      counts: { outlets: 8, switches: 2, cans: 6, lights: 2, smokes: 1 }
    });
  }

  for (let i = 0; i < options.living; i += 1) {
    rooms.push({
      name: options.living > 1 ? `Living Room ${i + 1}` : 'Living Room',
      counts: { outlets: 6, switches: 2, cans: 6, lights: 2, smokes: 1 }
    });
  }

  for (let i = 0; i < options.dining; i += 1) {
    rooms.push({
      name: options.dining > 1 ? `Dining Room ${i + 1}` : 'Dining Room',
      counts: { outlets: 4, switches: 1, cans: 2, lights: 1, smokes: 0 }
    });
  }

  for (let i = 0; i < options.bedrooms; i += 1) {
    rooms.push({
      name: `Bedroom ${i + 1}`,
      counts: { outlets: 5, switches: 1, cans: 2, lights: 1, smokes: 1 }
    });
  }

  for (let i = 0; i < options.bathrooms; i += 1) {
    rooms.push({
      name: `Bathroom ${i + 1}`,
      counts: { outlets: 1, switches: 1, cans: 1, lights: 1, smokes: 0 }
    });
  }

  return {
    jobType: 'residential',
    label: 'Residential starter kit',
    serviceSize: options.serviceSize,
    rooms
  };
};

export const buildCommercialTemplate = (options: {
  storefronts: number;
  offices: number;
  restrooms: number;
  openAreas: number;
  serviceSize?: string;
}): StarterTemplate => {
  const rooms: RoomTemplate[] = [];

  for (let i = 0; i < options.openAreas; i += 1) {
    rooms.push({
      name: options.openAreas > 1 ? `Sales Floor ${i + 1}` : 'Sales Floor',
      counts: { outlets: 10, switches: 3, cans: 12, lights: 4, smokes: 1 }
    });
  }

  for (let i = 0; i < options.storefronts; i += 1) {
    rooms.push({
      name: options.storefronts > 1 ? `Storefront ${i + 1}` : 'Storefront',
      counts: { outlets: 6, switches: 2, cans: 8, lights: 2, smokes: 1 }
    });
  }

  for (let i = 0; i < options.offices; i += 1) {
    rooms.push({
      name: `Office ${i + 1}`,
      counts: { outlets: 6, switches: 1, cans: 4, lights: 1, smokes: 1 }
    });
  }

  for (let i = 0; i < options.restrooms; i += 1) {
    rooms.push({
      name: `Restroom ${i + 1}`,
      counts: { outlets: 1, switches: 1, cans: 1, lights: 1, smokes: 0 }
    });
  }

  rooms.push({
    name: 'Back of House',
    counts: { outlets: 4, switches: 1, cans: 2, lights: 2, smokes: 1 }
  });

  rooms.push({
    name: 'Service / Panel',
    counts: { outlets: 1, switches: 1, cans: 0, lights: 1, smokes: 0 }
  });

  return {
    jobType: 'commercial',
    label: 'Commercial starter kit',
    serviceSize: options.serviceSize,
    rooms
  };
};
