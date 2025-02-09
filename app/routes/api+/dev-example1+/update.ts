import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";
import {
	fieldsDefApi,
	devExample1Update
} from "~/backend.server/models/dev_example1";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: devExample1Update
	});

	return Response.json(saveRes)
});
