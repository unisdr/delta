import { HazardEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardous_eventById } from "~/backend.server/models/event";
import { getTableName } from "drizzle-orm";
import { hazardous_eventTable } from "~/drizzle/schema";
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
		getById: hazardous_eventById,
		recordId: id,
		tableName: getTableName(hazardous_eventTable),
	});

	const result = await loaderFunction({request, params, context});
	return {...result};
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={HazardEventView} />
		</>
	);
}
