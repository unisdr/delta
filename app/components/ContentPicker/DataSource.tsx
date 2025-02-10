import { dr } from "~/db.server"; // Drizzle ORM instance
import { formatDate } from "~/util/date";
import { sql, eq, ilike, or, asc, count } from "drizzle-orm";

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

    let rows = [];

    if (pickerConfig.dataSourceDrizzle) {
        try {
            let query = pickerConfig.dataSourceDrizzle.select(dr);

            if (pickerConfig.dataSourceDrizzle.joins?.length) {
                pickerConfig.dataSourceDrizzle.joins.forEach((join: any) => {
                    query = query.innerJoin(join.table, join.condition);
                });
            }    

            if (pickerConfig.dataSourceDrizzle.whereIlike?.length) {
                const newWhereConditions = pickerConfig.dataSourceDrizzle.whereIlike.map((condition: any) =>
                    ilike(condition.column, safeSearchPattern)
                );
                query = query.where(or(...newWhereConditions));
            }

            rows = await query.limit(limit).offset(offset).execute();
        } catch (error) {
            console.error("Error fetching data from Drizzle ORM:", error);
            return [];
        }
    } else {
        // Format the SQL query by replacing placeholders
        const query = pickerConfig.dataSourceSQL
            .replace(/\[safeSearchPattern\]/g, `%${safeSearchPattern}%`)
            .replace(/\[limit\]/g, `${limit}`)
            .replace(/\[offset\]/g, `${offset}`);

        try {
            const result = await dr.execute(query);
            rows = result.rows ?? [];
        } catch (error) {
            console.error("Database query failed:", error);
            return [];
        }
    }

    return rows.map((row: any) => {
        let formattedRow: any = {};

        pickerConfig.table_columns.forEach((col: any) => {
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
}

export async function getTotalRecords(pickerConfig: any, searchQuery: string) {
    if (pickerConfig.dataSourceDrizzle) {
        return await getTotalRecordsDrizzle(pickerConfig, searchQuery);
    } else {
        return await getTotalRecordsSQL(pickerConfig, searchQuery);
    }
}

async function getTotalRecordsDrizzle(pickerConfig: any, searchQuery: string) {
    if (!pickerConfig.dataSourceDrizzle?.table) {
        console.error("Error: No table defined for Drizzle ORM query.");
        return 0;
    }

    const safeSearchPattern = `%${searchQuery}%`;

    try {
        // ✅ Start a new query with `.from()` and `.count()`
        let query = dr
            .select({ total: count() })
            .from(pickerConfig.dataSourceDrizzle.table);

        // ✅ Extract and apply dynamic `JOIN`s
        if (pickerConfig.dataSourceDrizzle.joins) {
            pickerConfig.dataSourceDrizzle.joins.forEach((join: any) => {
                query = query.innerJoin(join.table, join.condition);
            });
        }

        // ✅ Extract WHERE conditions and replace placeholders
        const newWhereConditions = pickerConfig.dataSourceDrizzle.whereIlike.map((condition: any) =>
            ilike(condition.column, safeSearchPattern)
        );

        if (newWhereConditions.length) {
            query = query.where(or(...newWhereConditions));
        }

        // ✅ Execute the COUNT query
        const result = await query.execute();
        return result[0]?.total ?? 0;
    } catch (error) {
        console.error("Error fetching total records (Drizzle):", error);
        return 0;
    }
}

async function getTotalRecordsSQL(pickerConfig: any, searchQuery: string) {
    const mainTableName = pickerConfig.dataSourceSQLTable;

    // Format the SQL query
    const baseQuery = pickerConfig.dataSourceSQL
        .replace(/\[safeSearchPattern\]/g, `%${searchQuery}%`)
        .replace(/\bLIMIT\s+\[\w+\].*/gi, '')
        .replace(/\bOFFSET\s+\[\w+\].*/gi, '');

    // Construct total records SQL
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
        console.error("Error fetching total records (SQL):", error);
        return 0;
    }
}
