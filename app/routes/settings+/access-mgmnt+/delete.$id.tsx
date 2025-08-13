import {
	redirect,
} from "@remix-run/node";

import {
	authLoaderWithPerm,
} from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { deleteUserCountryAccountsByUserIdAndCountryAccountsId, getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const userToDelete = await getUserCountryAccountsByUserIdAndCountryAccountsId(id, countryAccountsId);

	if (!userToDelete) {
		throw new Response("User not found", { status: 404 });
	}

	await deleteUserCountryAccountsByUserIdAndCountryAccountsId(id, countryAccountsId);

	return redirect(`/settings/access-mgmnt/`);
})
