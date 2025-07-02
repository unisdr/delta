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
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";
import { disasterEventCreate } from "~/backend.server/models/event";

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
	const createWithTenant = (tx: any, data: any) => {
		return disasterEventCreate(tx, data, tenantContext);
	};

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant
	});

	return Response.json(saveRes)
});

