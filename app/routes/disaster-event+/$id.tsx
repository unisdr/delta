import { disasterEventById, disasterEventBasicInfoById } from "~/backend.server/models/event";

import { DisasterEventView } from "~/frontend/events/disastereventform";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { getTableName } from "drizzle-orm";
import { disasterEventTable } from "~/drizzle/schema";
import { LoaderFunctionArgs } from "@remix-run/node";
import { optionalUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

import { dr } from "~/db.server";
import { sql } from "drizzle-orm";

interface LoaderData {
	item: any;
	isPublic: boolean;
	auditLogs?: any[];
	user?: any;
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
	let tenantContext = undefined;
	if (session) {
		tenantContext = await getTenantContext(session);
	}

	// Create wrapper functions with the expected signature
	const getByIdWithTenant = async (id: string) => {
		// Ensure tenant context is defined before passing it
		if (!tenantContext) {
			throw new Response("Unauthorized: Missing tenant context", { status: 401 });
		}
		return await disasterEventById(id, tenantContext);
	};

	const getByIdPublic = async (id: string) => {
		// For public access, use disasterEventBasicInfoById which supports optional tenant context
		const event = await disasterEventBasicInfoById(id);

		// If event is not found or not published, redirect to unauthorized page
		if (!event || event.approvalStatus !== "published") {
			// Create a URL object based on the current request URL
			const url = new URL(request.url);
			// Build the redirect URL using the same origin
			const redirectUrl = `${url.origin}/error/unauthorized?reason=content-not-published`;
			throw Response.redirect(redirectUrl, 302);
		}

		return event;
	};

	const loaderFunction = session ?
		createViewLoaderPublicApprovedWithAuditLog({
			getById: getByIdWithTenant,
			recordId: id,
			tableName: getTableName(disasterEventTable),
		}) :
		createViewLoaderPublicApproved({
			getById: getByIdPublic,
		});

	const result = await loaderFunction({ request, params, context });

	const disasterEvents = await dr.execute(sql`
	  SELECT 
		de.id,
		de.spatial_footprint AS event_spatial_footprint,
		de.name_global_or_regional,
		de.name_national,
		jsonb_agg(
		  jsonb_build_object(
			'id', dr.id,
			'spatial_footprint', (
			  SELECT jsonb_agg(
				CASE 
				  WHEN sf -> 'geojson' -> 'properties' ? 'division_id' THEN
					jsonb_set(
					  sf,
					  '{geojson,geometry}',
					  '{}'::jsonb,
					  true
					)
				  ELSE
					sf
				END
			  )
			  FROM jsonb_array_elements(dr.spatial_footprint) AS sf
			),
			'damages', COALESCE(damages.items, '[]'::jsonb),
			'losses', COALESCE(losses.items, '[]'::jsonb),
			'disruption', COALESCE(disruption.items, '[]'::jsonb)
		  )
		) AS disaster_records
	  FROM disaster_event de
	  LEFT JOIN disaster_records dr ON dr.disaster_event_id = de.id
  
	  -- Damages
	  LEFT JOIN LATERAL (
		SELECT jsonb_agg(jsonb_build_object(
		  'id', d.id,
		  'spatial_footprint', d.spatial_footprint
		)) AS items
		FROM damages d
		WHERE d.record_id = dr.id
	  ) damages ON true
  
	  -- Losses
	  LEFT JOIN LATERAL (
		SELECT jsonb_agg(jsonb_build_object(
		  'id', l.id,
		  'spatial_footprint', l.spatial_footprint
		)) AS items
		FROM losses l
		WHERE l.record_id = dr.id
	  ) losses ON true
  
	  -- Disruption
	  LEFT JOIN LATERAL (
		SELECT jsonb_agg(jsonb_build_object(
		  'id', di.id,
		  'spatial_footprint', di.spatial_footprint
		)) AS items
		FROM disruption di
		WHERE di.record_id = dr.id
	  ) disruption ON true
  
	  WHERE de.id = ${id}
	  -- Apply tenant filtering for authenticated users
	  ${tenantContext ? sql`AND de.country_accounts_id = ${tenantContext.countryAccountId}` : sql``}
  
	  GROUP BY 
		de.id, 
		de.spatial_footprint, 
		de.name_global_or_regional, 
		de.name_national;
	`);

	console.log('disasterEvents.rows', disasterEvents.rows);

	return {
		...result,
		item: {
			...result.item,
			spatialFootprintsDataSource: disasterEvents.rows, // 👈 injected into item
		},
	};
};

export default function Screen() {
	return (
		<>
			<ViewScreenPublicApproved viewComponent={DisasterEventView} />
		</>
	);
}
