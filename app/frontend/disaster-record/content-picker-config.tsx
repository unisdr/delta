import { hazardEventLabel } from "~/frontend/events/hazardeventform";
import { eq, ilike, or, asc } from "drizzle-orm";
import { disasterEventTable, hazardEventTable, hipHazardTable } from "~/drizzle/schema";
import {formatDate} from "~/util/date";

export const contentPickerConfig = {
    id: "disasterEventId",
    dataSources: "/examples/components/content-picker-datasource",
    caption: "Disaster Event",
    defaultText: "Select Disaster Event...",
    table_columns: [
        { column_type: "db", column_field: "id", column_title: "ID", is_primary_id: true, is_selected_field: true },
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
            { alias: "startDate", column: disasterEventTable.startDate },
            { alias: "endDate", column: disasterEventTable.endDate },
            { alias: "hazardEventId", column: hazardEventTable.id },
            { alias: "hazardEventName", column: hipHazardTable.nameEn }
        ],
        joins: [ // Define joins
            { type: "inner", table: hazardEventTable, condition: eq(disasterEventTable.hazardEventId, hazardEventTable.id) },
            { type: "inner", table: hipHazardTable, condition: eq(hazardEventTable.hazardId, hipHazardTable.id) }
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
};
