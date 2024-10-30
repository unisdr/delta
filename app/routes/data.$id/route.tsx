import { dr } from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	itemTable
} from '~/drizzle/schema';

import {
	json
} from "@remix-run/node";

import {
		useLoaderData,
		Link
} from "@remix-run/react";


import {
	authLoaderWithRole,
} from "~/util/auth";

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const res = await dr.select().from(itemTable).where(eq(itemTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];
	return json({
		item: {
			id: item.id,
			field1: item.field1,
			field2: item.field2,
		},
	});
})


export default function Data() {
	const {item} = useLoaderData<typeof loader>();
	return (
		<div>
			<Link to={`/data/edit/${item.id}`}>Edit</Link>
			<p>ID: {item.id}</p>
			<p>Field1: {item.field1}</p>
			<p>Field2: {item.field2}</p>
		</div>
	);
}


