import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonCreate,
} from "~/backend.server/handlers/form";
import {
	devExample1Create,
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: devExample1Create
	});

	return Response.json(saveRes)
});

