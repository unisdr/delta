import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";

import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

import {disasterRecordsUpdate} from "~/backend.server/models/disaster_record";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: disasterRecordsUpdate
	});
	return Response.json(saveRes)
});
