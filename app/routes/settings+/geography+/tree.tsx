import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import { TreeView } from "~/frontend/treeview/view";

import {NavSettings} from "~/routes/settings/nav";
import {Link, useLoaderData} from "@remix-run/react";
import {divisionTable} from "~/drizzle/schema";
import {eq, isNotNull, isNull, sql} from "drizzle-orm";
import {dr} from '~/db.server';

import {executeQueryForPagination2} from "~/frontend/pagination/api.server"

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

	return {resultRows};
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
    
    console.log(loaderData.resultRows);

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
				<div className="mg-container">


					<TreeView jsonData={{a:1}}  />

					<hr />
					
                    TREE
                    <ul>
                        {loaderData.resultRows.map((row) => (
                        <li key={row.id}>
                            <strong>{row.id}</strong>:
                            &nbsp;
                            <span>Name: {row.name.ph ?? row.name.en ?? 'N/A'}</span>
                        </li>
                        ))}
                    </ul>
				</div>
			</section>
		</>
	);
}