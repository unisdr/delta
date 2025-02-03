import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";
import { useEffect, useState } from "react";

// ✅ Inject CSS dynamically on component mount
const injectStyles = () => {
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
        #divisionTree {
            list-style-type: none;
        }
        .tree-view li {
            margin-bottom: 5px;
        }
        .tree-view ul {
            margin-left: 8px;
        }
        .tree-view li::before {
            content: "├── ";
            font-family: "Songti SC", monospace;
        }
        .tree-view li:last-child::before {
            content: "└── ";
        }
        .toggle-btn {
            border: none;
            background: none;
            cursor: pointer;
            margin-right: 5px;
            font-size: 14px;
        }
        .toggle-btn:hover {
            font-weight: bold;
        }

        #divisionTree button {
            display: inline-block;
            background-color: buttonface;
            padding: 4px 8px 1px 8px;
            border: 1px solid #000;
            border-radius: 5px;
        }

        .tree-btn {
            display: inline-block;
            background-color: buttonface;
            padding: 4px 8px 1px 8px;
            border: 1px solid #000;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
};

export const loader = async () => {
    const divisions = await dr.select().from(divisionTable);

    const buildTree = (list: any[]) => {
        const map = new Map();
        list.forEach((item) => {
            map.set(item.id, { ...item, children: [] });
        });

        const tree = [];
        list.forEach((item) => {
            if (item.parentId === null) {
                tree.push(map.get(item.id)); // Top-level parent
            } else {
                const parent = map.get(item.parentId);
                if (parent) {
                    parent.children.push(map.get(item.id));
                }
            }
        });
        return tree;
    };

    const normalizedDivisions = divisions.map((division) => ({
        ...division,
        parentId: division.parentId ?? null, // Convert undefined to null
    }));

    return json(buildTree(normalizedDivisions));
};

export default function DivisionsPage() {
    const divisions = useLoaderData();
    const [expandedNodes, setExpandedNodes] = useState<{ [key: number]: boolean }>({});

    useEffect(() => {
        injectStyles(); // Inject CSS when the component mounts
    }, []);

    const toggleExpand = (id: number) => {
        setExpandedNodes((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const expandAll = () => {
        const newState: { [key: number]: boolean } = {};
        divisions.forEach((node) => {
            newState[node.id] = true;
            node.children?.forEach((child: any) => (newState[child.id] = true));
        });
        setExpandedNodes(newState);
    };

    const collapseAll = () => {
        setExpandedNodes({});
    };

    const renderTree = (nodes: any[]) => (
        <ul className="tree-view" id="divisionTree">
            {nodes.map((node) => {
                const availableName =
                    node.name?.en || node.name?.fr || node.name?.de || node.name?.it || "Unnamed Location";

                return (
                    <li key={node.id}>
                        {node.children.length > 0 && (
                            <button className="toggle-btn" onClick={() => toggleExpand(node.id)}>
                                {expandedNodes[node.id] ? "▼" : "►"}
                            </button>
                        )}
                        {availableName}
                        {node.children.length > 0 && expandedNodes[node.id] && renderTree(node.children)}
                    </li>
                );
            })}
        </ul>
    );

    return (
        <>
            <div className="dts-page-header"><header className="dts-page-title"><div className="mg-container"><h1 className="dts-heading-1">Styled Tree View Example</h1></div></header></div>
            <section>
                <div className="mg-container">
                    <div>
                        <button className="tree-btn" onClick={expandAll} style={{marginRight: '1rem'}}>Expand All</button>
                        <button className="tree-btn" onClick={collapseAll}>Collapse All</button>
                    </div>
                    {divisions.length > 0 ? renderTree(divisions) : <p>No data found. Please check your database.</p>}
                </div>
            </section>
        </>
    );
}
