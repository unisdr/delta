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
import { getUserFromSession } from "~/util/session";
import { getTenantContext } from "~/util/tenant";

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	// Get user session and tenant context
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const tenantContext = await getTenantContext(userSession);
	if (!tenantContext) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}

	// Verify the user belongs to the current tenant
	const userToDelete = await dr
		.select({ countryAccountsId: userTable.countryAccountsId })
		.from(userTable)
		.where(eq(userTable.id, Number(id)))
		.limit(1);

	if (!userToDelete || userToDelete.length === 0) {
		throw new Response("User not found", { status: 404 });
	}

	// Ensure user belongs to the same tenant
	if (userToDelete[0].countryAccountsId !== tenantContext.countryAccountId) {
		throw new Response("Unauthorized - Cannot delete users from other tenants", { status: 403 });
	}

	// Delete related sessions first
	await dr.delete(sessionTable).where(eq(sessionTable.userId, Number(id)));

	// Delete the user
	await dr.delete(userTable).where(eq(userTable.id, Number(id)));

	return redirect(`/settings/access-mgmnt/`);
})
