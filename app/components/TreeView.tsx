import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { get } from "~/backend.server/models/human_effects";
import { Link } from "@remix-run/react";

const injectStyles = (appendCss?: string) => {
    const styleLayout = [
        `
            p.tree {
                margin-top: 2rem !important;
                margin-left: 4rem !important;
            }
            ul.tree {
                margin-left: 5rem !important;
                z-index: 1;
                position: none;
            }

            p.tree,
            ul.tree,
            ul.tree ul {
                position: none;
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

                color: #000;
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
                cursor: pointer;
            }
            .tree-btn.main-btn {
                padding: 4px 8px 4px 8px;
            }
            .tree-dialog .mg-button.mg-button-primary {
                margin-right: 1rem;
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
                margin-left: 0.5rem;
            }
            ul.tree li div {
                position: relative;
                display: inline-block;
                color: #000;
            }
            ul.tree li div:hover .btn-face.select {
                display: inline-block;
            }

            .tree-dialog {
                max-width: 50vw;
                max-width: none !important;
                max-height: none !important;
            }
            .tree-dialog .dts-form__body {
                position: relative;
                overflow: scroll;
                // height: 500px;
                border-bottom: 1px dotted #979797 !important;
            }
            .tree-footer {
                display: flex;  /* Enables flexbox */
                justify-content: space-between; /* Puts text on the left & button on the right */
                align-items: center; /* Vertically align items */
                width: 100%;
                padding-top: 1.5rem;
            }
            .tree-footer div {
                font-weight: bold;
                flex: 1; /* Allows it to take up available space */
                white-space: normal; /* Allows text wrapping */
            }
            .tree-footer div .selected {
                display: inline-flex; align-items: center; background: rgb(240, 240, 240); color: rgb(51, 51, 51); border-radius: 4px; padding: 4px 8px; margin: 2px; border: 1px solid rgb(204, 204, 204);
            }
            .tree-checkbox {
                margin-right: 0.5rem;
            }
            .tree-button-select {
                display: inline-block;
                background-color: buttonface;
                padding: 4px 8px 1px 8px;
                border: 1px solid #000;
                border-radius: 5px;
                white-space: nowrap;
            }

            .tree-btn {
                color: #000;
                text-decoration: none !important;
            }

            ${appendCss}
        `
    ];

    const styleId = "TreeView";

    // Check if the style is already in the document
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.type = "text/css";
        style.id = styleId; // Assign a unique ID
        style.innerHTML = styleLayout[0]; // Change index to switch between styles
        document.head.appendChild(style);
    }
};

interface TreeViewProps {
    treeData: any[];
    caption?: string;
    rootCaption?: string;
    targetObject?: any | null;
    base_path?: string;
    onApply?: (selectedItem: { [key: string]: any }) => void;
    onClose?: (() => void) | null;
    onRenderItemName?: (node: any) => any;
    multiSelect?: boolean;
    noSelect?: boolean;
    appendCss?: string;
    disableButtonSelect?: boolean;
    dialogMode?: boolean;
    search?: boolean;
    expanded?: boolean; 
    onItemClick?: ((e: any, dialogRefCurrent: any) => void) | undefined;
    defaultSelectedIds?: number[];
    itemLink?: string;
    expandByDefault?: boolean;
    showActionFooter?: boolean;
}

