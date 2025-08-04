import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
	devExample1Create,
	devExample1UpdateById,
	devExample1IdByImportId,
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: await fieldsDefApi(),
		create: devExample1Create,
		update: devExample1UpdateById,
		idByImportId: devExample1IdByImportId,
	});

	return Response.json(saveRes)
});

