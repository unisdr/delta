import { dr } from "~/db.server"; // Drizzle ORM instance
import { formatDate } from "~/util/date";
import { sql } from "drizzle-orm";
import { hazardEventLabel } from "~/frontend/events/hazardeventform";

async function fetchDisasterEvents(searchQuery: string = "", page: number = 1, limit: number = 10) {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Escape the search query to avoid SQL injection
    const safeSearchPattern = `%${searchQuery.replace(/'/g, "''")}%`;

    // Use Drizzle SQL with proper inline parameters
    const query = sql`
        SELECT 
            de.id AS disaster_event_id,
            de.start_date_utc,
            de.end_date_utc,
            he.id AS hazard_event_id,
            hh.name_en AS hazard_event_name,
            he.id AS hazard_event_id
        FROM disaster_event de
        JOIN hazard_event he ON de.hazard_event_id = he.id
        JOIN hip_hazard hh ON he.hazard_id = hh.id
        WHERE 
            LOWER(de.id::TEXT) LIKE LOWER(${safeSearchPattern})
            OR LOWER(hh.name_en) LIKE LOWER(${safeSearchPattern})
        ORDER BY de.start_date_utc DESC
        LIMIT ${limit}
        OFFSET ${offset};
    `;

    console.log("Executing SQL Query:", query);

    try {
        const result = await dr.execute(query);
        const rows = result.rows ?? [];

        return rows.map((row: any) => ({
            id: row.disaster_event_id,
            hazardEventId: row.hazard_event_id ?? "N/A",
            startDateUTC: row.start_date_utc ? formatDate(new Date(row.start_date_utc)) : "N/A",
            endDateUTC: row.end_date_utc ? formatDate(new Date(row.end_date_utc)) : "N/A",
            hazardEventName: hazardEventLabel({
                id: row.hazard_event_id,
                description: row.hazard_event_description, // Assuming there's a description field
                hazard: { nameEn: row.hazard_event_name }
            }),
        }));
    } catch (error) {
        console.error("Database query failed:", error);
        return [];
    }
}

export const loader = async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    try {
        const results = await fetchDisasterEvents(searchQuery, page, limit);

        // ✅ Fetch total count correctly
        const totalRecordsResult = await dr.execute(sql`
            SELECT
                CASE
                    WHEN (
                        SELECT reltuples::bigint 
                        FROM pg_class 
                        WHERE relname = 'disaster_event'
                    ) < 100000 
                    THEN (SELECT COUNT(*) FROM disaster_event WHERE 
                        LOWER(id::TEXT) LIKE LOWER(${`%${searchQuery}%`}) 
                        OR LOWER(name_national) LIKE LOWER(${`%${searchQuery}%`})
                    )
                    ELSE (
                        SELECT reltuples::bigint 
                        FROM pg_class 
                        WHERE relname = 'disaster_event'
                    )
                END AS total;
        `);
        

        // ✅ Extract the total number of records
        const totalRecords = totalRecordsResult.rows[0]?.total ?? 0;

        console.log(`🚀 Total Records: ${totalRecords}, Page: ${page}, Limit: ${limit}`); // Debugging log

        return { data: results, totalRecords, page, limit };
    } catch (error) {
        console.error("Error fetching disaster events:", error);
        return { error: "Error fetching data" };
    }
};


