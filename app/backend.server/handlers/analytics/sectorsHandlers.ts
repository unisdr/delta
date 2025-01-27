// app/backend.server/handlers/analytics/sectorsHandlers.ts
import {
  fetchAllSectors,
  Sector,
} from "~/backend.server/models/analytics/sectors";

export interface SectorWithSubsectors extends Sector {
  subsectors?: Sector[];
}

export const getSectorsWithSubsectors = async (): Promise<
  SectorWithSubsectors[]
> => {
  const sectors = await fetchAllSectors();

  // Organize sectors into a hierarchical structure
  const sectorMap = new Map<number | null, Sector[]>();
  sectors.forEach((sector) => {
    const parentId = sector.parentId;
    if (!sectorMap.has(parentId)) {
      sectorMap.set(parentId, []);
    }
    sectorMap.get(parentId)!.push(sector);
  });

  // Map top-level sectors with their subsectors
  return (sectorMap.get(null) || []).map((sector) => ({
    ...sector,
    subsectors: sectorMap.get(sector.id) || [],
  }));
};
