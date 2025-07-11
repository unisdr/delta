import { dr } from "~/db.server";
import { hipHazardTable, hipClusterTable, hipTypeTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "hazard-types"; // Default to "hazard-types"
  const query = url.searchParams.get("query") || ""; // Search query

  try {
    let data;

    switch (type) {
      case "hazard-types":
        // Fetch hazard types
        data = await dr
          .select({
            id: hipHazardTable.id,
            name: hipHazardTable.nameEn,
          })
          .from(hipHazardTable)
          .where(sql`${hipHazardTable.nameEn} ILIKE ${`%${query}%`}`)
          .execute();
        break;

      case "hazard-clusters":
        // Fetch hazard clusters
        data = await dr
          .select({
            id: hipClusterTable.id,
            name: hipClusterTable.nameEn,
          })
          .from(hipClusterTable)
          .where(sql`${hipClusterTable.nameEn} ILIKE ${`%${query}%`}`)
          .execute();
        break;

      case "specific-hazards":
        // Fetch specific hazards
        data = await dr
          .select({
            id: hipHazardTable.id,
            name: hipHazardTable.descriptionEn,
          })
          .from(hipHazardTable)
          .where(sql`${hipHazardTable.descriptionEn} ILIKE ${`%${query}%`}`)
          .execute();
        break;

      case "hazard-classes":
        // Fetch hazard classes
        data = await dr
          .select({
            id: hipTypeTable.id,
            name: hipTypeTable.nameEn,
          })
          .from(hipTypeTable)
          .where(sql`${hipTypeTable.nameEn} ILIKE ${`%${query}%`}`)
          .execute();
        break;

      default:
        // Handle unsupported type
        return Response.json(
          { error: `Invalid type parameter: ${type}. Supported types are hazard-types, hazard-clusters, specific-hazards, and hazard-classes.` },
          { status: 400 }
        );
    }

    // Return the fetched data
    return (data);

  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
