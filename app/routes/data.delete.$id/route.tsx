import { dr } from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	itemTable
} from '~/drizzle/schema';

import {
	redirect,
} from "@remix-run/node";

import {
	authLoaderWithRole,
} from "~/util/auth";

export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	await dr
		.delete(itemTable)
		.where(eq(itemTable.id, Number(id)));
	return redirect(`/data`);
})

