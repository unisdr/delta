import { hazardousEventLabel } from "~/frontend/events/hazardeventform";
import { eq, sql } from "drizzle-orm";
import { disasterEventTable, hazardousEventTable, hipHazardTable, sectorTable, categoriesTable } from "~/drizzle/schema";
import { formatDateDisplay } from "~/util/date";

export const contentPickerConfig = {
    id: "disasterEventId",
    required: false,
    viewMode: "grid",
    dataSources: "/disaster-record/content-picker-datasource",
    caption: "Disaster Event",
    defaultText: "Select Disaster Event...",
    table_column_primary_key: "id",
    table_columns: [
        { column_type: "db", column_field: "display", column_title: "Event", is_primary_id: true, is_selected_field: true,
            render: (displayName: string) => {
                return `${displayName}`;
            }
        },
        //{ column_type: "db", column_field: "hazardousEventName", column_title: "Hazardous Event" },
        { column_type: "db", column_field: "hazardousEventName", column_title: "Hazardous Event", 
            render: (item: any) => { 
                return hazardousEventLabel({
                    id: item.hazardousEventId,
                    description: "", // Assuming there's a description field
                    hazard: { nameEn: item.hazardousEventName }
                })
            }
        },
        { column_type: "db", column_field: "startDateUTC", column_title: "Start Date",
            render: (item: any) => formatDateDisplay(item.startDateUTC, "d MMM yyyy")
         },
        { column_type: "db", column_field: "endDateUTC", column_title: "End Date",
            render: (item: any) => formatDateDisplay(item.endDateUTC, "d MMM yyyy")
        },
        { column_type: "custom", column_field: "action", column_title: "Action" },
    ],
    dataSourceDrizzle: {
        table: disasterEventTable, // Store table reference
        selects: [ // Define selected columns
            { alias: "id", column: disasterEventTable.id },
            { alias: "startDateUTC", column: disasterEventTable.startDate },
            { alias: "endDateUTC", column: disasterEventTable.endDate },
            { alias: "hazardousEventId", column: hazardousEventTable.id },
            { alias: "hazardousEventName", column: hipHazardTable.nameEn }
        ],
        joins: [ // Define joins
            { type: "inner", table: hazardousEventTable, condition: eq(disasterEventTable.hazardousEventId, hazardousEventTable.id) },
            { type: "inner", table: hipHazardTable, condition: eq(hazardousEventTable.hipHazardId, hipHazardTable.id) }
        ],
        whereIlike: [ // Define search filters
            { column: disasterEventTable.otherId1, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.glide, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameGlobalOrRegional, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameNational, placeholder: "[safeSearchPattern]" },
            { column: hipHazardTable.nameEn, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.startDate, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.endDate, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.approvalStatus, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.disasterDeclarationTypeAndEffect1, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.disasterDeclarationTypeAndEffect2, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.disasterDeclarationTypeAndEffect3, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.disasterDeclarationTypeAndEffect4, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.disasterDeclarationTypeAndEffect5, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.officialWarningAffectedAreas, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.earlyActionDescription1, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.earlyActionDescription2, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.earlyActionDescription3, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.earlyActionDescription4, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.earlyActionDescription5, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.responseOperations, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.dataSource, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.recordingInstitution, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.nonEconomicLosses, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.responseOperationsDescription, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.humanitarianNeedsDescription, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.humanitarianNeedsDescription, placeholder: "[safeSearchPattern]" },

            { column: disasterEventTable.hazardousEventId, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.id, placeholder: "[safeSearchPattern]" },
        ],
        orderBy: [{ column: disasterEventTable.startDate, direction: "desc" }] // Sorting
    },
    selectedDisplay: async (dr: any, id: any) => {
        const row = await dr
            .select()
            .from(disasterEventTable)
            .where(eq(disasterEventTable.id, id))
            .limit(1)
            .execute();
    
        if (!row.length) return "No event found";
    
        const event = row[0];
        let displayName = event.nameGlobalOrRegional || event.nameNational || "";
        let displayDate = "";
    
        if (event.startDate && event.endDate) {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
    
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
    
            if (startYear !== endYear) {
                // Show full format including the year in start date
                displayDate = `${formatDateDisplay(startDate, "d MMM yyyy")} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
            } else if (startDate.getMonth() === endDate.getMonth()) {
                if (startDate.getDate() === endDate.getDate()) {
                    displayDate = `${startDate.getDate()} ${formatDateDisplay(startDate, "MMM yyyy")}`;
                } else {
                    displayDate = `${startDate.getDate()} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
                }
            } else {
                displayDate = `${formatDateDisplay(startDate, "d MMM")} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
            }
        }
    
        let displayId = event.id || "";
        // Truncate the display ID to 5 characters
        if (displayId.length > 5) {
            displayId = displayId.substring(0, 5);
        }
    
        return `${displayName} (${displayDate}) - ${displayId}`;
    },    
};

export const contentPickerConfigSector = {
    id: "sectorId",
    viewMode: "tree",
    dataSources: "/disaster-record/content-picker-datasource?view=1",
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
    selectedDisplay: async (dr: any, id: any) => {
        const sectorId = Number(id);
        if (!Number.isInteger(sectorId)) return "";
    
        try {
            const { rows } = await dr.execute(sql`SELECT get_sector_full_path(${sectorId}) AS full_path`);
            return rows[0]?.full_path || "No sector found";
        } catch {
            const { rows } = await dr.execute(sql`
                WITH RECURSIVE ParentCTE AS (
                    SELECT id, sectorname, parent_id, sectorname AS full_path
                    FROM sector
                    WHERE id = ${sectorId}
                    UNION ALL
                    SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
                    FROM sector t
                    INNER JOIN ParentCTE p ON t.id = p.parent_id
                )
                SELECT full_path FROM ParentCTE WHERE parent_id IS NULL
            `);
            return rows[0]?.full_path || "No sector found";
        }
    }
};

export const contentPickerConfigCategory = {
    id: "categoryId",
    viewMode: "tree",
    dataSources: "/disaster-record/content-picker-datasource?view=2",
    caption: "Category",
    defaultText: "Select Category...",
    table_column_primary_key: "id",
    table_columns: [
        { column_type: "db", column_field: "id", column_title: "Id", is_primary_id: true, is_selected_field: true },
        { column_type: "db", column_field: "parentId", column_title: "Parent Id", tree_field: "parentKey" },
        { column_type: "db", column_field: "name", column_title: "Name", tree_field: "nameKey" },
        { column_type: "custom", column_field: "action", column_title: "Action" },
    ],
    dataSourceDrizzle: {
        table: categoriesTable, // Store table reference
        selects: [ // Define selected columns
            { alias: "id", column: categoriesTable.id },
            { alias: "parentId", column: categoriesTable.parentId },
            { alias: "name", column: categoriesTable.name },
        ],
        orderBy: [{ column: categoriesTable.name, direction: "asc" }] // Sorting
    },
    selectedDisplay: async (dr: any, id: any) => {
        const categoryId = Number(id);
        if (!Number.isInteger(categoryId)) return "";
    
        try {
            const { rows } = await dr.execute(sql`SELECT get_category_full_path(${categoryId}) AS full_path`);
            return rows[0]?.full_path || "No category found";
        } catch {
            const { rows } = await dr.execute(sql`
                WITH RECURSIVE ParentCTE AS (
                    SELECT id, name, parent_id, name AS full_path
                    FROM categories
                    WHERE id = ${categoryId}
                    UNION ALL
                    SELECT t.id, t.name, t.parent_id, t.name || ' > ' || p.full_path AS full_path
                    FROM categories t
                    INNER JOIN ParentCTE p ON t.id = p.parent_id
                )
                SELECT full_path FROM ParentCTE WHERE parent_id IS NULL
            `);
            return rows[0]?.full_path || "No category found";
        }
    }    
}
