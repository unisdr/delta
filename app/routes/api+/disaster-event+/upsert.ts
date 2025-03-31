import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";
import {
	disasterEventCreate,
	disasterEventUpdate,
	disasterEventIdByImportId
} from "~/backend.server/models/event";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: disasterEventCreate,
		update: disasterEventUpdate,
		idByImportId: disasterEventIdByImportId,
	});

	return Response.json(saveRes)
});

