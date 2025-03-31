import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";
import {
	measureCreate,
	fieldsDefApi
} from "~/backend.server/models/measure";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	let data = await args.request.json();

	let saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: measureCreate
	});

	return Response.json(saveRes)
});

