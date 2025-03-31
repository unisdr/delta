import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
	measureCreate,
	measureUpdate,
	measureIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/measure";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	let data = await args.request.json();
	let saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: measureCreate,
		update: measureUpdate,
		idByImportId: measureIdByImportId,
	});

	return Response.json(saveRes);
});

