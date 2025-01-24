// app/routes/api+/analytics+/sectors.ts
import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

interface Sector {
  id: number;
  parentId: number | null;
  sectorname: string;
  subsector: string;
  description: string | null;
  subsectors?: Sector[];
}

export const loader: LoaderFunction = async () => {
  try {
    const sectors = await dr
      .select()
      .from(sectorTable)
      .orderBy(sectorTable.parentId, sectorTable.sectorname);

    const sectorMap = new Map<number | null, Sector[]>();
    sectors.forEach((sector) => {
      const parentId = sector.parentId;
      if (!sectorMap.has(parentId)) {
        sectorMap.set(parentId, []);
      }
      sectorMap.get(parentId)!.push(sector);
    });

    const topLevelSectors: Sector[] = (sectorMap.get(null) || []).map((sector) => ({
      ...sector,
      subsectors: sectorMap.get(sector.id) || [],
    }));

    return json({ sectors: topLevelSectors });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return new Response("Failed to fetch sectors", { status: 500 });
  }
};
