import React, { useState, useRef, useEffect } from "react";

const injectStyles = () => {
    const styleLayout = [
        `
            p.tree {
                margin-top: 2rem !important;
                margin-left: 4rem !important;
            }
            ul.tree {
                margin-left: 5rem !important;
                z-index: 1;
                position: relative;
            }

            p.tree,
            ul.tree,
            ul.tree ul {
                position: relative;
                list-style: none;
                margin: 0;
                padding: 0;
                z-index: 1;
            }

            ul.tree ul {
                margin-left: 1.0em;
            }

            .tree-intro,
            ul.tree li {
                position: relative;
                
                margin-left: 0;
                padding-left: 3em;
                margin-top: 0;
                margin-bottom: 0;
                
                border-left: thin solid #000;
            }

            ul.tree li:last-child {
                border-left: none;
            }

            ul.tree li:before {
                position: absolute;
                top: 0;
                left: 0;

                width: 2.5em; /* width of horizontal line */
                height: 0.5em; /* vertical position of line */
                vertical-align: top;
                border-bottom: thin solid #000;
                content: "";
                display: inline-block;
            }

            ul.tree li:last-child:before {
                border-left: thin solid #000;
            }

            ul.tree li button {
                display: inline-block;
                border: none;
                background: none;
                cursor: pointer;
                margin-right: 5px;
                font-size: x-small;
            }

            ul.tree li button.btn-face {
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
                margin-right: 1rem;
                white-space: nowrap;
            }
            .tree-btn.main-btn {
                padding: 4px 8px 4px 8px;
            }
            .tree-search {  
                display: inline-block;
                padding: 0.4rem;
            }

            .btn-face.select {
                display: none;
                padding: 4px 8px 2px 8px !important;
                font-size: x-small;
                text-transform: uppercase;
                font-weight: bold;
            }
            ul.tree li div {
                position: relative;
                display: inline-block;
            }
            ul.tree li div:hover .btn-face.select {
                display: inline-block;
            }
            .tree-dialog {
                width: 50vw !important;
                max-width: none !important;
                max-height: none !important;
            }
            .tree-dialog .dts-form__body {
                position: relative;
                overflow: scroll;
                height: 500px;
            }
            .tree-footer {
                display: flex;  /* Enables flexbox */
                justify-content: space-between; /* Puts text on the left & button on the right */
                align-items: center; /* Vertically align items */
                width: 100%;
                padding-top: 1.5rem;
            }
            .tree-footer span {
                font-weight: bold;
                flex: 1; /* Allows it to take up available space */
                white-space: normal; /* Allows text wrapping */
            }
            .tree-checkbox {
                margin-right: 0.5rem;
            }
        `,
        `
            p.tree {
                margin-top: 2rem !important;
                margin-left: 0rem !important;
            }

            ul.tree {
                margin-left: 0rem !important;
            }

            p.tree,
            ul.tree,
            ul.tree ul {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            ul.tree ul {
                margin-left: 1.0em;
            }
            .tree-intro,
            ul.tree li {
                position: relative;
                margin-left: 0;
                padding-left: 3em;
                margin-top: 0;
                margin-bottom: 0;
                border-left: thin solid #000;
            }
            ul.tree.no-root-lines > li {
                border-left: none !important;
            }
            ul.tree li:last-child {
                border-left: none;
            }
            ul.tree li::before {
                position: absolute;
                top: 0;
                left: 0;
                width: 2.5em; /* width of horizontal line */
                height: 0.5em; /* vertical position of line */
                vertical-align: top;
                content: "├── ";
                font-family: "Songti SC", monospace;
                display: inline-block;
            }
            ul.tree li:last-child::before {
                content: "└── ";
            }
            ul.tree li button {
                display: inline-block;
                border: none;
                background: none;
                cursor: pointer;
                margin-right: 5px;
                font-size: 14px;
                font-size: x-small;
            }
            ul.tree li button.btn-face {
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
        `,
    ];

    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = styleLayout[0]; // Change index to switch between styles`;
    document.head.appendChild(style);
};

interface TreeViewProps {
    treeData: any[];
    caption?: string;
    rootCaption?: string;
    targetObject?: any | null;
    base_path?: string;
    onApply?: (dialogRef: any, selectedItem: { [key: string]: any }) => void;
    multiSelect?: boolean;
}

