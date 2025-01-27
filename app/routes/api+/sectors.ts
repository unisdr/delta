import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const sectorId = url.searchParams.get("sectorId");

  try {
    if (!sectorId) {
      // Fetch all top-level sectors where parentId is null
      const sectors = await dr
        .select({
          id: sectorTable.id,
          name: sectorTable.sectorname,
          description: sectorTable.description,
        })
        .from(sectorTable)
        .where(sql`${sectorTable.parentId} IS NULL`) // Use SQL null check
        .execute();

      return json(sectors);
    }

    // Fetch subsectors for the given sectorId
    const subsectors = await dr
      .select({
        id: sectorTable.id,
        name: sectorTable.subsector,
        description: sectorTable.description,
      })
      .from(sectorTable)
      .where(sql`${sectorTable.parentId} = ${parseInt(sectorId)}`) // Use SQL equality check
      .execute();

    return json(subsectors);
  } catch (error) {
    console.error("Error fetching sectors or subsectors:", error);
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
