import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

import {disasterRecordsCreate} from "~/backend.server/models/disaster_record";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: disasterRecordsCreate
	});

	return Response.json(saveRes)
});

