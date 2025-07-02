import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	hazardousEventUpdate,
	hazardousEventIdByImportId,
	hazardousEventCreate,
	type HazardousEventFields
} from "~/backend.server/models/event";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"

import { getTenantContext } from "~/util/tenant";
import { Tx } from "~/db.server";
import { CreateResult, UpdateResult } from "~/backend.server/handlers/form/form";
import { sessionCookie } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

// Create wrapper functions for hazardousEventCreate and hazardousEventUpdate
// that adapt them to the interface expected by the CSV import handler

// Create a wrapper for hazardousEventCreate that uses a fixed tenant context
const createWrapper = async (tx: Tx, data: HazardousEventFields): Promise<CreateResult<HazardousEventFields>> => {
	// Get the session from the request
	const session = await sessionCookie().getSession();
	const user = session.get("user");
	if (!user) {
		return {
			ok: false,
			errors: {
				form: ["User not authenticated"],
				fields: {}
			}
		};
	}

	// Extract tenant context from user session
	const tenantContext = await getTenantContext(user);
	if (!tenantContext) {
		return {
			ok: false,
			errors: {
				form: ["Tenant context not found"],
				fields: {}
			}
		};
	}

	// Call the original function with tenant context
	return hazardousEventCreate(tx, data, tenantContext, user.id);
};

// Create a wrapper for hazardousEventUpdate that uses a fixed tenant context
const updateWrapper = async (tx: Tx, id: string, data: Partial<HazardousEventFields>): Promise<UpdateResult<HazardousEventFields>> => {
	// Get the session from the request
	const session = await sessionCookie().getSession();
	const user = session.get("user");
	if (!user) {
		return {
			ok: false,
			errors: {
				form: ["User not found in session"],
				fields: {}
			}
		};
	}

	// Extract tenant context from user session
	const tenantContext = await getTenantContext(user);
	if (!tenantContext) {
		return {
			ok: false,
			errors: {
				form: ["Tenant context not found"],
				fields: {}
			}
		};
	}

	// Call the original function with tenant context
	return hazardousEventUpdate(tx, id, data, tenantContext, user.id);
};

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: createWrapper,
	update: updateWrapper,
	idByImportId: hazardousEventIdByImportId,
})

export default createScreen({
	title: "Hazardous Events",
	apiBaseUrl: "/api/hazardous-event",
	listUrl: "/hazardous-event"
}) 
