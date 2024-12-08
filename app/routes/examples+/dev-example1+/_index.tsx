import {
	useLoaderData,
	Link,
} from "@remix-run/react";

import {
	devExample1Table,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {createPaginatedLoader} from "~/backend.server/handlers/view";

import {desc} from "drizzle-orm";
import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks} from "~/frontend/form"

import {
	route
} from "~/frontend/dev_example1";

export const loader = createPaginatedLoader(
	devExample1Table,
	async (offsetLimit) => {
		return dr.query.devExample1Table.findMany({
			...offsetLimit,
			columns: {id: true, field1: true},
			orderBy: [desc(devExample1Table.field1)],
		});
	},
	[desc(devExample1Table.field1)]
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const {items, pagination} = ld.data;

	return DataScreen({
		resourceName: "Dev Example 1",
		baseRoute: route,
		columns: ["ID", "Field 1", "Actions"],
		items: items,
		paginationData: pagination,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id}</Link>
				</td>
				<td>{item.field1}</td>
				<td>
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}

