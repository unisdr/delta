import { useLoaderData } from "@remix-run/react";
import { TreeView, buildTree } from "~/components/TreeView";

// Define the expected return type
interface LoaderData {
    treeData: any[];  // Adjust the type if you have a proper structure
}

// Loader to Fetch & Transform Data
export const loader = async () => {

    const rawData = [
        { id: 1, parentId: null, name: "Productive Sector" },
        { id: 2, parentId: 1, name: "Mining and quarrying" },
        { id: 3, parentId: 1, name: "Manufacturing" },
        { id: 4, parentId: 1, name: "Tourism" },
        { id: 5, parentId: 1, name: "Construction" },
        { id: 6, parentId: 1, name: "Services" },
        { id: 7, parentId: 1, name: "Agriculture" },
        { id: 8, parentId: 1, name: "Commerce" },
    
        { id: 9, parentId: null, name: "Social Sector" },
        { id: 10, parentId: 9, name: "Health" },
        { id: 11, parentId: 10, name: "Service delivery; health programmes" },
        { id: 12, parentId: 10, name: "Service delivery; Organisation and management of services, incl. the health network" },
        { id: 13, parentId: 12, name: "Community, primary, secondary, tertiary levels" },
        { id: 14, parentId: 13, name: "Hospitals, health centres, clinics, dispensaries, pharmacies, health posts, blood banks, laboratories" },
    
        { id: 15, parentId: 9, name: "Culture" },
        { id: 16, parentId: 15, name: "Tangible" },
        { id: 17, parentId: 15, name: "Intangible cultural heritage" },
    
        { id: 18, parentId: 9, name: "Housing" },
        { id: 19, parentId: 18, name: "Type of housing / structural" },
        { id: 20, parentId: 19, name: "Permanent" },
        { id: 21, parentId: 19, name: "Temporary" },
    
        { id: 22, parentId: 9, name: "Education" },
        { id: 23, parentId: 22, name: "Level 5 - Short-cycle tertiary education (general or vocational)" },
        { id: 24, parentId: 22, name: "Level 1 - Primary education" },
        { id: 25, parentId: 22, name: "Level 3 - Upper secondary education (General or vocational)" },
        { id: 26, parentId: 22, name: "Level 0 - Early childhood" },
        { id: 27, parentId: 22, name: "Level 2 - Lower secondary education (General or vocational)" },
        { id: 28, parentId: 22, name: "Level 4 - Post-secondary non-tertiary education (general or vocational)" },
        { id: 29, parentId: 22, name: "Level 6,7,8 - Bachelors, Master, PhD (academic or professional)" },
    
        { id: 30, parentId: null, name: "Infrastructure Sector" },
        { id: 31, parentId: 30, name: "Information and Communications" },
        { id: 32, parentId: 30, name: "Energy" },
        { id: 33, parentId: 30, name: "Transportation" },
    ];    

    // Define Keys Mapping (Make it Adaptable)
    const idKey = "id"; 
    const parentKey = "parentId"; 
    const nameKey = "name"; 
    
    const treeData = buildTree(rawData, idKey, parentKey, nameKey);

    return treeData;
};

// React Component to Render Tree
export default function TreeViewPage() {
    const treeData = useLoaderData() as LoaderData;

    return (
        <>
            <div className="dts-page-header">
                <header className="dts-page-title">
                    <div className="mg-container">
                        <h1 className="dts-heading-1">TreeView Example 2</h1>
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
                                    rootCaption="Sectors" 
                                    dialogMode={false}
                                    disableButtonSelect={true}
                                    noSelect={true}
                                    search={false}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}


