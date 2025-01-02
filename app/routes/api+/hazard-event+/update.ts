import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";
import {hazardEventUpdate} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: hazardEventUpdate
	});

	return Response.json(saveRes)
});
