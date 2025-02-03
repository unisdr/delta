import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";
import { eq, not, and, isNotNull, sql } from "drizzle-orm";
import { useEffect, useState, useRef } from "react";
import { TreeView, buildTree } from "~/components/TreeView";


// Loader to Fetch & Transform Data
export const loader = async () => {
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
    return json(treeData);
};

// React Component to Render Tree
export default function TreeViewPage() {
    const treeData = useLoaderData();

    const targetObject = useRef<HTMLDivElement>(null);

    console.log(treeData);

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
                    <div ref={targetObject} style={{display: 'block', padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', fontWeight: 'bold'}}>&nbsp;</div>
                    <TreeView 
                        treeData={treeData} 
                        caption="Select Geographic level" 
                        rootCaption="Geographic levels" 
                        targetObject={targetObject} 
                        onApply={
                            (dialogRef: any, selectedItems: any) => {
                                if (targetObject.current) targetObject.current.textContent = selectedItems.names;
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
                </div>
            </section>
        </>
    );
}


