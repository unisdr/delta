import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonCreate,
} from "~/backend.server/handlers/form";
import {
	disRecSectorsCreate,
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: disRecSectorsCreate
	});

	return Response.json(saveRes)
});

