import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId,
} from "~/backend.server/models/disaster_record";


import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (args) => {
	const data = await args.request.json();

	// Extract tenant context from user session
	const userSession = authActionGetAuth(args);
	if (!userSession) {
		return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
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

	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
		update: updateWithTenant,
		idByImportId: idByImportIdWithTenant,
	});

	return Response.json(saveRes)
});

