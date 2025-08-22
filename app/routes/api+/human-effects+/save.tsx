import { authLoaderApi, authActionApi } from "~/util/auth";
import { saveHumanEffectsData } from "~/backend.server/handlers/human_effects";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (actionArgs) => {
	const { request } = actionArgs;
	// Access apiKey from the extended args (it's added by the authActionApi wrapper)
	const apiKey = (actionArgs as any).apiKey;

	// Get country from API key instead of session
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("API key not associated with a country instance", { status: 401 });
	}

	let url = new URL(request.url);
	let recordId = url.searchParams.get("recordId") || "";
	if (!recordId) {
		throw new Response("Missing recordId parameter", { status: 400 });
	}

	const disasterRecord = await disasterRecordsById(recordId);
	if (!disasterRecord) {
		throw new Response(`Disaster record with id = ${recordId} not found`, { status: 404 });
	}

	if (disasterRecord.countryAccountsId !== countryAccountsId) {
		throw new Response(`Unauthorized access`, { status: 403 });
	}

	return await saveHumanEffectsData(request, recordId, countryAccountsId);
});