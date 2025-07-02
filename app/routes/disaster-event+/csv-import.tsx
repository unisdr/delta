import {
	authLoaderWithPerm,
	authActionWithPerm,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";
import { Tx } from "~/db.server";
import { ActionFunctionArgs } from "@remix-run/node";

import {
	disasterEventCreate,
	disasterEventUpdate,
	disasterEventIdByImportId
} from "~/backend.server/models/event";


import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"


export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

export const action = authActionWithPerm("EditData", async (actionArgs: ActionFunctionArgs) => {
	// Extract tenant context from session
	const userSession = authActionGetAuth(actionArgs);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const tenantContext = await getTenantContext(userSession);

	// Create wrapper functions that include tenant context
	const createWithTenant = (tx: Tx, data: any) => {
		return disasterEventCreate(tx, data, tenantContext);
	};

	const updateWithTenant = (tx: Tx, id: string, data: any) => {
		return disasterEventUpdate(tx, id, data, tenantContext);
	};

	const idByImportIdWithTenant = (tx: Tx, importId: string) => {
		return disasterEventIdByImportId(tx, importId, tenantContext);
	};

	// Use createAction with our tenant-aware wrapper functions
	return createAction({
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
		update: updateWithTenant,
		idByImportId: idByImportIdWithTenant,
	})(actionArgs);
})

export default createScreen({
	title: "Disaster Events",
	apiBaseUrl: "/api/disaster-event",
	listUrl: "/disaster-event"
}) 
