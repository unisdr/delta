import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";

import {
	fieldsDefApi,
	nonecoLossesUpdate
} from "~/backend.server/models/noneco_losses";


export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: nonecoLossesUpdate
	});

	return Response.json(saveRes)
});