export const TreeView: React.FC<TreeViewProps> = ({ treeData = [], caption = "", rootCaption = "Root", targetObject = null,  base_path = "", onApply = null, multiSelect = false }) => {
    const [expandedNodes, setExpandedNodes] = useState<{ [key: number]: boolean }>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [isExpandDisabled, setIsExpandDisabled] = useState(false);
    const [isCollapseDisabled, setIsCollapseDisabled] = useState(true); // Default to true

    const [selectedItems, setSelectedItems] = useState<{ [key: number]: boolean }>({});

    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        injectStyles(); // Inject CSS when component mounts
    }, []);

    // Update button states based on `expandedNodes`
    useEffect(() => {
        const allNodes = treeData.flatMap((node) => getAllNodes(node)); // Get all nodes in the tree
        const allExpanded = allNodes.every((node) => expandedNodes[node.id]);
        const anyExpanded = allNodes.some((node) => expandedNodes[node.id]);

        setIsExpandDisabled(allExpanded);
        setIsCollapseDisabled(!anyExpanded);
    }, [expandedNodes, treeData]);

    // Enable both buttons when searching
    useEffect(() => {
        if (searchTerm) {
            setIsExpandDisabled(false);
            setIsCollapseDisabled(false);

            const expandedState: { [key: number]: boolean } = {};
            const filteredNodes = filterTree(treeData, searchTerm, expandedState);

            setExpandedNodes((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(expandedState)) {
                    return expandedState; // Update only if changed
                }
                return prev;
            });
        } else {
            setExpandedNodes((prev) => (Object.keys(prev).length ? {} : prev));
        }
    }, [searchTerm]);

    // Expand all nodes
    const expandAll = () => {
        setIsExpandDisabled(true);
        setIsCollapseDisabled(false);

        const newState: { [key: number]: boolean } = {};
        treeData.forEach((node) => expandRecursive(node, newState));
        setExpandedNodes(newState);
    };

    // Collapse all nodes
    const collapseAll = () => {
        setIsCollapseDisabled(true);
        setIsExpandDisabled(false);

        setExpandedNodes({});
    };

    // Recursive expand function
    const expandRecursive = (node: any, state: { [key: number]: boolean }) => {
        state[node.id] = true;
        node.children?.forEach((child: any) => expandRecursive(child, state));
    };

    // Toggle individual node expand/collapse
    const toggleExpand = (id: number) => {
        setExpandedNodes((prev) => {
            const newState = { ...prev, [id]: !prev[id] };
            return newState;
        });
    };

    // Filter function with auto-expand logic
    const filterTree = (nodes: any[], query: string, expandedState: { [key: number]: boolean }) => {
        if (!query) return nodes;

        return nodes
            .map((node) => {
                const match = node.name.toLowerCase().includes(query.toLowerCase());
                const filteredChildren = filterTree(node.children, query, expandedState);

                if (match || filteredChildren.length > 0) {
                    expandedState[node.id] = true; // Auto-expand matching nodes
                    return { ...node, children: filteredChildren };
                }
                return null;
            })
            .filter(Boolean);
    };

    // Get all nodes in the tree
    const getAllNodes = (node: any): any[] => {
        const children = node.children || [];
        return [node, ...children.flatMap((child: any) => getAllNodes(child))];
    };

    // Get full lineage for `data-ids`
    const getFullLineage = (node: any, parentIds: string = "") => {
        const currentIds = parentIds ? `${parentIds},${node.id}` : `${node.id}`;
        return {
            ...node,
            dataIds: currentIds,
            children: node.children.map((child: any) => getFullLineage(child, currentIds)),
        };
    };

    const itemSelect = (e: any) => {
        const textarea = e.target.closest("li")?.querySelector('textarea') as HTMLTextAreaElement;

        const dataId = e.target.closest("li").getAttribute("data-id") || "";
        const dataIds = e.target.closest("li").getAttribute("data-ids") || "";
        const selectedName = e.target.closest("li").querySelector("span")?.textContent || "";
        const arrDataIds = dataIds.split(",");

        let arrLocation = [] as string[];
        let arrHiddenData = [] as any[];
        arrDataIds.forEach((id) => {
            const getSpan = dialogRef.current.querySelector(`li[data-id="${id}"] span`) as HTMLElement;
            const textAreas = dialogRef.current.querySelectorAll(`li[data-id="${id}"] textarea[data-id="${id}"]`) as HTMLTextAreaElement;
            arrLocation.push(getSpan?.textContent || "");
            let arrHiddenDataItem = {} as any;
            textAreas.forEach((textarea: any) => {
                arrHiddenDataItem[textarea.name] = textarea.value;
            });
            arrHiddenData.push({ id: id, ...arrHiddenDataItem });
        });

        console.log(arrLocation.join(" / "));

        dialogRef.current.querySelector(".tree-footer span").setAttribute("selected-name", selectedName);
        dialogRef.current.querySelector(".tree-footer span").setAttribute("data-id", dataId);
        dialogRef.current.querySelector(".tree-footer span").textContent = arrLocation.join(" / ");
        dialogRef.current.querySelector(".tree-footer span").setAttribute("data-ids", dataIds);
        dialogRef.current.querySelector(".tree-hidden-data").value = JSON.stringify(arrHiddenData);
    };

    const handleCheckboxChange = (id: number, parentId: number | null) => {
        //console.log("treeData", treeData);
        /*setSelectedItems((prev) => {
            //console.log("Selected Items", prev);

            const newState = { ...prev };
            
            if (newState[id]) {
                console.log("Unselecting", id);
                // If already selected, unselect it
                delete newState[id];
            } else {
                console.log("Selecting", id);
                // If selecting, ensure only siblings under the same parent are selected                
                Object.keys(newState).forEach((key) => {
                    if (treeData.some(node => node.id === parseInt(key) && node.parentId === parentId)) {
                        console.log("Unselecting sibling", key);
                        delete newState[key]; // Unselect siblings

                        // Match the key to treeData and unselect all children use iteration
                        const node = treeData.find(node => node.id === parseInt(key));
                        if (node) {
                            const allNodes = getAllNodes(node);
                            allNodes.forEach((node) => {
                                delete newState[node.id];
                            });
                        }

                    } else {
                        console.log("Not a sibling", parseInt(key), parentId);

                        // const getKeyRoot = (id: number) => {
                        //     const node = treeData.find(node => node.id === id);
                        //     if (node && node.parentId) {
                        //         return getKeyRoot(node.parentId);
                        //     }
                        //     return id;
                        // }

                        // console.log("Root", getKeyRoot(id));

                        const isUnderParent = (id: number, parentId: number) => {
                            const node = treeData.find(node => node.id === id);
                            if (node) {
                                if (node.parentId === parentId) {
                                    return true;
                                } else {
                                    return isUnderParent(node.parentId, parentId);
                                }
                            }
                            return false;
                        }

                        // Match the key to treeData and unselect all children use iteration except main node
                        const node = treeData.find(node => node.id === parseInt(key));
                        if (node) {
                            const allNodes = getAllNodes(node);
                            allNodes.forEach((node) => {
                                if (node.id !== id && node.id !== parentId) {
                                    if (!isUnderParent(node.id, parentId || 0)) {
                                        delete newState[node.id];
                                    }
                                }
                            });
                        }
                    }
                });
                newState[id] = true;
            }
            
            return newState;
        });*/
    };    

    // Render tree recursively
    const renderTree = (nodes: any[], parentIds = "") => (
        <ul className="tree">
            {nodes.map((node) => {
                const enrichedNode = getFullLineage(node, parentIds);
                return (
                    <li key={enrichedNode.id} data-id={enrichedNode.id} data-ids={enrichedNode.dataIds}>
                        {enrichedNode.children.length > 0 ? (
                            <>
                                <button className="btn-face" onClick={() => toggleExpand(enrichedNode.id)}>
                                    {expandedNodes[enrichedNode.id] ? "▼" : "►"}
                                </button>{" "}

                                {multiSelect && (
                                    <input 
                                        className="tree-checkbox"
                                        type="checkbox" 
                                        checked={selectedItems[enrichedNode.id] || false} 
                                        onChange={() => handleCheckboxChange(enrichedNode.id, enrichedNode.parentId)} 
                                    />
                                )}

                                <div><span>{enrichedNode.name}</span> <button className="btn-face select" onClick={(e) => itemSelect(e)}> Select </button></div>
                                {/* Render hidden textareas */}
                                {Object.entries(enrichedNode.hiddenData || {}).map(([field, value]) => (
                                    <textarea
                                        data-id={enrichedNode.id}
                                        key={`${enrichedNode.id}-${field}`}
                                        name={field}
                                        defaultValue={typeof value === "object" ? JSON.stringify(value) : value}
                                        style={{ display: "none" }}
                                    />
                                ))}
                                {expandedNodes[enrichedNode.id] && renderTree(enrichedNode.children, enrichedNode.dataIds)}
                            </>
                        ) : (
                            <>

                                {multiSelect && (
                                    <input 
                                        className="tree-checkbox"
                                        type="checkbox" 
                                        checked={selectedItems[enrichedNode.id] || false} 
                                        onChange={() => handleCheckboxChange(enrichedNode.id, enrichedNode.parentId)} 
                                    />
                                )}

                                <div><span>{enrichedNode.name}</span> <button className="btn-face select" onClick={(e) => itemSelect(e)}> Select </button></div>
                                {/* Render hidden textareas */}
                                {Object.entries(enrichedNode.hiddenData || {}).map(([field, value]) => (
                                    <textarea
                                        key={`${enrichedNode.id}-${field}`}
                                        name={field}
                                        defaultValue={typeof value === "object" ? JSON.stringify(value) : value}
                                        style={{ display: "none" }}
                                    />
                                ))}
                            </>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    const treeViewClear = () => {

        setExpandedNodes({});
        setSearchTerm("");
        dialogRef.current.querySelector(".tree-footer span").textContent = "";

        const treeFooterSpan = dialogRef.current.querySelector(".tree-footer span") as HTMLElement;
        const treeHiddenData = dialogRef.current.querySelector(".tree-hidden-data") as HTMLTextAreaElement;
        treeFooterSpan.setAttribute("data-ids", "");
        treeFooterSpan.setAttribute("data-id", "");
        treeFooterSpan.setAttribute("selected-name", "");
        treeHiddenData.value = "";
    };
    
    const treeViewOpen = () => {
        dialogRef.current.showModal();
    };
    const treeViewDiscard = () => {
        dialogRef.current.close();
        treeViewClear();
    };
    const treeViewApply = () => {
        const treeFooterSpan = dialogRef.current.querySelector(".tree-footer span") as HTMLElement;
        const treeHiddenData = dialogRef.current.querySelector(".tree-hidden-data") as HTMLTextAreaElement;
        const selectedItems = {
            dataIds: treeFooterSpan.getAttribute("data-ids"),
            names: treeFooterSpan.textContent,
            selectedId: treeFooterSpan.getAttribute("data-id") || "",
            selectedName: treeFooterSpan.getAttribute("selected-name"),
            data: JSON.parse(treeHiddenData.value || "[]"),
        }

        if (selectedItems.selectedId === "") {
            alert("No item selected.");
            return;
        }

        onApply(dialogRef.current, selectedItems || {});

        treeViewClear();
        dialogRef.current.close();
    }

    const filteredTree = searchTerm ? filterTree(treeData, searchTerm, {}) : treeData;

    return (
        <>
            <dialog ref={dialogRef} className="dts-dialog tree-dialog">
                <div className="dts-dialog__content">
                    <div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
                        <h2 className="dts-heading-2" style={{marginBottom: "0px"}}>{caption}</h2>
                        <a type="button" aria-label="Close dialog" onClick={treeViewDiscard}>
                            <svg aria-hidden="true" focusable="false" role="img">
                                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
                            </svg>
                        </a>
                    </div>
                    <div>
                        <div>
                        <button
                                className="tree-btn"
                                onClick={expandAll}
                                disabled={isExpandDisabled}
                            >
                                Expand All
                            </button>
                            <button
                                className="tree-btn"
                                onClick={collapseAll}
                                disabled={isCollapseDisabled}
                            >
                                Collapse All
                            </button>
                            <input
                                className="tree-search input-normal"
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="dts-form__body">
                            <p className="tree" style={{ marginBottom: "1rem" }}>{rootCaption}</p>
                            {filteredTree.length > 0 ? renderTree(filteredTree) : <p className="tree">No results found.</p>}
                        </div>
                        <div className="tree-footer"><span></span><button className="tree-btn main-btn" onClick={treeViewApply}>Apply</button><button className="tree-btn main-btn" onClick={treeViewDiscard}>Discard</button></div>
                        <textarea className="tree-hidden-data" style={{display: "none"}}></textarea>
                    </div>
                </div>
            </dialog>
            <button onClick={treeViewOpen}>{caption}</button>
        </>
    );
};

export const buildTree = (
    list: any[],
    idKey: string,
    parentKey: string,
    nameKey: string,
    nameObj: string[] = ["en"], // Default priority order
    priorityKey?: string | null, // Make this explicitly optional
    additionalFields?: string[] // Array of field keys for hidden data
) => {
    const map = new Map();

    list.forEach((item) => {
        let nameOutput = "Unnamed";
        const nameValue = item[nameKey];

        if (typeof nameValue !== "object") {
            nameOutput = nameValue;
        } else {
            const validPriorityKey = typeof priorityKey === "string" && priorityKey.trim() !== "" ? priorityKey : null;
            let selectedKey = validPriorityKey;

            if (!selectedKey || !nameValue?.[selectedKey]) {
                selectedKey = Object.keys(nameValue)[0];
            }

            nameOutput = nameValue?.[selectedKey] || "Unnamed";
        }

        const hiddenData = {};
        if (additionalFields) {
            additionalFields.forEach((field) => {
                hiddenData[field] = item[field] || "";
            });
        }

        map.set(item[idKey], {
            id: item[idKey],
            parentId: item[parentKey] ?? null,
            name: nameOutput,
            children: [],
            hiddenData, // Add hidden fields to each node
        });
    });

    const tree = [];
    map.forEach((node) => {
        if (node.parentId === null) {
            tree.push(node);
        } else {
            const parent = map.get(node.parentId);
            if (parent) {
                parent.children.push(node);
            }
        }
    });

    return tree;
};
