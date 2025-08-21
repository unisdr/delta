import { authLoaderApi } from "~/util/auth";
import { saveHumanEffectsData } from "~/backend.server/handlers/human_effects";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";
import { apiAuth } from "~/backend.server/models/api_key";
import type { ActionFunctionArgs } from "@remix-run/node";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

// Use API key authentication instead of session-based authentication
export const action = async ({ request }: ActionFunctionArgs) => {
	// First authenticate using API key
	const apiKey = await apiAuth(request);

	// Get record ID from URL
	let url = new URL(request.url);
	let recordId = url.searchParams.get("recordId") || "";
	if (!recordId) {
		throw new Response("Missing recordId parameter", { status: 400 });
	}

	// Validate disaster record exists
	const disasterRecord = await disasterRecordsById(recordId);
	if (!disasterRecord) {
		throw new Response(`Disaster record with id = ${recordId} not found`, { status: 404 });
	}

	// Use the API key's country accounts ID
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("API key not associated with a country instance", { status: 401 });
	}

	// Verify the disaster record belongs to the API key's country
	if (disasterRecord.countryAccountsId !== countryAccountsId) {
		throw new Response(`Unauthorized access: API key not authorized for this disaster record`, { status: 403 });
	}

	// Process the human effects data
	return await saveHumanEffectsData(request, recordId, countryAccountsId);
}

