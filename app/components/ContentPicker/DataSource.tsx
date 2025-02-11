import { dr } from "~/db.server"; // Drizzle ORM instance
import { formatDate } from "~/util/date";
import { sql, eq, ilike, or, asc, desc, count } from "drizzle-orm";

function buildDrizzleQuery(config: any, searchPattern: string, overrideSelect?: any) {
    if (!config?.table) {
        throw new Error("No table defined for Drizzle ORM query.");
    }

    let query = dr.select(
        overrideSelect ? overrideSelect : 
        Object.fromEntries(config.selects.map((s: any) => [s.alias, s.column]))
    ).from(config.table);

    if (config.joins?.length) {
        config.joins.forEach((join: any) => {
            if (join.type === "inner") {
                query = query.innerJoin(join.table, join.condition) as any;
            } else if (join.type === "left") {
                query = query.leftJoin(join.table, join.condition) as any;
            }
        });
    }

    if (config.whereIlike?.length) {
        const newWhereConditions = config.whereIlike.map((condition: any) =>
            ilike(condition.column, searchPattern)
        );
        query = query.where(or(...newWhereConditions)) as any;
    }

    if (config.orderBy?.length) {
        config.orderBy.forEach((order: any) => {
            query = query.orderBy(order.direction === "asc" ? asc(order.column) : desc(order.column)) as any;
        });
    }

    return query as any;
}

export async function fetchData(pickerConfig: any, searchQuery: string = "", page: number = 1, limit: number = 10) {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Escape search query to avoid SQL injection
    const safeSearchPattern = `%${searchQuery.replace(/'/g, "''")}%`;

    let rows = [];

    if (pickerConfig.dataSourceDrizzle) {
        try {
            let query = buildDrizzleQuery(pickerConfig.dataSourceDrizzle, safeSearchPattern)
            .limit(limit)
            .offset(offset);

            rows = await query.execute();
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
        const countConfig = { ...pickerConfig.dataSourceDrizzle };
        delete countConfig.orderBy;

        let query = buildDrizzleQuery(
            countConfig,
            safeSearchPattern,
            { total: sql`COUNT(*)`.as("total") }
        );

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
