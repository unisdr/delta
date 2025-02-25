import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import {NavSettings} from "~/routes/settings/nav";
import {Link, useLoaderData} from "@remix-run/react";
import {divisionTable} from "~/drizzle/schema";
import {eq, isNotNull, isNull, sql} from "drizzle-orm";
import {dr} from '~/db.server';

import {executeQueryForPagination2} from "~/frontend/pagination/api.server"

import { TreeView, buildTree } from "~/components/TreeView";
import "./style.css";

interface ItemRes {
	id: number
	hasChildren: boolean
	name: Record<string, string>
}

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {request} = loaderArgs;

	const url = new URL(request.url);
	const parentId = Number(url.searchParams.get("parent")) || null;

	const resultRows = await dr.select({
		id: divisionTable.id,
        parent_id: divisionTable.parentId,
		name: divisionTable.name,
	}).from(divisionTable)
    .where(isNull(divisionTable.parentId))
    .execute();

    //resultRows.forEach(row => { console.log(`ID: ${row.id}, Name: ${row.name}`); });
    //console.log(q1);

	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);

	const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

	return {treeData};
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
    
	const treeData = loaderData.treeData;
    //console.log(loaderData.treeData);

	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Geographic levels</h1>
					</div>
				</header>
				<NavSettings />
			</div>
			<section>
				<div className="mg-container tabs-container">
					<ul className="tabs">
						<li><Link to="/settings/geography/">Table View</Link></li>
						<li className="active"><Link to="/settings/geography/tree">Tree View</Link></li>
					</ul>
				</div>
			</section>
			<section>
				<div className="mg-container" style={{paddingTop: "2.5rem"}}>
					<TreeView
						treeData={treeData as any}
						rootCaption="Geographic levels"
						dialogMode={false}
						disableButtonSelect={true}
						noSelect={true}
						search={true}
						expanded={true}
						itemLink="/settings/geography/edit/[id]?view=tree"
						expandByDefault={true}
					/>
				</div>
			</section>
		</>
	);
}