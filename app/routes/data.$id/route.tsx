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

import {
	getItemNumberId
} from "~/backend.server/components/view"

interface ItemRes {
	id: number
	field1: string
	field2: string
}

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItemNumberId(params, dr.select({
		id: itemTable.id,
		field1: itemTable.field1,
		field2: itemTable.field2,
	}).from(itemTable), itemTable) as ItemRes
	return {
		item: {
			id: item.id,
			field1: item.field1,
			field2: item.field2,
		},
	};
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


