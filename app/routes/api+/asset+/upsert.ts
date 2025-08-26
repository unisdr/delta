import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	assetCreate,
	assetUpdate,
	fieldsDefApi,
  AssetFields,
  assetIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/asset";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectAsset } from "~/drizzle/schema";
import { FormInputDef } from "~/frontend/form";

export let loader = authLoaderApi(async () => {
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

	let data: SelectAsset[] = await args.request.json();
  data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
  let fieldsDef: FormInputDef<AssetFields>[] = [
      ...(await fieldsDefApi()),
      { key: "countryAccountsId", label: "", type: "text" },
    ];
	let saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDef,
		create: assetCreate,
		update: assetUpdate,
		idByImportIdAndCountryAccountsId: assetIdByImportIdAndCountryAccountsId,
    countryAccountsId: countryAccountsId,
	});
	return Response.json(saveRes);
};
