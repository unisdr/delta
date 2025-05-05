import { authLoader, authLoaderGetAuth } from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { TreeView, buildTree } from "~/components/TreeView";
import { aliasedTable, eq } from "drizzle-orm";

const renderContent = (level: number) => {
	switch (level) {
		case 1:
			return "Type";
		case 2:
			return "Sector";
		case 3:
			return "Sub-sector";
		case 4:
			return "Category";
		default:
			return " - ";
	}
};

// Table Component
const SectorsTable = ({ sectors }: { sectors: any[] }) => (
	<table className="dts-table">
		<thead>
			<tr>
				<th>ID</th>
				<th>Sector Name</th>
				<th>Grouping</th>
				<th>Description</th>
				<th>Parent</th>
				<th>Created At</th>
			</tr>
		</thead>
		<tbody>
			{sectors.map((sector) => (
				<tr key={sector.id}>
					<td>{sector.id}</td>
					<td>{sector.sectorname}</td>
					<td>{renderContent(sector.level)}</td>
					<td
						// Replace newline characters with <br/> tags
						dangerouslySetInnerHTML={{
							__html: sector.description?.replace(/(\r\n|\r|\n)/g, "<br/>"),
						}}
					/>
					<td>
						{sector.parentId
							? `${sector.parentName} (ID: ${sector.parentId})`
							: "None"}
					</td>
					<td>{sector.createdAt.toLocaleString()}</td>
				</tr>
			))}
		</tbody>
	</table>
);

export const loader = authLoader(async (loaderArgs) => {
	authLoaderGetAuth(loaderArgs);

	const parent = aliasedTable(sectorTable, "parent");
	const sectors = await dr
		.select({
			id: sectorTable.id,
			sectorname: sectorTable.sectorname,
			level: sectorTable.level,
			description: sectorTable.description,
			parentId: sectorTable.parentId,
			createdAt: sectorTable.createdAt,
			parentName: parent.sectorname,
		})
		.from(sectorTable)
		.leftJoin(parent, eq(parent.id, sectorTable.parentId))
		.orderBy(sectorTable.id);

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
				<section className="dts-page-section">
					<h2 className="mg-u-sr-only" id="tablist01">
						Tablist title
					</h2>
					<ul
						className="dts-tablist"
						role="tablist"
						aria-labelledby="tablist01"
					>
						<li role="presentation">
							<button
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab01"
								aria-selected={viewMode === "tree" ? true : false}
								aria-controls="tabpanel01"
								tabIndex={viewMode === "tree" ? 0 : -1}
								onClick={() => setViewMode("tree")}
							>
								<span>Tree View</span>
							</button>
						</li>
						<li role="presentation">
							<button
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab02"
								aria-selected={viewMode === "table" ? true : false}
								aria-controls="tabpanel02"
								tabIndex={viewMode === "table" ? 0 : -1}
								onClick={() => setViewMode("table")}
							>
								<span>Table View</span>
							</button>
						</li>
					</ul>
					<div
						className={
							viewMode === "tree"
								? "dts-tablist__panel"
								: "dts-tablist__panel hidden"
						}
						id="tabpanel101"
						role="tabpanel"
						aria-labelledby="tab01"
					>
						<div className="dts-placeholder">
							<form>
								<div className="fields">
									<div className="form-field">
										<TreeView
											treeData={treeData as any}
											rootCaption="Sectors"
											dialogMode={false}
											disableButtonSelect={true}
											noSelect={true}
											search={true}
											expanded={true}
										/>
									</div>
								</div>
							</form>
						</div>
					</div>
					<div
						className={
							viewMode === "table"
								? "dts-tablist__panel"
								: "dts-tablist__panel hidden"
						}
						id="tabpanel102"
						role="tabpanel"
						aria-labelledby="tab02"
					>
						<SectorsTable sectors={sectors} />
					</div>
				</section>
			</>
		</MainContainer>
	);
}
