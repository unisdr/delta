import { authLoader, authLoaderGetAuth } from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

// Tree Node Component
const TreeNode = ({ node }: { node: any }) => {
	const [expanded, setExpanded] = useState(false);

	return (
		<li>
			<div
				style={{ cursor: "pointer", userSelect: "none" }}
				onClick={() => setExpanded(!expanded)}
			>
				{node.children.length > 0 ? (
					<span>{expanded ? "▼ " : "▶ "}</span>
				) : (
					<span> </span>
				)}
				{node.sectorname}
			</div>
			{expanded && node.children.length > 0 && (
				<ul style={{ paddingLeft: "20px" }}>
					{node.children.map((child: any) => (
						<TreeNode key={child.id} node={child} />
					))}
				</ul>
			)}
		</li>
	);
};

// Table Component
const SectorsTable = ({ sectors }: { sectors: any[] }) => (
	<table className="dts-table">
		<thead>
			<tr>
				<th>ID</th>
				<th>Sector Name</th>
				<th>Parent ID</th>
				<th>Created At</th>
			</tr>
		</thead>
		<tbody>
			{sectors.map((sector) => (
				<tr key={sector.id}>
					<td>{sector.id}</td>
					<td>{sector.sectorname}</td>
					<td>{sector.parentId || "None"}</td>
					<td>{sector.createdAt.toLocaleString()}</td>
				</tr>
			))}
		</tbody>
	</table>
);

// Utility to Build Tree Structure
function buildTree(
	list: any[],
	idKey = "id",
	parentKey = "parentId",
	nameKey = "sectorname"
) {
	let map: Record<number, any> = {};
	let roots: any[] = [];

	list.forEach((item) => {
		map[item[idKey]] = { ...item, children: [] };
	});

	list.forEach((item) => {
		if (item[parentKey]) {
			map[item[parentKey]]?.children.push(map[item[idKey]]);
		} else {
			roots.push(map[item[idKey]]);
		}
	});

	return roots;
}

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	const sectors = await dr.select().from(sectorTable);
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "sectorname";

	const treeData = buildTree(sectors, idKey, parentKey, nameKey);

	return { sectors: sectors, treeData };
});

export default function SectorsPage() {
	const { sectors, treeData } = useLoaderData<typeof loader>();
	const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

	return (
		<MainContainer title="Sectors" headerExtra={<NavSettings />}>
			<>
				<div className="dts-page-intro">
					<button
						className="mg-button mg-button-secondary"
						onClick={() => setViewMode(viewMode === "tree" ? "table" : "tree")}
					>
						Switch to {viewMode === "tree" ? "Table" : "Tree"} View
					</button>
				</div>

				{viewMode === "tree" ? (
					<ul>
						{treeData.map((sector: any) => (
							<TreeNode key={sector.id} node={sector} />
						))}
					</ul>
				) : (
					<SectorsTable sectors={sectors} />
				)}
			</>
		</MainContainer>
	);
}
