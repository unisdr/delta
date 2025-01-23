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
  subsectors?: Sector[]; // Optional property to hold nested subsectors
}

export const loader: LoaderFunction = async () => {
  try {
    // Fetch all sectors
    const sectors = await dr
      .select()
      .from(sectorTable)
      .orderBy(sectorTable.parentId, sectorTable.sectorname);

    // Group sectors by their parentId
    const sectorMap = new Map<number | null, Sector[]>();
    sectors.forEach((sector) => {
      const parentId = sector.parentId;
      if (!sectorMap.has(parentId)) {
        sectorMap.set(parentId, []);
      }
      sectorMap.get(parentId)!.push(sector);
    });

    // Nest child sectors under their parent sectors
    const topLevelSectors: Sector[] = (sectorMap.get(null) || []).map(
      (sector) => ({
        ...sector,
        subsectors: sectorMap.get(sector.id) || [], // Attach subsectors
      })
    );

    return json({ sectors: topLevelSectors });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    throw new Response("Failed to fetch sectors", { status: 500 });
  }
};
