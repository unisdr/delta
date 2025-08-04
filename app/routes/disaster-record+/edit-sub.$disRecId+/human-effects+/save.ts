import { authActionWithPerm, authLoaderWithPerm } from "~/util/auth";
import { saveHumanEffectsData } from "~/backend.server/handlers/human_effects";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST";
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authActionWithPerm("EditData", async (actionArgs) => {
		const { params } = actionArgs;
		let req = actionArgs.request;
		let recordId = params.disRecId || "";
		return await saveHumanEffectsData(req, recordId, countryAccountsId);
	})(args);
};
