import { HazardEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardEventById } from "~/backend.server/models/event";
import AuditLogHistory from "~/components/AuditLogHistory";
import { getTableName } from "drizzle-orm";
import { hazardEventTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/node";

interface LoaderData{
	item: any;
	isPublic: boolean;
	auditLogs: any[];
}

export const loader = async ({
	request,
	params,
	context
}: LoaderFunctionArgs): Promise<LoaderData> => {
	const { id } = params;

	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const loaderFunction =  createViewLoaderPublicApprovedWithAuditLog({
		getById: hazardEventById,
		recordId: id,
		tableName: getTableName(hazardEventTable),
	});

	const result = await loaderFunction({request, params, context});
	return {...result, auditLogs: result.auditLogs ?? []};
};

export default function Screen() {
	const { auditLogs } = useLoaderData<typeof loader>();
	return (
		<>
			<ViewScreenPublicApproved viewComponent={HazardEventView} />
			<br/>
			<h3>Audit Log History</h3>
			<AuditLogHistory auditLogs={auditLogs} />
		</>
	);
}
