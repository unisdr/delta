import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

export const loader: LoaderFunction = async () => {
  try {
    // Fetch aggregated impact data by sector
    const [damage, loss, recovery] = await Promise.all([
      dr.execute(
        sql`SELECT sector_name AS category, SUM(damage_percentage) AS value, '#8884d8' AS color
            FROM ${disasterEventTable}
            GROUP BY sector_name`
      ),
      dr.execute(
        sql`SELECT sector_name AS category, SUM(loss_percentage) AS value, '#8dd1e1' AS color
            FROM ${disasterEventTable}
            GROUP BY sector_name`
      ),
      dr.execute(
        sql`SELECT sector_name AS category, SUM(recovery_percentage) AS value, '#a4de6c' AS color
            FROM ${disasterEventTable}
            GROUP BY sector_name`
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
