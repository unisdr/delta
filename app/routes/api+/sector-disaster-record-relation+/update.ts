import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form";
import {
	disRecSectorsUpdate,
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: disRecSectorsUpdate
	});

	return Response.json(saveRes)
});
