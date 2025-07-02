import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";
import {hazardousEventCreate, HazardousEventFields} from "~/backend.server/models/event";
import { getTenantContext } from "~/util/tenant";
import { Tx } from "~/db.server";
import { SaveResult } from "~/backend.server/handlers/form/form";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();
	
	// Extract user session from API request
	const userSession = authActionGetAuth(args);
	
	// Create a wrapper function that extracts tenant context and passes it to hazardousEventCreate
	const createWithTenant = async (tx: Tx, fields: HazardousEventFields): Promise<SaveResult<HazardousEventFields>> => {
		try {
			// Extract tenant context from user session
			const tenantContext = await getTenantContext(userSession);
			
			// Call the original function with tenant context
			return hazardousEventCreate(tx, fields, tenantContext, userSession.user.id);
		} catch (error) {
			console.error("Failed to extract tenant context:", error);
			return {
				ok: false,
				errors: {
					form: ["Failed to initialize tenant context. User may not be associated with a tenant."],
					fields: {}
				}
			};
		}
	};

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
	});

	return Response.json(saveRes)
});

