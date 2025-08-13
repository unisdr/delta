import { asc, eq, isNull } from 'drizzle-orm';
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

export interface Sector {
  id: string;
  parentId: string | null;
  sectorname: string;
  description: string | null;
  updatedAt: Date | null;
  createdAt: Date;
}

export type SectorType = Omit<Sector, 'id'> & {
  id?: string;
};

export const fetchAllSectors = async (): Promise<Sector[]> => {
  return await dr
    .select()
    .from(sectorTable)
    .orderBy(asc(sectorTable.sectorname));
};

export const getSectorsByParentId = async (parentId: string | null): Promise<Sector[]> => {
  const select = {
    id: sectorTable.id,
    sectorname: sectorTable.sectorname,
    parentId: sectorTable.parentId,
    description: sectorTable.description,
    updatedAt: sectorTable.updatedAt,
    createdAt: sectorTable.createdAt,
  };

  if (parentId) {
    return await dr
      .select(select)
      .from(sectorTable)
      .where(eq(sectorTable.parentId, parentId))
      .orderBy(asc(sectorTable.sectorname));
  } else {
    return await dr
      .select(select)
      .from(sectorTable)
      .where(isNull(sectorTable.parentId))
      .orderBy(asc(sectorTable.sectorname));
  }
};

export const getMidLevelSectors = async (): Promise<Sector[]> => {
  // First get the top level sectors (infrastructure, etc)
  const topLevelSectors = await dr
    .select()
    .from(sectorTable)
    .where(isNull(sectorTable.parentId))
    .orderBy(asc(sectorTable.sectorname));

  // Then get their immediate children (energy, agriculture, etc)
  const midLevelSectors = await Promise.all(
    topLevelSectors.map(async (topSector) => {
      return await dr
        .select()
        .from(sectorTable)
        .where(eq(sectorTable.parentId, topSector.id))
        .orderBy(asc(sectorTable.sectorname));
    })
  );

  // Flatten the array of arrays into a single array
  return midLevelSectors.flat();
};

export const getSubsectorsByParentId = async (parentId: string): Promise<Sector[]> => {
  return await dr
    .select()
    .from(sectorTable)
    .where(eq(sectorTable.parentId, parentId))
    .orderBy(asc(sectorTable.sectorname));
};

export const upsertSector = async (record: SectorType): Promise<void> => {
  await dr
    .insert(sectorTable)
    .values({
      id: record.id,
      sectorname: record.sectorname,
      parentId: record.parentId ?? null,
      description: record.description ?? null,
      updatedAt: new Date(),
      createdAt: record.createdAt ?? new Date(),
    })
    .onConflictDoUpdate({
      target: sectorTable.id,
      set: {
        sectorname: record.sectorname,
        parentId: record.parentId ?? null,
        description: record.description ?? null,
        updatedAt: new Date(),
      },
    });
};
