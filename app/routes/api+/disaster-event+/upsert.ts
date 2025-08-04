import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
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

	// Extract tenant context from session
	const userSession = authActionGetAuth(args);
	if (!userSession) {
		return Response.json({
			ok: false,
			errors: {
				form: ["Unauthorized: Missing or invalid session"]
			}
		}, { status: 401 });
	}

	// Create wrapper functions that include tenant context
	const createWithTenant = (tx: any, data: any) => {
		return disasterEventCreate(tx, data);
	};

	const updateWithTenant = (tx: any, id: string, data: any) => {
		return disasterEventUpdate(tx, id, data);
	};

	const idByImportIdWithTenant = (tx: any, importId: string) => {
		return disasterEventIdByImportId(tx, importId);
	};

	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
		update: updateWithTenant,
		idByImportId: idByImportIdWithTenant,
	});

	return Response.json(saveRes)
});

