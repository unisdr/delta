import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi,
	nonecoLossesCreate,
	nonecoLossesUpdate,
	nonecoLossesIdByImportId,
} from "~/backend.server/models/noneco_losses";


export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: nonecoLossesCreate,
		update: nonecoLossesUpdate,
		idByImportId: nonecoLossesIdByImportId,
	});

	return Response.json(saveRes)
});

