import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	disRecSectorsCreate,
	disRecSectorsUpdate,
	fieldsDefApi,
	disRecSectorsIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/disaster_record__sectors";
import { SelectSectorDisasterRecordsRelation } from "~/drizzle/schema";
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

	const data: SelectSectorDisasterRecordsRelation[] = await args.request.json();

	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: disRecSectorsCreate,
		update: disRecSectorsUpdate,
		idByImportIdAndCountryAccountsId:
			disRecSectorsIdByImportIdAndCountryAccountsId,
		countryAccountsId: countryAccountsId,
	});

	return Response.json(saveRes);
};
