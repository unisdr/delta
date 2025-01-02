import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	jsonCreate,
} from "~/backend.server/handlers/form";
import {disasterEventCreate} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: disasterEventCreate
	});

	return Response.json(saveRes)
});

