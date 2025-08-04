import {
	redirect,
} from "@remix-run/node";

import {
	authLoaderWithPerm,
} from "~/util/auth";
import { sessionCookie } from "~/util/session";
import { deleteUserCountryAccountsByUserIdAndCountryAccountsId, getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const session =  await sessionCookie().getSession(request.headers.get("Cookie"));
	const countryAccountsId = session.get("countryAccountsId")

	const userToDelete = await getUserCountryAccountsByUserIdAndCountryAccountsId(Number(id), countryAccountsId);

	if (!userToDelete) {
		throw new Response("User not found", { status: 404 });
	}

	await deleteUserCountryAccountsByUserIdAndCountryAccountsId(Number(id), countryAccountsId);

	return redirect(`/settings/access-mgmnt/`);
})
