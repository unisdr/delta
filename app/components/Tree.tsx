import { useEffect, useState } from "react";

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
                position: relative;
            }

            p.tree,
            ul.tree,
            ul.tree ul {
                position: relative;
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
            ${appendCss}
        `,
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

// Define Props for Reusability
interface TreeProps {
	data: any[];
	rootCaption?: string;
}

// Tree Node Component (Handles Recursive Rendering)
const TreeNode = ({
	node,
	expandedNodes,
	toggleNode,
}: {
	node: any;
	expandedNodes: Record<number, boolean>;
	toggleNode: (id: number, expand: boolean) => void;
}) => {
	return (
		<li>
			<div
				style={{ cursor: "pointer", userSelect: "none" }}
				onClick={() => toggleNode(node.id, !expandedNodes[node.id])}
			>
				{node.children.length > 0 ? (
					<span>{expandedNodes[node.id] ? "▼ " : "▶ "}</span>
				) : (
					<span> </span>
				)}
				{node.sectorname}
			</div>
			{expandedNodes[node.id] && node.children.length > 0 && (
				<ul style={{ paddingLeft: "20px" }}>
					{node.children.map((child: any) => (
						<TreeNode
							key={child.id}
							node={child}
							expandedNodes={expandedNodes}
							toggleNode={toggleNode}
						/>
					))}
				</ul>
			)}
		</li>
	);
};

// Main Tree Component
export const Tree = ({ data, rootCaption = "Root" }: TreeProps) => {
	// Inject styles on component mount
	useEffect(() => {
		injectStyles();
	}, []);

	// State to track expanded nodes
	const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>(
		{}
	);

	// Function to toggle a node's expansion
	const toggleNode = (id: number, expand: boolean) => {
		setExpandedNodes((prev) => ({ ...prev, [id]: expand }));
	};

	// Expand all nodes
	const expandAll = () => {
		const expandState: Record<number, boolean> = {};
		const expandRecursive = (nodes: any[]) => {
			nodes.forEach((node) => {
				expandState[node.id] = true;
				if (node.children) {
					expandRecursive(node.children);
				}
			});
		};
		expandRecursive(data);
		setExpandedNodes(expandState);
	};

	// Collapse all nodes
	const collapseAll = () => {
		setExpandedNodes({});
	};

	return (
		<div>
			{/* Expand/Collapse Buttons */}
			<div style={{ marginBottom: "10px" }}>
				<button className="mg-button mg-button-primary" onClick={expandAll}>
					Expand All
				</button>
				<button
					className="mg-button mg-button-outline"
					onClick={collapseAll}
					style={{ marginLeft: "10px" }}
				>
					Collapse All
				</button>
			</div>

			<div className="dts-form__body">
				<p className="tree" style={{ marginBottom: "1rem" }}>
					{rootCaption}
				</p>
			</div>

			{/* Render Tree */}
			<ul className="tree">
				{data.map((node) => (
					<TreeNode
						key={node.id}
						node={node}
						expandedNodes={expandedNodes}
						toggleNode={toggleNode}
					/>
				))}
			</ul>
		</div>
	);
};
