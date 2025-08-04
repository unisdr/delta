import {authLoaderApi} from "~/util/auth";
import {saveHumanEffectsData} from "~/backend.server/handlers/human_effects";

import {
	authActionApi
} from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (actionArgs) => {
	const {request} = actionArgs
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if(!countryAccountsId){
		throw new Response ("Unauthorized access, no instance selected", {status:401});
	}
	let url = new URL(request.url)
	let recordId = url.searchParams.get("recordId") || ""
	const disasterRecord = await disasterRecordsById(recordId);
	if(!disasterRecord){
		throw new Response(`Disaster reocrd with id = ${recordId} not found`);
	}
	if(disasterRecord.countryAccountsId!== countryAccountsId){
		throw new Response(`Unauthorized access`, {status:401});
	}
	return await saveHumanEffectsData(request, recordId, countryAccountsId)
})

