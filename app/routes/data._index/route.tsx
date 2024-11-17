import {
	useLoaderData,
	Link
} from "@remix-run/react";

import {
	json
} from "@remix-run/node";

import {
	itemTable,
} from '~/drizzle/schema';


import {
	authLoaderWithRole,
} from "~/util/auth";

interface ItemRes {
	id: number
	field1: string
	field2: string
}

import { Pagination } from "~/components/pagination/view"
import { executeQueryForPagination } from "~/components/pagination/api.server"

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const { request } = loaderArgs;

	//const select = ["id", "field1", "field2"] as const;
	//const res = await executeQueryForPagination<Item,typeof select[number]>(request, itemTable, [...select], {})
	const select = {
		id: itemTable.id,
		field1: itemTable.field1,
		field2: itemTable.field2
	};
	const res = await executeQueryForPagination<ItemRes>(request, itemTable, select, null)

	return json({
		...res,
	})
});

export default function Data() {
		const ld = useLoaderData<typeof loader>();
	const { items } = ld

	const pagination = Pagination(ld.pagination)

	return (
		<div>
			<a href="/data/new">New</a>
			<table>
				<thead>
					<tr>
						<th>Field 1</th>
						<th>Field 2</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr key={index}>
							<td>
								<Link to={`/data/${item.id}`}>{item.field1}</Link>
							</td>
							<td>{item.field2}</td>
							<td>
								<Link to={`/data/${item.id}`}>View</Link>&nbsp;
								<Link to={`/data/edit/${item.id}`}>Edit</Link>&nbsp;
								<Link to={`/data/delete/${item.id}`}>Delete</Link>&nbsp;
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{pagination}

		</div>
	);
}

