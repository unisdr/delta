import { sectorTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

export const contentPickerConfig = {
    id: "sector_id",
    viewMode: "tree",
    dataSources: "/examples/components/content-picker-datasource-tree",
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
        orderBy: [{ column: sectorTable.sectorname, direction: "asc" }] // Sorting
    },
    selectedDisplay: async (dr: any, id: any) => {
        // Function to recursively get parent hierarchy
        const getSectorPath = async (sectorId: any, path: string[] = []): Promise<string[]> => {
            const row = await dr
                .select()
                .from(sectorTable)
                .where(eq(sectorTable.id, sectorId))
                .limit(1)
                .execute();
    
            if (!row.length) return path; // Stop if no parent found
    
            const sector = row[0];
            path.unshift(sector.sectorname); // Add sector name at the beginning
    
            if (sector.parentId) {
                return getSectorPath(sector.parentId, path); // Recursively get parent path
            }
            
            return path;
        };
    
        const pathArray = await getSectorPath(id);
        if (!pathArray.length) return "No sector found";
    
        return `${pathArray.join(" / ")}`; // Format the path like: "/Parent/Child/Sub-Child"
    },    
};