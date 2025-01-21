import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { disasterEventTable, sectorTable, sectorEventRelationTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

export const loader: LoaderFunction = async () => {
  try {
    // Fetch aggregated impact data by sector
    const [damage, loss, recovery] = await Promise.all([
      dr.execute(
        sql`SELECT ${sectorTable.name} AS category, SUM(${disasterEventTable.subtotaldamageUsd}) AS value, '#8884d8' AS color
            FROM ${disasterEventTable}
            JOIN ${sectorEventRelationTable} ON ${disasterEventTable.id} = ${sectorEventRelationTable.disasterEventId}
            JOIN ${sectorTable} ON ${sectorEventRelationTable.sectorId} = ${sectorTable.id}
            GROUP BY ${sectorTable.name}`
      ),
      dr.execute(
        sql`SELECT ${sectorTable.name} AS category, SUM(${disasterEventTable.subtotalLossesUsd}) AS value, '#8dd1e1' AS color
            FROM ${disasterEventTable}
            JOIN ${sectorEventRelationTable} ON ${disasterEventTable.id} = ${sectorEventRelationTable.disasterEventId}
            JOIN ${sectorTable} ON ${sectorEventRelationTable.sectorId} = ${sectorTable.id}
            GROUP BY ${sectorTable.name}`
      ),
      dr.execute(
        sql`SELECT ${sectorTable.name} AS category, SUM(${disasterEventTable.recoveryNeedsTotalUsd}) AS value, '#a4de6c' AS color
            FROM ${disasterEventTable}
            JOIN ${sectorEventRelationTable} ON ${disasterEventTable.id} = ${sectorEventRelationTable.disasterEventId}
            JOIN ${sectorTable} ON ${sectorEventRelationTable.sectorId} = ${sectorTable.id}
            GROUP BY ${sectorTable.name}`
      ),
    ]);

    return json({
      damage: damage.rows,
      loss: loss.rows,
      recovery: recovery.rows,
    });
  } catch (error) {
    console.error("Error fetching impact data:", error);
    throw new Response("Failed to fetch impact data", { status: 500 });
  }
};
