import {
	redirect,
} from "@remix-run/node";

import { dr } from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	userTable
} from '~/drizzle/schema';

import {
	authLoaderWithRole,
} from "~/util/auth";

export const loader = authLoaderWithRole("EditUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	await dr
 	.delete(userTable)
 	.where(eq(userTable.id, Number(id)));
	return redirect(`/users`);
})
