import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi,
	nonecoLossesCreate
} from "~/backend.server/models/noneco_losses";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: nonecoLossesCreate
	});

	return Response.json(saveRes)
});

