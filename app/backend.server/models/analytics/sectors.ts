import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

export interface Sector {
  id: number;
  parentId: number | null;
  sectorname: string;
  subsector: string;
  description: string | null;
}

export const fetchAllSectors = async (): Promise<Sector[]> => {
  return await dr
    .select()
    .from(sectorTable)
    .orderBy(sectorTable.parentId, sectorTable.sectorname);
};
