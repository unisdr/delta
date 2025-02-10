import { dr } from "~/db.server"; // Drizzle ORM instance
import { formatDate } from "~/util/date";
import { sql } from "drizzle-orm";

export function extractMainTableName(sqlQuery: string) {
    const regex = /\bFROM\s+([\w.]+)/i;  // Match "FROM table_name"
    const match = sqlQuery.match(regex);
    return match ? match[1] : null;
}

export async function fetchData(pickerConfig: any, searchQuery: string = "", page: number = 1, limit: number = 10) {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Escape search query to avoid SQL injection
    const safeSearchPattern = `%${searchQuery.replace(/'/g, "''")}%`;

    // Format the SQL query by replacing placeholders
    const query = pickerConfig.dataSourceSQL
        .replace(/\[safeSearchPattern\]/g, `%${safeSearchPattern}%`)
        .replace(/\[limit\]/g, `${limit}`)
        .replace(/\[offset\]/g, `${offset}`);

    console.log("Executing SQL Query:", query);
    console.log("Main Table Name:", extractMainTableName(query));

    try {
        const result = await dr.execute(query);
        const rows = result.rows ?? [];

        return rows.map((row: any) => {
            let formattedRow: any = {};

            pickerConfig.table_columns.forEach((col) => {
                if (col.column_type === "db") {
                    const fieldValue = row[col.column_field] ?? "N/A";

                    // Auto-detect and format date fields
                    let finalValue = fieldValue;
                    if (typeof fieldValue === "string" && Date.parse(fieldValue)) {
                        finalValue = formatDate(new Date(fieldValue));
                    }

                    // Apply custom render function if available
                    formattedRow[col.column_field] = col.render ? col.render(row) : finalValue;
                }
            });

            return formattedRow;
        });
    } catch (error) {
        console.error("Database query failed:", error);
        return [];
    }
}

export async function getTotalRecords(pickerConfig: any, searchQuery: string) {
    const query = pickerConfig.dataSourceSQL;
    const mainTableName = extractMainTableName(query);

    // Extract full base query (keep JOINs & fields, remove only LIMIT & OFFSET)
    const baseQuery = pickerConfig.dataSourceSQL
        .replace(/\[safeSearchPattern\]/g, `%${searchQuery}%`)
        .replace(/\bLIMIT\s+\[\w+\].*/gi, '') 
        .replace(/\bOFFSET\s+\[\w+\].*/gi, '');

    // Construct the total count query dynamically
    const totalRecordsSQL = sql`
        SELECT CASE
            WHEN (
                SELECT reltuples::bigint 
                FROM pg_class 
                WHERE relname = ${mainTableName}
            ) < 100000 
            THEN (
                SELECT COUNT(*) FROM (${sql.raw(baseQuery)}) AS tempTable
            )
            ELSE (
                SELECT reltuples::bigint 
                FROM pg_class 
                WHERE relname = ${mainTableName}
            )
        END AS total;
    `;

    try {
        const totalRecordsResult = await dr.execute(totalRecordsSQL);
        return totalRecordsResult.rows[0]?.total ?? 0;
    } catch (error) {
        console.error("Error fetching total records:", error);
        return 0;
    }
}