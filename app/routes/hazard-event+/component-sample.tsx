import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable, disasterEventTable } from "~/drizzle/schema";
import { eq, not, and, isNotNull, sql, desc } from "drizzle-orm";
import { useEffect, useState, useRef } from "react";
import { TreeView, buildTree } from "~/components/TreeView";

import { ContentPicker } from "~/components/ContentPicker";
import {hazardEventLink} from "~/frontend/events/hazardeventform"
import {hazardBasicInfoJoin} from "~/backend.server/models/event"
import {formatDate} from "~/util/date";


// Loader to Fetch & Transform Data
export const loader = async () => {

    let arrDisasterEventTable = [] as any[];

    try {
        const results = await dr.query.disasterEventTable.findMany({
            columns: {
                id: true,
                startDateUTC: true,
                endDateUTC: true,
            },
            with: {
                hazardEvent: {
                    with: hazardBasicInfoJoin
                },
            },
            orderBy: [desc(disasterEventTable.startDateUTC)], // Order results by latest event first
        });
    
        // Iterate and log each item
        results.forEach((item: any) => {
            const hazardEven = hazardEventLink(item.hazardEvent);
            const hazardEventName = hazardEven?.props?.children || "N/A";
            arrDisasterEventTable.push({
                id: item.id,
                hazardEventId: item.hazardEventId,
                startDateUTC: formatDate(item.startDateUTC),
                endDateUTC: formatDate(item.endDateUTC),
                hazardEventName: hazardEventName
            });
        });
    
    } catch (error) {
        console.error("Error querying disasterEventTable:", error);
    }    

    //const rawData = await dr.select().from(divisionTable); // Can replace `divisionTable` with any table

    const rawData = [
        await dr.select().from(divisionTable)
        /*.where(
            and(
                not(sql`${divisionTable.geojson}::text = '""'`) // ✅ Exclude empty JSON strings
            )
        )*/
        ,
        [
            { id: 1, parentId: null, name: { en: "Parent A" } },
            { id: 2, parentId: 1, name: { en: "Child A.1" } },
            { id: 3, parentId: 1, name: { en: "Child A.2" } },
            { id: 4, parentId: 2, name: { en: "Subchild A.1.1" } },
            { id: 5, parentId: 2, name: { en: "Subchild A.1.2" } },
            { id: 6, parentId: 3, name: { en: "Subchild A.2.1" } },
            { id: 7, parentId: 3, name: { en: "Subchild A.2.2" } },
            { id: 8, parentId: 4, name: { en: "Deepchild A.1.1.1" } },
            { id: 9, parentId: 4, name: { en: "Deepchild A.1.1.2" } },
            { id: 10, parentId: 8, name: { en: "5th Level - A.1.1.1.1" } },
            { id: 11, parentId: 8, name: { en: "5th Level - A.1.1.1.2" } },
            { id: 12, parentId: 5, name: { en: "Deepchild A.1.2.1" } },
            { id: 13, parentId: 5, name: { en: "Deepchild A.1.2.2" } },
            { id: 14, parentId: null, name: { en: "Parent B" } },
            { id: 15, parentId: 14, name: { en: "Child B.1" } },
            { id: 16, parentId: 14, name: { en: "Child B.2" } },
            { id: 17, parentId: 15, name: { en: "Subchild B.1.1" } },
            { id: 18, parentId: 15, name: { en: "Subchild B.1.2" } },
            { id: 19, parentId: 17, name: { en: "Deepchild B.1.1.1" } },
            { id: 20, parentId: 17, name: { en: "Deepchild B.1.1.2" } },
            { id: 21, parentId: 19, name: { en: "5th Level - B.1.1.1.1" } },
            { id: 22, parentId: 19, name: { en: "5th Level - B.1.1.1.2" } },
            { id: 23, parentId: 16, name: { en: "Subchild B.2.1" } },
            { id: 24, parentId: 16, name: { en: "Subchild B.2.2" } },
            { id: 25, parentId: 23, name: { en: "Deepchild B.2.1.1" } },
            { id: 26, parentId: 23, name: { en: "Deepchild B.2.1.2" } },
            { id: 27, parentId: 25, name: { en: "5th Level - B.2.1.1.1" } },
            { id: 28, parentId: 25, name: { en: "5th Level - B.2.1.1.2" } },
            { id: 29, parentId: null, name: { en: "Parent C" } },
            { id: 30, parentId: 29, name: { en: "Child C.1" } },
            { id: 31, parentId: 29, name: { en: "Child C.2" } },
            { id: 32, parentId: 30, name: { en: "Subchild C.1.1" } },
            { id: 33, parentId: 30, name: { en: "Subchild C.1.2" } },
            { id: 34, parentId: 32, name: { en: "Deepchild C.1.1.1" } },
            { id: 35, parentId: 32, name: { en: "Deepchild C.1.1.2" } },
            { id: 36, parentId: 34, name: { en: "5th Level - C.1.1.1.1" } },
            { id: 37, parentId: 34, name: { en: "5th Level - C.1.1.1.2" } },
            { id: 38, parentId: 34, name: "Borat!" },
        ]
    ];  

    // Define Keys Mapping (Make it Adaptable)
    const idKey = "id"; 
    const parentKey = "parentId"; 
    const nameKey = "name"; 
    //const treeData = buildTree(rawData[1], idKey, parentKey, nameKey, ["fr", "de", "en"], "");
    const treeData = buildTree(rawData[0], idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson", "importId"]);
    return {treeData: treeData, disasterEventTable: arrDisasterEventTable};
};

// React Component to Render Tree
export default function TreeViewPage() {
    const {treeData: treeData, disasterEventTable: disasterEventTable} = useLoaderData();

    const targetObject = useRef<HTMLDivElement>(null);

    //console.log(disasterEventTable);

    return (
        <>
            <div className="dts-page-header">
                <header className="dts-page-title">
                    <div className="mg-container">
                        <h1 className="dts-heading-1">Styled Tree View Example</h1>
                    </div>
                </header>
            </div>
            <section>
                <div className="mg-container">
                    <form>
                        <div className="fields">
                            <div className="form-field">
                                <TreeView 
                                    treeData={treeData as any} 
                                    caption="Select Geographic level" 
                                    rootCaption="Geographic levels" 
                                    onApply={
                                        (selectedItems: any) => {
                                            const targetObjectCurrent = targetObject.current as HTMLDivElement | null;
                                            if (targetObjectCurrent) { 
                                                const targetObjectSpan = targetObjectCurrent.querySelector('span');
                                                if (targetObjectSpan) targetObjectSpan.textContent = selectedItems.names;

                                                selectedItems.data.map((item: any) => {
                                                    if (item.id == selectedItems.selectedId) {
                                                        const targetObjectPre = targetObjectCurrent.querySelector('pre') as HTMLPreElement | null;
                                                        if (targetObjectPre) targetObjectPre.textContent = `GEO JSON:\n${item.geojson}`;
                                                    }
                                                });
                                            }
                                            console.log('selectedItems', selectedItems);
                                        }
                                    }
                                    onRenderItemName={
                                        (item: any) => {
                                            return (typeof(item.hiddenData.geojson) == "object") ? {disable: "false"} : {disable: "true"};
                                        }
                                    }
                                    appendCss={
                                        `
                                            ul.tree li div[disable="true"] {
                                                color: #ccc;
                                            }
                                            ul.tree li div[disable="true"] .btn-face.select {
                                                display: none;
                                            }
                                        `
                                    }
                                />
                                <div ref={targetObject} style={{display: 'block', padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', fontWeight: 'bold', marginTop: '1rem'}}> 
                                    Demo placeholder:<br/>
                                    <span
                                        style={{
                                            display: "block",
                                            padding: "10px",
                                            borderRadius: "5px",
                                            background: "#f4f4f4",
                                            marginBottom: "10px",
                                        }}
                                    ></span>
                                    <pre
                                        style={{
                                            whiteSpace: "pre-wrap",
                                            wordWrap: "break-word",
                                            overflowWrap: "break-word",
                                            background: "#f4f4f4",
                                            padding: "10px",
                                            borderRadius: "5px",
                                            fontWeight: "normal",
                                            fontSize: "0.8em",
                                        }}
                                    >
                                    </pre>
                                </div>
                            </div>
                            <div className="form-field">
                                <label>
                                    <div>
                                    <ContentPicker 
                                        dataSources="/hazard-event/component-sample-data" 
                                        caption="Disaster Event"
                                        defaultText="Select Disaster Event..."
                                        table_columns={[
                                            { column_type: "db", column_field: "id", column_title: "ID", searchable: true },
                                            { column_type: "db", column_field: "hazardEventName", column_title: "Hazardous Event", searchable: true },
                                            { column_type: "db", column_field: "startDateUTC", column_title: "Start Date" },
                                            { column_type: "db", column_field: "endDateUTC", column_title: "End Date" },
                                            { column_type: "custom", column_field: "action", column_title: "Action" },
                                        ]}
                                    />
                                    </div>
                                </label>
                            </div>
                            <div className="form-field">
                                <label>National Disaster ID
                                 <div><input type="text" name="nationalDisasterId" value="001" /></div>
                                 </label>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}


