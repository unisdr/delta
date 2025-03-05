import { disasterEventById } from "~/backend.server/models/event";

import { DisasterEventView } from "~/frontend/events/disastereventform";

import { createViewLoaderPublicApprovedWithAuditLog } from "~/backend.server/handlers/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { getTableName } from "drizzle-orm";
import { disasterEventTable } from "~/drizzle/schema";
import { LoaderFunctionArgs } from "@remix-run/node";

interface LoaderData {
	item: any;
	isPublic: boolean;
	auditLogs: any[];
}

export const loader = async ({
	request,
	params,
	context,
}: LoaderFunctionArgs): Promise<LoaderData> => {
	const { id } = params;
	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const loaderFunction = createViewLoaderPublicApprovedWithAuditLog({
		getById: disasterEventById,
		recordId: id,
		tableName: getTableName(disasterEventTable),
	});

	const result = await loaderFunction({ request, params, context });

	

	return { ...result };
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={DisasterEventView} />
		</>
	);
}
