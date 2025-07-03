import {
	authLoaderApi,
	authActionApi,
	authActionGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

import { disasterRecordsCreate } from "~/backend.server/models/disaster_record";

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
	const createWithTenant = async (tx: any, fields: any) => {
		return disasterRecordsCreate(tx, fields, tenantContext);
	};

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant
	});

	return Response.json(saveRes)
});

