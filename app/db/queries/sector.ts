import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

export async function getSectorByLevel(level: number) {
  return await dr
    .select()
    .from(sectorTable)
    .where(eq(sectorTable.level, level))
    .orderBy(sectorTable.sectorname)
    
}