import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";
import {
	fieldsDefApi,
	measureUpdate
} from "~/backend.server/models/measure";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	let data = await args.request.json();

	let saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: measureUpdate
	});

	return Response.json(saveRes);
});

