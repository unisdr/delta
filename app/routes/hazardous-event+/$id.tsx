import { HazardousEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardousEventById } from "~/backend.server/models/event";
import { getTableName } from "drizzle-orm";
import { hazardousEventTable } from "~/drizzle/schema";
import { LoaderFunctionArgs } from "@remix-run/node";
import { optionalUser } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

interface LoaderData {
	item: any;
	isPublic: boolean;
	auditLogs?: any[];
	user?: any;
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
	
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	
	const userSession = await optionalUser(request);
	const loaderFunction = userSession ? 
	createViewLoaderPublicApprovedWithAuditLog({
		getById: hazardousEventById,
		recordId: id,
		tableName: getTableName(hazardousEventTable),
	}) :
	createViewLoaderPublicApproved({
		getById: hazardousEventById,
	});
	
	const result = await loaderFunction({request, params, context});
	if(result.item.countryAccountsId!== countryAccountsId){
		throw new Response("Unauthorized access", { status: 401 });
	}
	return {...result};
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={HazardousEventView} />
		</>
	);
}
