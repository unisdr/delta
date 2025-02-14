import {
	DisasterRecordsView,
} from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form";

import {
	ViewScreenPublicApproved
} from "~/frontend/form";
import {disasterRecordsById} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema";
import { getTableName } from "drizzle-orm";
import { LoaderFunctionArgs } from "@remix-run/node";

import { dr } from "~/db.server";
import { contentPickerConfig } from "./content-picker-config";

interface LoaderData{
	item: any;
	isPublic: boolean;
	auditLogs: any[];
}


export const loader = async ({
	request,
	params,
	context}: LoaderFunctionArgs): Promise<LoaderData> => {
	const { id } = params;
	if(!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const loaderFunction = createViewLoaderPublicApprovedWithAuditLog({
		getById: disasterRecordsById,
		recordId: id,
		tableName: getTableName(disasterRecordsTable),
	});

	const result = await loaderFunction({request, params, context}); 

	const cpDisplayName = await contentPickerConfig.selectedDisplay(dr, result.item.disasterEventId) ?? '';

	const extendedItem = { ...result.item, cpDisplayName };
	
	return {...result, item: extendedItem};
};


export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={DisasterRecordsView} />
		</>
	);
}