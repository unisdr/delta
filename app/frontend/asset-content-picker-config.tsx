import { hazardousEventLabel } from "~/frontend/events/hazardeventform";
import { eq, ilike, or, asc, sql } from "drizzle-orm";
import { sectorTable } from "~/drizzle/schema";

export const contentPickerConfigSector = {
    id: "sectorIds",
    viewMode: "tree",
    multiSelect: true,
    dataSources: "/settings/assets/content-picker-datasource",
    caption: "Sectors",
    defaultText: "Select Sector...",
    table_column_primary_key: "id",
    table_columns: [
        { column_type: "db", column_field: "id", column_title: "Id", is_primary_id: true, is_selected_field: true },
        { column_type: "db", column_field: "parentId", column_title: "Parent Id", tree_field: "parentKey" },
        { column_type: "db", column_field: "sectorname", column_title: "Name", tree_field: "nameKey" },
        { column_type: "custom", column_field: "action", column_title: "Action" },
    ],
    dataSourceDrizzle: {
        table: sectorTable, // Store table reference
        selects: [ // Define selected columns
            { alias: "id", column: sectorTable.id },
            { alias: "parentId", column: sectorTable.parentId },
            { alias: "sectorname", column: sectorTable.sectorname },
        ],
        //orderBy: [{ column: sectorTable.sectorname, direction: "asc" }] // Sorting
        orderByOptions: {
            default: [{ column: sectorTable.sectorname, direction: "asc" }],
            custom: sql`CASE WHEN ${sectorTable.sectorname} = 'Cross-cutting' THEN 1 ELSE 0 END, ${sectorTable.sectorname} ASC`
        }
    },
    selectedDisplay: async (dr: any, ids: string) => {
        const sectorIds = ids.split(",").map((id) => Number(id)).filter(Number.isInteger); // Convert to numbers
    
        if (sectorIds.length === 0) return [];
    
        const { rows } = await dr.execute(sql`
            SELECT id, sectorname 
            FROM sector
            WHERE id IN (${sql.join(sectorIds, sql`, `)})
        `);
    
        // Convert row IDs to numbers for correct Map lookup
        const idToNameMap = new Map(rows.map((row: any) => [Number(row.id), row.sectorname]));
    
        // Return objects with { id, name }, preserving order of sectorIds
        return sectorIds.map(id => ({
            id,
            name: idToNameMap.get(id) || "No sector found"
        }));
    },
};