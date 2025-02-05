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
import { useLoaderData } from "@remix-run/react";
import AuditLogHistory from "~/components/AuditLogHistory";

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
	return {...result, auditLogs: result.auditLogs ?? []};
};


export default function Screen() {
	const { auditLogs } = useLoaderData<typeof loader>();
	return (
		<>
			<ViewScreenPublicApproved viewComponent={DisasterRecordsView} />
			<br/>
			<h3>Audit Log History</h3>
			<AuditLogHistory auditLogs={auditLogs} />
		</>
	);
}