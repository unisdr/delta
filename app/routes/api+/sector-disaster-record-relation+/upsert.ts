import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
	disRecSectorsCreate,
	disRecSectorsUpdate,
	disRecSectorsIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: disRecSectorsCreate,
		update: disRecSectorsUpdate,
		idByImportId: disRecSectorsIdByImportId,
	});

	return Response.json(saveRes)
});

