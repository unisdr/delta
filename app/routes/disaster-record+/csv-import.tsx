import {
	authLoaderWithPerm,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId
} from "~/backend.server/models/disaster_record";

import {
	fieldsDefApi,
} from "~/frontend/disaster-record/form";

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"


export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

export const action = async (args: any) => {
	// Extract tenant context from user session
	const userSession = authActionGetAuth(args);
	if (!userSession) {
		return new Response("Authentication required", { status: 401 });
	}

	const tenantContext = await getTenantContext(userSession);

	// Create wrapper functions that include tenant context
	const createWithTenant = async (tx: any, fields: any) => {
		return disasterRecordsCreate(tx, fields, tenantContext);
	};

	const updateWithTenant = async (tx: any, id: string, fields: any) => {
		return disasterRecordsUpdate(tx, id, fields, tenantContext);
	};

	const idByImportIdWithTenant = async (tx: any, importId: string) => {
		return disasterRecordsIdByImportId(tx, importId, tenantContext);
	};

	// Use the createAction function with our tenant-aware wrappers
	const actionHandler = createAction({
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
		update: updateWithTenant,
		idByImportId: idByImportIdWithTenant,
	});

	return actionHandler(args);
}

export default createScreen({
	title: "Disaster Events",
	apiBaseUrl: "/api/disaster-record",
	listUrl: "/disaster-record"
}) 
