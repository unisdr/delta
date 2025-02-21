import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form";
import {
	hazardous_eventUpdate,
	hazardous_eventIdByImportId,
	hazardous_eventCreate
} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: hazardous_eventCreate,
		update: hazardous_eventUpdate,
		idByImportId: hazardous_eventIdByImportId,
	});

	return Response.json(saveRes)
});

