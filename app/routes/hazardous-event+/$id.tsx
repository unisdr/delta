import { HazardousEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardousEventById, hazardousEventBasicInfoById } from "~/backend.server/models/event";
import { getTableName } from "drizzle-orm";
import { hazardousEventTable } from "~/drizzle/schema";
import { LoaderFunctionArgs } from "@remix-run/node";
import { optionalUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

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

	// Get user session
	const session = await optionalUser(request);

	// Create a tenant-aware getById function
	const getByIdWithTenant = async (id: string) => {
		if (!session) {
			// For public access, use hazardousEventBasicInfoById which accepts optional tenant context
			const event = await hazardousEventBasicInfoById(id);

			// If event is not found or not published, redirect to unauthorized page
			if (!event || event.approvalStatus !== "published") {
				// Create a URL object based on the current request URL
				const url = new URL(request.url);
				// Build the redirect URL using the same origin
				const redirectUrl = `${url.origin}/error/unauthorized?reason=content-not-published`;
				throw Response.redirect(redirectUrl, 302);
			}

			return event;
		}

		try {
			// For authenticated users, include tenant context
			// session is already a valid UserSession object from optionalUser
			const tenantContext = await getTenantContext(session);
			return hazardousEventById(id, tenantContext);
		} catch (error) {
			console.error("Failed to get tenant context:", error);
			throw new Response("Failed to initialize tenant context", { status: 500 });
		}
	};

	// Use the appropriate loader based on authentication
	const loaderFunction = session ?
		createViewLoaderPublicApprovedWithAuditLog({
			getById: getByIdWithTenant,
			recordId: id,
			tableName: getTableName(hazardousEventTable),
		}) :
		createViewLoaderPublicApproved({
			getById: getByIdWithTenant,
		});

	try {
		const result = await loaderFunction({ request, params, context });
		return {
			...result,
			user: session?.user,
		};
	} catch (error) {
		console.error("Error in hazardous event loader:", error);
		throw error;
	}
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={HazardousEventView} />
		</>
	);
}
