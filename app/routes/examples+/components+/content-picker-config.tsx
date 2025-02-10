import { hazardEventLabel } from "~/frontend/events/hazardeventform";
import { eq, ilike, or, asc } from "drizzle-orm";
import { disasterEventTable, hazardEventTable, hipHazardTable } from "~/drizzle/schema";

console.log('disasterEventTable.name: ', disasterEventTable.name); // disaster_event

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
        { column_type: "db", column_field: "startDateUTC", column_title: "Start Date" },
        { column_type: "db", column_field: "endDateUTC", column_title: "End Date" },
        { column_type: "custom", column_field: "action", column_title: "Action" },
    ],
    dataSourceSQL: `
        SELECT 
            de.id AS id,
            de.start_date_utc AS "startDateUTC",
            de.end_date_utc AS "endDateUTC",
            he.id AS "hazardEventId",
            hh.name_en AS "hazardEventName"
        FROM disaster_event de
        JOIN hazard_event he ON de.hazard_event_id = he.id
        JOIN hip_hazard hh ON he.hazard_id = hh.id
        WHERE 
            LOWER(de.id::TEXT) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(de.other_id1::TEXT) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(de.glide::TEXT) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(de.name_global_or_regional::TEXT) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(de.name_national::TEXT) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(hh.name_en) LIKE LOWER('[safeSearchPattern]')
            OR LOWER(he.id::TEXT) LIKE LOWER('[safeSearchPattern]')
        ORDER BY de.start_date_utc DESC
        LIMIT [limit]
        OFFSET [offset];
    `,
    dataSourceSQLTable: "disaster_event",
    /*dataSourceDrizzle: {
        table: disasterEventTable,
        select: (dr: any) => {
            return dr.select({
                id: disasterEventTable.id,
                startDateUTC: disasterEventTable.startDateUTC,
                endDateUTC: disasterEventTable.endDateUTC,
                hazardEventId: hazardEventTable.id,
                hazardEventName: hipHazardTable.nameEn,
            })
            .from(disasterEventTable)
            // .innerJoin(hazardEventTable, eq(disasterEventTable.hazardEventId, hazardEventTable.id))
            // .innerJoin(hipHazardTable, eq(hazardEventTable.hazardId, hipHazardTable.id))
            .orderBy(asc(disasterEventTable.startDateUTC))
        },
        joins: [
            { table: hazardEventTable, condition: eq(disasterEventTable.hazardEventId, hazardEventTable.id) },
            { table: hipHazardTable, condition: eq(hazardEventTable.hazardId, hipHazardTable.id) }
        ],
        whereIlike: [
            { column: disasterEventTable.otherId1, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.glide, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameGlobalOrRegional, placeholder: "[safeSearchPattern]" },
            { column: disasterEventTable.nameNational, placeholder: "[safeSearchPattern]" },
            { column: hipHazardTable.nameEn, placeholder: "[safeSearchPattern]" }
        ]
    },*/
};