import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Fetch disaster summary data based on filters.
 * Filters: disasterEventId, dateRange
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);

  // Extract query parameters
  const disasterEventId = url.searchParams.get("disasterEventId");
  const dateRange = url.searchParams.get("dateRange");

  try {
    // Build filters dynamically
    const filters: any[] = [];
    if (disasterEventId) {
      filters.push(sql`${disasterEventTable.id} = ${disasterEventId}`);
    }
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",");
      filters.push(sql`${disasterEventTable.startDateUTC} BETWEEN ${startDate} AND ${endDate}`);
    }

    // Base query (with optional WHERE clause)
    const whereClause = filters.length > 0 ? sql`WHERE ${sql.join(filters, " AND ")}` : sql``;

    // Fetch data in parallel
    const [events, damage, losses, recovery, eventsOverTime, damageOverTime, lossesOverTime, recoveryOverTime] = await Promise.all([
      dr.execute(
        sql`SELECT COUNT(*) AS count FROM ${disasterEventTable} ${whereClause}`
      ),
      dr.execute(
        sql`SELECT SUM(effects_total_usd) AS damage FROM ${disasterEventTable} ${whereClause}`
      ),
      dr.execute(
        sql`SELECT SUM(subtotal_losses_usd) AS losses FROM ${disasterEventTable} ${whereClause}`
      ),
      dr.execute(
        sql`SELECT SUM(recovery_needs_total) AS recovery FROM ${disasterEventTable} ${whereClause}`
      ),
      dr.execute(
        sql`SELECT EXTRACT(YEAR FROM start_date_utc) AS year, COUNT(*) AS count
             FROM ${disasterEventTable}
             ${whereClause}
             GROUP BY year
             ORDER BY year`
      ),
      dr.execute(
        sql`SELECT EXTRACT(YEAR FROM start_date_utc) AS year, SUM(effects_total_usd) AS value
             FROM ${disasterEventTable}
             ${whereClause}
             GROUP BY year
             ORDER BY year`
      ),
      dr.execute(
        sql`SELECT EXTRACT(YEAR FROM start_date_utc) AS year, SUM(subtotal_losses_usd) AS value
             FROM ${disasterEventTable}
             ${whereClause}
             GROUP BY year
             ORDER BY year`
      ),
      dr.execute(
        sql`SELECT EXTRACT(YEAR FROM start_date_utc) AS year, SUM(recovery_needs_total) AS value
             FROM ${disasterEventTable}
             ${whereClause}
             GROUP BY year
             ORDER BY year`
      ),
    ]);

    // Construct response
    return json({
      events: events.rows[0]?.count || 0,
      damage: damage.rows[0]?.damage || 0,
      losses: losses.rows[0]?.losses || 0,
      recovery: recovery.rows[0]?.recovery || 0,
      eventsOverTime: eventsOverTime.rows,
      damageOverTime: damageOverTime.rows,
      lossesOverTime: lossesOverTime.rows,
      recoveryOverTime: recoveryOverTime.rows,
    });
  } catch (error) {
    console.error("Error fetching disaster summary data:", error);
    throw new Response("Failed to fetch disaster summary data", { status: 500 });
  }
};
