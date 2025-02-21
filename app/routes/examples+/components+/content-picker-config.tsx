import { hazardEventLabel } from "~/frontend/events/hazardeventform";
import { eq, ilike, or, asc } from "drizzle-orm";
import { disasterEventTable, hazardEventTable, hipHazardTable } from "~/drizzle/schema";
import { formatDate, formatDateDisplay } from "~/util/date";

export const contentPickerConfig = {
    id: "disasterEventId",
    viewMode: "grid",
    dataSources: "/examples/components/content-picker-datasource",
    caption: "Disaster Event",
    defaultText: "Select Disaster Event...",
    table_column_primary_key: "id",
    table_columns: [
        { column_type: "db", column_field: "display", column_title: "Event", is_primary_id: true, is_selected_field: true,
            render: (item: any, displayName: string) => {
                return `${displayName}`;
            }
        },
        //{ column_type: "db", column_field: "hazardEventName", column_title: "Hazardous Event" },
        { column_type: "db", column_field: "hazardEventName", column_title: "Hazardous Event", 
            render: (item: any) => { 
                return hazardEventLabel({
                    id: item.hazardEventId,
                    description: "", // Assuming there's a description field
                    hazard: { nameEn: item.hazardEventName }
                })
            }
        },
        { column_type: "db", column_field: "startDateUTC", column_title: "Start Date",
            render: (item: any) => formatDate(item.startDateUTC)
         },
        { column_type: "db", column_field: "endDateUTC", column_title: "End Date",
            render: (item: any) => formatDate(item.endDateUTC)
        },
        { column_type: "custom", column_field: "action", column_title: "Action" },
    ],
    dataSourceDrizzle: {
        table: disasterEventTable, // Store table reference
        selects: [ // Define selected columns
            { alias: "id", column: disasterEventTable.id },
            { alias: "startDateUTC", column: disasterEventTable.startDate },
            { alias: "endDateUTC", column: disasterEventTable.endDate },
            { alias: "hazardEventId", column: hazardEventTable.id },
            { alias: "hazardEventName", column: hipHazardTable.nameEn }
        ],
        joins: [ // Define joins
            { type: "inner", table: hazardEventTable, condition: eq(disasterEventTable.hazardEventId, hazardEventTable.id) },
            { type: "inner", table: hipHazardTable, condition: eq(hazardEventTable.hipHazardId, hipHazardTable.id) }
        ],
        whereIlike: [ // Define search filters
            { column: disasterEventTable.otherId1, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.glide, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameGlobalOrRegional, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameNational, placeholder: "[safeSearchPattern]" },
            { column: hipHazardTable.nameEn, placeholder: "[safeSearchPattern]" }
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
