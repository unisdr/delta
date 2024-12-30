import {
	redirect,
} from "@remix-run/node";

import { dr } from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	userTable,
	sessionTable
} from '~/drizzle/schema';

import {
	authLoaderWithPerm,
} from "~/util/auth";

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	//await dr
 	//.delete(userTable)
 	//.where(eq(userTable.id, Number(id)));

	// Delete related sessions first
    await dr.delete(sessionTable).where(eq(sessionTable.userId, Number(id)));

    // Delete the user
    await dr.delete(userTable).where(eq(userTable.id, Number(id)));
	
	return redirect(`/settings/access-mgmnt/`);
})
