
import {
	authLoaderWithRole
} from "~/util/auth";

import {Link} from "react-router-dom";

import {divisionTable} from "~/drizzle/schema";

import {
	useLoaderData,
} from "@remix-run/react";

import {dr} from "~/db.server";

import {
	eq,
} from "drizzle-orm";

import {Breadcrumb} from "~/components/division";

import {divisionBreadcrumb, DivisionBreadcrumbRow } from "~/backend.server/models/division";



export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const {id} = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}
	const res = await dr.select().from(divisionTable).where(eq(divisionTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", {status: 404});
	}

	const item = res[0];
	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (item.parentId) {
		breadcrumbs = await divisionBreadcrumb(["en"], item.parentId)
	}


	return {
		division: item,
		breadcrumbs: breadcrumbs,
	};

});



export default function Screen() {
	const {division, breadcrumbs} = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>Division Details</h1>
			<Link to={`/settings/geography/edit/${division.id}`}>Edit</Link>
			<p>ID: {division.id}</p>
			<Breadcrumb rows={breadcrumbs} linkLast={true}/>
			<p>Parent ID: {division.parentId || "-"}</p>
			<h2>Names:</h2>
			<ul>
				{Object.entries(division.name).map(([lang, name]) => (
					<li key={lang}>
						<strong>{lang}:</strong> {name || "N/A"}
					</li>
				))}
			</ul>
		</div>
	);
}
