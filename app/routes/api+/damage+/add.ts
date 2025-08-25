import {
	authLoaderApi,
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api"
import { damagesCreate } from "~/backend.server/models/damages"
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting"
import { apiAuth } from "~/backend.server/models/api_key"
import { ActionFunctionArgs } from "@remix-run/server-runtime"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	if (request.method !== "POST") {
		throw new Response("Method Not Allowed: Only POST requests are supported", {
			status: 405,
		});
	}

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}


	const data = await args.request.json()
	const settings = await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);

	let currencies : string[] =[];
	if(settings){
		currencies=[settings.currencyCode]
	}

	const saveRes = await jsonCreate({
		data,
		fieldsDef: await fieldsDefApi(currencies),
		create: damagesCreate
	})

	return Response.json(saveRes)
}


