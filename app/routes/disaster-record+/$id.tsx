import { DisasterRecordsView } from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { disasterRecordsById, disasterRecordsBasicInfoById } from "~/backend.server/models/disaster_record";
import {
	disasterRecordsTable,
	disruptionTable,
	lossesTable,
	damagesTable,
} from "~/drizzle/schema";
import { getTableName } from "drizzle-orm";
import { LoaderFunctionArgs } from "@remix-run/node";

import { dr } from "~/db.server";
import { contentPickerConfig } from "./content-picker-config";
import { sql, eq } from "drizzle-orm";
import { optionalUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

interface LoaderData {
	item: any;
	isPublic: boolean;
	auditLogs?: any[];
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

	// Check if user is logged in
	const session = await optionalUser(request);

	// Extract tenant context for authenticated users
	let tenantContext = null;
	if (session) {
		tenantContext = await getTenantContext(session);
	}

	// Create a wrapper function that includes tenant context
	const getByIdWithTenant = async (idStr: string) => {
		if (tenantContext) {
			return disasterRecordsById(idStr, tenantContext);
		} else {
			// For public access, use disasterRecordsBasicInfoById which only returns published records
			return disasterRecordsBasicInfoById(idStr);
		}
	};

	const loaderFunction = session
		? createViewLoaderPublicApprovedWithAuditLog({
			getById: getByIdWithTenant,
			recordId: id,
			tableName: getTableName(disasterRecordsTable),
		})
		: createViewLoaderPublicApproved({
			getById: getByIdWithTenant,
		});

	const result = await loaderFunction({ request, params, context });

	const cpDisplayName =
		(await contentPickerConfig.selectedDisplay(
			dr,
			result.item.disasterEventId
		)) ?? "";

	const disasterId = id;
	const disasterRecord = await dr
		.select({
			disaster_id: disasterRecordsTable.id,
			disaster_spatial_footprint: disasterRecordsTable.spatialFootprint,
			disruptions: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${disruptionTable.id},
              'spatial_footprint', ${disruptionTable.spatialFootprint}
            )
          ) FILTER (WHERE ${disruptionTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("disruptions"),
			losses: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${lossesTable.id},
              'spatial_footprint', ${lossesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${lossesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("losses"),
			damages: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${damagesTable.id},
              'spatial_footprint', ${damagesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${damagesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("damages"),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			disruptionTable,
			eq(disasterRecordsTable.id, disruptionTable.recordId)
		)
		.leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
		.leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
		.where(eq(disasterRecordsTable.id, disasterId))
		.groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

	const extendedItem = { ...result.item, cpDisplayName, disasterRecord };

	return { ...result, item: extendedItem };
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={DisasterRecordsView} />
		</>
	);
}