export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(({ treeData = [], caption = "", rootCaption = "Root", targetObject = null,  base_path = "", onApply = null, onClose = null, onRenderItemName = null, multiSelect = false, noSelect = false, appendCss = "", disableButtonSelect = false, dialogMode = true, search = true, expanded = false, onItemClick = undefined, defaultSelectedIds = [], itemLink = "", expandByDefault = false, showActionFooter = null }, ref: any) => {
    const expandedNodesRef = useRef<{ [key: number]: boolean }>({});
    const [expandedNodes, setExpandedNodes] = useState<{ [key: number]: boolean }>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [isExpandDisabled, setIsExpandDisabled] = useState(false);
    const [isCollapseDisabled, setIsCollapseDisabled] = useState(true); // Default to true

    //console.log('defaultSelectedIds:', defaultSelectedIds);

    const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>(
        Object.fromEntries(defaultSelectedIds.map((id) => [id, true]))
    );
    useEffect(() => {
        setCheckedItems((prev) => {
            const newCheckedItems = Object.fromEntries(defaultSelectedIds.map((id) => [id, true]));
    
            // Only update state if it's different from the current state
            if (JSON.stringify(prev) !== JSON.stringify(newCheckedItems)) {
                return newCheckedItems;
            }
            return prev; // Prevent unnecessary updates
        });
    }, [defaultSelectedIds]); // ✅ This avoids infinite re-renders

    const [selectedItems, setSelectedItems] = useState<{ [key: number]: boolean }>({});

    const dialogRef = useRef<any>(null);

    useEffect(() => {
        injectStyles(appendCss); // Inject CSS when component mounts
    }, []);

    // Update button states based on `expandedNodes`
    useEffect(() => {
        const allNodes = treeData.flatMap((node) => getAllNodes(node)); // Get all nodes in the tree
        const allExpanded = allNodes.every((node) => expandedNodesRef.current[node.id]);
        const anyExpanded = allNodes.some((node) => expandedNodesRef.current[node.id]);
    
        setIsExpandDisabled(allExpanded);
        setIsCollapseDisabled(!anyExpanded);
    }, [treeData]); // ✅ Removed `expandedNodes` to prevent extra re-renders
    

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
    
        treeData.forEach((node) => expandRecursive(node, expandedNodesRef.current));
        setExpandedNodes({ ...expandedNodesRef.current }); // ✅ Triggers re-render only once
    };
    
    const collapseAll = () => {
        setIsCollapseDisabled(true);
        setIsExpandDisabled(false);
        expandedNodesRef.current = {}; // ✅ Reset ref instead of triggering re-renders
        setExpandedNodes({}); // ✅ Triggers only one re-render
    };
    

    // Recursive expand function
    const expandRecursive = (node: any, state: { [key: number]: boolean }) => {
        state[node.id] = true;
        node.children?.forEach((child: any) => expandRecursive(child, state));
    };

    // Toggle individual node expand/collapse
    const toggleExpand = (e: any, id: number) => {
        e.preventDefault();
        expandedNodesRef.current[id] = !expandedNodesRef.current[id]; // ✅ Update ref directly
        setExpandedNodes({ ...expandedNodesRef.current }); // ✅ Triggers re-render only when needed
    };
    
    useEffect(() => {
        const preventFocusShift = (event: FocusEvent) => {
          if (dialogRef.current && event.target !== dialogRef.current) {
            event.preventDefault();
            dialogRef.current.focus();
          }
        };
      
        if (dialogRef.current) {
          dialogRef.current.addEventListener("focusin", preventFocusShift);
        }
      
        return () => {
          if (dialogRef.current) {
            dialogRef.current.removeEventListener("focusin", preventFocusShift);
          }
        };
      }, []);

    // Filter function with auto-expand logic
    const filterTree = (nodes: any[], query: string, expandedState: { [key: number]: boolean }): any[] => {
        if (!query) return nodes;

        return nodes
            .map((node: any): any | null  => {
                const match = node.name.toLowerCase().includes(query.toLowerCase());
                const filteredChildren = filterTree(node.children, query, expandedState) || [];

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
        e.preventDefault();

        const textarea = e.target.closest("li")?.querySelector('textarea') as HTMLTextAreaElement;

        const dataId = e.target.closest("li").getAttribute("data-id") || "";
        const dataIds = e.target.closest("li").getAttribute("data-ids") || "";
        const selectedName = e.target.closest("li").querySelector("span")?.textContent || "";
        const arrDataIds = dataIds.split(",");

        const dialogRefCurrent = dialogRef.current;
        if (dialogRefCurrent) {
            let arrLocation = [] as string[];
            let arrHiddenData = [] as any[];
            arrDataIds.forEach((id: any) => {
                const getSpan = dialogRefCurrent.querySelector(`li[data-id="${id}"] span`) as HTMLElement;
                const textAreas = dialogRefCurrent.querySelectorAll(`li[data-id="${id}"] textarea[data-id="${id}"]`) as NodeListOf<HTMLTextAreaElement>;
                arrLocation.push(getSpan?.textContent || "");
                let arrHiddenDataItem = {} as any;
                Array.from(textAreas).forEach((textarea) => {
                    arrHiddenDataItem[textarea.name] = textarea.value;
                });
                arrHiddenData.push({ id: id, ...arrHiddenDataItem });
            });

            const treeFooterSpan = dialogRefCurrent.querySelector(".tree-footer div") as HTMLElement;
            if (treeFooterSpan) {
                treeFooterSpan.setAttribute("selected-name", selectedName);
                treeFooterSpan.setAttribute("data-id", dataId);
                
                // Create the main container div
                const selectedDiv = document.createElement("div");
                selectedDiv.classList.add("selected");

                // Create the span that holds arrLocation
                const textSpan = document.createElement("span");
                textSpan.textContent = arrLocation.join(" / ");

                // Create the close (×) button
                const closeButton = document.createElement("span");
                closeButton.style.marginLeft = "5px";
                closeButton.style.cursor = "pointer";
                closeButton.style.color = "red";
                closeButton.textContent = "×";

                // Remove the entire selectedDiv when close button is clicked
                closeButton.addEventListener("click", () => {
                    const selectedContainer = selectedDiv.closest("div[selected-name]");
                
                    // Remove the selected div
                    selectedDiv.remove();
                
                    // If selectedContainer exists, clear its `data-ids`
                    if (selectedContainer) {
                        selectedContainer.setAttribute("data-id", "");
                        selectedContainer.setAttribute("data-ids", "");
                    }
                });
                

                // Append textSpan and closeButton inside selectedDiv
                selectedDiv.appendChild(textSpan);
                selectedDiv.appendChild(closeButton);

                // Clear previous content and append new div
                treeFooterSpan.innerHTML = "";
                treeFooterSpan.appendChild(selectedDiv);

                //treeFooterSpan.textContent = arrLocation.join(" / ");

                treeFooterSpan.setAttribute("data-ids", dataIds);
                const treeHiddenData = dialogRefCurrent.querySelector(".tree-hidden-data") as HTMLTextAreaElement;
                if (treeHiddenData) treeHiddenData.value = JSON.stringify(arrHiddenData);
            }
        }
    };
    
    const handleCheckboxChange = (e: any) => {
        e.preventDefault();


        setCheckedItems((prev) => {
            const newState = { ...prev, [e.target.closest("li").getAttribute("data-id")]: e.target.checked };
            return newState;
        });
    };
   
    const renderItemName = (node: any, parentIds: any) => {
        return onRenderItemName ? onRenderItemName(node) : {};
    };

    const renderItem = (node: any) => {
        let link = itemLink ? itemLink.replace("[id]", node.id) : "";
    
        return (
            <>
                {link ? (
                    <Link to={link}>
                        <span>{node.name}</span>
                    </Link>
                ) : (
                    <span>{node.name}</span>
                )}
            </>
        );
    };

    // Render tree recursively
    const renderTree = (nodes: any[], parentIds = "") => (
        <ul className="tree">
            {nodes.map((node) => {
                const enrichedNode = getFullLineage(node, parentIds);
                return (
                    <li key={enrichedNode.id} data-id={enrichedNode.id} data-ids={enrichedNode.ids} data-path={enrichedNode.path} data-has_children={enrichedNode.has_children}>
                        {enrichedNode.children.length > 0 ? (
                            <>
                                <button className="btn-face" onClick={(e) => toggleExpand(e, enrichedNode.id)}>
                                    {expandedNodes[enrichedNode.id] ? "▼" : "►"}
                                </button>{" "}

                                {multiSelect && (
                                    <input 
                                        className="tree-checkbox"
                                        type="checkbox"  
                                        onChange={(e) => handleCheckboxChange(e)}
                                        checked={checkedItems[enrichedNode.id] || false}
                                    />
                                )}

                                <div {...renderItemName(enrichedNode, parentIds)} onClick={treeViewClick}>
                                    {renderItem(enrichedNode)}
                                    {(!multiSelect && !noSelect) && (
                                        <button className="btn-face select" onClick={(e) => itemSelect(e)}> Select </button>
                                    )}
                                </div>
                                {/* Render hidden textareas */}
                                {Object.entries(enrichedNode.hiddenData || {}).map(([field, value]) => (
                                    <textarea
                                        data-id={enrichedNode.id}
                                        key={`${enrichedNode.id}-${field}`}
                                        name={field}
                                        defaultValue={value ? JSON.stringify(value) : ""}
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
                                        onChange={(e) => handleCheckboxChange(e)}
                                        checked={checkedItems[enrichedNode.id] || false}
                                    />
                                )}

                                <div {...renderItemName(enrichedNode, parentIds)} onClick={treeViewClick}>
                                    {renderItem(enrichedNode)}
                                    {(!multiSelect && !noSelect) && (
                                        <button className="btn-face select" onClick={(e) => itemSelect(e)}> Select </button>
                                    )}
                                </div>
                                {/* Render hidden textareas */}
                                {Object.entries(enrichedNode.hiddenData || {}).map(([field, value]) => (
                                    <textarea
                                        data-id={enrichedNode.id}
                                        key={`${enrichedNode.id}-${field}`}
                                        name={field}
                                        defaultValue={value ? JSON.stringify(value) : ""}
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

        const dialogCurrent = dialogRef.current;
        if (dialogCurrent) {
            const treeFooterSpan = dialogCurrent.querySelector(".tree-footer div") as HTMLElement;
            if (treeFooterSpan) {
                treeFooterSpan.textContent = "";
                treeFooterSpan.setAttribute("data-ids", "");
                treeFooterSpan.setAttribute("data-id", "");
                treeFooterSpan.setAttribute("selected-name", "");
            }
            const treeHiddenData = dialogCurrent.querySelector(".tree-hidden-data") as HTMLTextAreaElement;
            if (treeHiddenData) treeHiddenData.value = ""; 
        }

        const dtsFormBody = dialogCurrent?.querySelector(".dts-form__body") as HTMLElement | null;
        if (dtsFormBody) {
            dtsFormBody.style.height = "";
        }
    };
    
    const treeViewOpen = (e?: any) => {
        if (e) {
            e.preventDefault();
        }
        if (dialogRef.current) {
            if (dialogMode) dialogRef.current.showModal();

            setTimeout(() => {
              dialogRef.current?.focus();
            }, 10);

            let contHeight = [] as number[];
            contHeight[0] = (dialogRef.current.querySelector(".dts-dialog__content") as HTMLElement | null)?.offsetHeight || 0;
            contHeight[1] = (dialogRef.current.querySelector(".dts-dialog__header") as HTMLElement | null)?.offsetHeight || 0;
            contHeight[2] = (dialogRef.current.querySelector(".tree-filters") as HTMLElement | null)?.offsetHeight || 0;
            contHeight[3] = (dialogRef.current.querySelector(".tree-footer") as HTMLElement | null)?.offsetHeight || 0;
            let getHeight = contHeight[0] - contHeight[1] - contHeight[2] - contHeight[3] - 16;

            const dtsFormBody = dialogRef.current.querySelector(".dts-form__body") as HTMLElement | null;
            if (dtsFormBody) {
                dtsFormBody.style.height = `${window.innerHeight-getHeight}px`;
            }
        }
    };
    const treeViewDiscard = (e?: any) => {
        if (e) {
            e.preventDefault();
        }

        if (onClose) onClose();

        if (dialogRef.current)
            if (typeof dialogRef.current.close === "function") 
                dialogRef.current.close();
        
        treeViewClear();
    };
    const treeViewApply = (e?: any) => {
        if (e) {
            e.preventDefault();
        }

        if (dialogRef.current) {
            const treeFooterSpan = dialogRef.current.querySelector(".tree-footer div") as HTMLElement;
            const treeHiddenData = dialogRef.current.querySelector(".tree-hidden-data") as HTMLTextAreaElement;
            const treeFooterSpanSelectedName = treeFooterSpan.querySelector(".selected span") as HTMLElement;
            const selectedItems = {
                dataIds: treeFooterSpan.getAttribute("data-ids"),
                names: treeFooterSpanSelectedName?.textContent || "",
                selectedId: treeFooterSpan.getAttribute("data-id") || "",
                selectedName: treeFooterSpan.getAttribute("selected-name"),
                data: JSON.parse(treeHiddenData.value || "[]"),
            }

            if (selectedItems.selectedId === "") {
                alert("No item selected.");
                return;
            }

            if (onApply) onApply(selectedItems || {});

            treeViewClear();
            if (dialogMode) dialogRef.current.close();
        }
    }
    const treeViewClick = (e?: any) => {
        if (e) {
            e.preventDefault();
        }

        if (multiSelect) return

        if (typeof onItemClick === 'function') onItemClick(e, dialogRef?.current || null);

        // if (e.target.tagName === "BUTTON") {
        //     toggleExpand(e, parseInt(e.currentTarget.getAttribute("data-id")));
        // }
    }

    const findNamesByIds = (nodes: any[], checkedIds: any[]): { id: number, name: string }[] => {
        let selectedItems: { id: number, name: string }[] = [];
    
        const traverse = (node: any) => {
            if (checkedIds.includes(node.id)) {
                selectedItems.push({ id: node.id, name: node.name }); // Store both ID and name
            }
            if (node.children?.length) {
                node.children.forEach(traverse);
            }
        };
    
        nodes.forEach(traverse);
        return selectedItems; // Return array of { id, name }
    };     
    
    useImperativeHandle(ref, () => ({
        treeViewOpen,
        treeViewClose: treeViewDiscard,
        treeViewClear: treeViewClear,
        getCheckedItemIds: () => Object.keys(checkedItems)
        .filter((key) => checkedItems[Number(key)]) // Get only checked IDs
        .map(Number), // Convert keys back to numbers
        getCheckedItemNames: () => {
            const checkedIds = Object.keys(checkedItems)
                .filter((key) => checkedItems[Number(key)]) // Filter only checked items
                .map(Number);
        
            return findNamesByIds(treeData, checkedIds); // Now returns [{ id, name }, ...]
        },
        clearCheckedItems: () => setCheckedItems({}),
    }));

    const filteredTree = searchTerm ? filterTree(treeData, searchTerm, {}) : treeData;

    const treeViewContent = (noAction?: boolean) => {
        return (
            <div>
                <div className="tree-filters">
                    <a className="tree-btn" role="button" onClick={expandAll} style={{ pointerEvents: isExpandDisabled ? "none" : "auto", opacity: isExpandDisabled ? 0.5 : 1 }}>
                        Expand All
                    </a>
                    <a className="tree-btn" role="button" onClick={collapseAll} style={{ pointerEvents: isCollapseDisabled ? "none" : "auto", opacity: isCollapseDisabled ? 0.5 : 1 }}>
                        Collapse All
                    </a>
                    {search && <input
                        className="tree-search input-normal"
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />}
                </div>
                <div className="dts-form__body">
                    <p className="tree" style={{ marginBottom: "1rem" }}>{rootCaption}</p>
                    {filteredTree.length > 0 ? renderTree(filteredTree) : <p className="tree">No results found.</p>}
                </div>
                {
                    (noAction) && <>
                        <div className="tree-footer"><div></div><button className="mg-button mg-button-primary" onClick={treeViewApply}>Apply</button><button className="mg-button mg-button-outline" onClick={treeViewDiscard}>Discard</button></div>
                        <textarea className="tree-hidden-data" style={{display: "none"}}></textarea>
                    </>
                }
            </div>
        )
    }

    const findNodeById = (nodes: any[], id: number): any | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children?.length) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };    

// Prevent expandedNodes from resetting every checkbox update
useEffect(() => {
    Object.keys(checkedItems).forEach((id) => {
        if (checkedItems[Number(id)]) {
            let node = findNodeById(treeData, Number(id));
            while (node?.parentId) {
                expandedNodesRef.current[node.parentId] = true;
                node = findNodeById(treeData, node.parentId);
            }
        }
    });

    setExpandedNodes({ ...expandedNodesRef.current }); // ✅ Triggers minimal re-renders
}, [checkedItems, treeData]); // ✅ Removed `expanded` dependency to prevent unnecessary updates

useEffect(() => {
    if (expandByDefault) {
        const allExpandedNodes: { [key: number]: boolean } = {};
        treeData.forEach((node) => expandRecursive(node, allExpandedNodes));
        expandedNodesRef.current = allExpandedNodes;
        setExpandedNodes({ ...allExpandedNodes }); // ✅ Ensures a single re-render
    }
}, [expandByDefault, treeData]); // ✅ Runs when `treeData` or `expandByDefault` changes


    return (
        <>
            {(dialogMode) ? 
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
                        {treeViewContent(showActionFooter || true)}
                    </div>
                </dialog>
            : 
                <div ref={dialogRef}>{treeViewContent(showActionFooter || false)}</div>
            }
            {disableButtonSelect ? null : <button className="tree-button-select" onClick={treeViewOpen}>{caption}</button>}
        </>
    );
});

export const buildTree = (
    list: any[],
    idKey: string,
    parentKey: string,
    nameKey: string,
    nameObj: string[] = ["en"], // Default priority order
    priorityKey?: string | null, // Explicitly optional
    additionalFields?: string[], // Array of field keys for hidden data
    pickerConfig?: any | null
) => {
    const map = new Map();

    // Step 1: Convert list to a map and initialize tree nodes
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

        // Store additional hidden fields
        const hiddenData: Record<string, any> = {};
        if (additionalFields) {
            additionalFields.forEach((field) => {
                hiddenData[field] = item[field] || "";
            });
        }

        // Initialize node in map
        map.set(item[idKey], {
            id: item[idKey],
            parentId: item[parentKey] ?? null,
            name: nameOutput,
            children: [],
            has_children: false, // Default to false
            hiddenData,
            path: "",  // Path will be updated in the next step
            ids: "",   // Comma-separated IDs will be updated
        });
    });

    const tree: any[] = [];

    // Step 2: Build hierarchical structure
    map.forEach((node) => {
        if (node.parentId === null) {
            node.path = node.name;  // Root nodes start with their own name (No leading '/')
            node.ids = `${node.id}`;  // Root node ID
            tree.push(node);
        } else {
            const parent = map.get(node.parentId);
            if (parent) {
                parent.children.push(node);
                parent.has_children = true; // Mark parent as having children
            }
        }
    });

    // Step 3: Recursively traverse and set correct paths & IDs
    const setPathsAndIds = (node: any, parentPath: string, parentIds: string) => {
        node.path = parentPath ? `${parentPath} / ${node.name}` : node.name; // Spaces added around '/'
        node.ids = parentIds ? `${parentIds},${node.id}` : `${node.id}`; // Comma-separated hierarchy of IDs
        node.children.forEach((child: any) => setPathsAndIds(child, node.path, node.ids));
    };

    tree.forEach((rootNode) => setPathsAndIds(rootNode, "", "")); // Initialize paths & IDs from root

    return tree;
};