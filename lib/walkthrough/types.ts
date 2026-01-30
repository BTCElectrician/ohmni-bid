export type RoomDraftCounts = {
  outlets: number;
  switches: number;
  cans: number;
  lights: number;
  smokes: number;
};

export type RoomDraftUpdate = {
  notes: string;
  dimensions: { length: number; width: number; sqft: number } | null;
  counts: RoomDraftCounts;
};
