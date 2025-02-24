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
	hazardousEventUpdate,
	hazardousEventIdByImportId,
	hazardousEventCreate
} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: hazardousEventCreate,
		update: hazardousEventUpdate,
		idByImportId: hazardousEventIdByImportId,
	});

	return Response.json(saveRes)
});

