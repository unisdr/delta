import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";
import {disasterEventUpdate} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: disasterEventUpdate
	});

	return Response.json(saveRes)
});
