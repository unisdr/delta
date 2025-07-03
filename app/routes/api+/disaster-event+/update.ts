import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form/form_api";
import { disasterEventUpdate } from "~/backend.server/models/event";

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
	const tenantContext = await getTenantContext(userSession);

	// Create wrapper function that includes tenant context
	const updateWithTenant = (tx: any, id: string, data: any) => {
		return disasterEventUpdate(tx, id, data, tenantContext);
	};

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: updateWithTenant
	});

	return Response.json(saveRes)
});
