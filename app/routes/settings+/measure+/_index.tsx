import {
	useLoaderData,
	Link,
} from "@remix-run/react";

import {
	measureTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {createPaginatedLoader} from "~/backend.server/handlers/view";

import {desc} from "drizzle-orm";
import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks} from "~/frontend/form"

import {
	route
} from "~/frontend/measure";

export const loader = createPaginatedLoader(
	measureTable,
	async (offsetLimit) => {
		return dr.query.measureTable.findMany({
			...offsetLimit,
			columns: {id: true, name: true},
			orderBy: [desc(measureTable.name)],
		});
	},
	[desc(measureTable.name)]
);

export default function Data() {
	let ld = useLoaderData<typeof loader>();
	let {items, pagination} = ld.data;

	return DataScreen({
		plural: "Measures",
		resourceName: "Measure",
		baseRoute: route,
		columns: ["ID", "Name", "Unit", "Actions"],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id}</Link>
				</td>
				<td>{item.name}</td>
				<td>
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}


