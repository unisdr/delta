import { authLoader, authLoaderGetAuth } from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { TreeView, buildTree } from "~/components/TreeView";

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

export const loader = authLoader(async (loaderArgs) => {
	authLoaderGetAuth(loaderArgs);
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
											search={true}
										/>
									</div>
								</div>
							</form>
						</div>
					</section>
				) : (
					<SectorsTable sectors={sectors} />
				)}
			</>
		</MainContainer>
	);
}
