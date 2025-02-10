import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form";

import {
	devExample1Create,
	devExample1Update,
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
		fieldsDef: fieldsDefApi,
		create: devExample1Create,
		update: devExample1Update,
		idByImportId: devExample1IdByImportId,
	});

	return Response.json(saveRes)
});

