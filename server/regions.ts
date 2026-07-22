export const REGIONS = [
  { id: "arctic", name: "Arktyka" },
  { id: "europe", name: "Europa" },
  { id: "asia", name: "Azja" },
  { id: "africa", name: "Afryka" },
  { id: "north-america", name: "Ameryka Północna" },
  { id: "south-america", name: "Ameryka Południowa" },
  { id: "australia", name: "Australia" },
  { id: "antarctica", name: "Antarktyda" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export function isRegionId(value: unknown): value is RegionId {
  return REGIONS.some((region) => region.id === value);
}
