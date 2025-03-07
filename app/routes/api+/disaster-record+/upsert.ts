import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId,
} from "~/backend.server/models/disaster_record";


import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: disasterRecordsCreate,
		update: disasterRecordsUpdate,
		idByImportId: disasterRecordsIdByImportId,
	});

	return Response.json(saveRes)
});

