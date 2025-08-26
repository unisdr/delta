import { authLoaderApi } from "~/util/auth";

import {
	DamagesFields,
	damagesIdByImportIdAndCountryAccountsId,
	fieldsDefApi,
} from "~/backend.server/models/damages";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import { damagesCreate, damagesUpdate } from "~/backend.server/models/damages";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { apiAuth } from "~/backend.server/models/api_key";
import { Damages } from "~/drizzle/schema";
import { FormInputDef } from "~/frontend/form";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

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

	let data: Damages[] = await args.request.json();

	const settings = await getInstanceSystemSettingsByCountryAccountId(
		countryAccountsId
	);
	let currencies: string[] = ["USD"];
	if (settings) {
		currencies = [settings.currencyCode];
	}
	let fieldsDef: FormInputDef<DamagesFields>[] = [
		...(await fieldsDefApi(currencies)),
	];
	const saveRes = await jsonUpsert({
		data,
		fieldsDef,
		create: damagesCreate,
		update: damagesUpdate,
		idByImportIdAndCountryAccountsId: damagesIdByImportIdAndCountryAccountsId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};
