import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import {
	jsonUpdate,
} from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

import { disasterRecordsUpdate } from "~/backend.server/models/disaster_record";

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

	// Create a wrapper function that includes tenant context
	const updateWithTenant = async (tx: any, id: string, fields: any) => {
		return disasterRecordsUpdate(tx, id, fields, tenantContext);
	};

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: updateWithTenant
	});
	return Response.json(saveRes)
});
