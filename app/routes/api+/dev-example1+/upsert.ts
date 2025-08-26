import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	devExample1Create,
	devExample1UpdateById,
	fieldsDefApi,
	devExample1IdByImportIdAndCountryAccountsId,
	DevExample1Fields,
} from "~/backend.server/models/dev_example1";
import { FormInputDef } from "~/frontend/form";
import { SelectDevExample1 } from "~/drizzle/schema";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunctionArgs } from "@remix-run/server-runtime";

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

	let data: SelectDevExample1[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<DevExample1Fields>[] = [
		...(await fieldsDefApi()),
		{ key: "countryAccountsId", label: "", type: "text" },
	];

	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDef,
		create: devExample1Create,
		update: devExample1UpdateById,
		idByImportIdAndCountryAccountsId:
			devExample1IdByImportIdAndCountryAccountsId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};
