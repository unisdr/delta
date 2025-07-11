// Import necessary modules
import {
	disasterEventById,
	disasterEventCreate,
	DisasterEventFields,
	disasterEventUpdate,
} from "~/backend.server/models/event";
import { getTenantContext } from "~/util/tenant";

import {
	fieldsDef,
	DisasterEventForm,
} from "~/frontend/events/disastereventform";

import { formSave } from "~/backend.server/handlers/form/form";

import { formScreen } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { useLoaderData } from "@remix-run/react";

import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm
} from "~/util/auth";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

// Helper function to get country ISO3 code
async function getCountryIso3(request: Request): Promise<string> {
	const settings = await getCountrySettingsFromSession(request);
	return settings?.dtsInstanceCtryIso3 || "";
}

// Helper function to get division GeoJSON data filtered by tenant context
async function getDivisionGeoJSON(tenantContext: any) {
	// Filter top-level divisions by tenant context
	return dr.execute(sql`
		SELECT id, name, geojson, import_id
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) 
		AND geojson IS NOT NULL
		AND country_accounts_id = ${tenantContext.countryAccountId};
    `);
}

// export const loader = createLoader({
// 	getById: disasterEventById,
// });

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const userSession = authActionGetAuth(actionArgs);

	// Extract tenant context for secure updates
	const tenantContext = await getTenantContext(userSession);

	// Keep existing formSave structure and logic
	return formSave({
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			if (id) {
				// Pass tenant context instead of userSession for data isolation
				return disasterEventUpdate(tx, id, data, tenantContext);
			} else {
				// Pass tenant context for create as well
				return disasterEventCreate(tx, data, tenantContext);
			}
		},
		redirectTo: (id: string) => route + "/" + id,
	});
});

import { getItem2 } from "~/backend.server/handlers/view";
import { getCountrySettingsFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params } = loaderArgs;
	const userSession = (loaderArgs as any).userSession;

	// Extract tenant context for secure data access
	const tenantContext = await getTenantContext(userSession);
	const ctryIso3 = await getCountryIso3(loaderArgs.request);

	// Handle 'new' case without DB query
	if (params.id === "new") {
		// Define Keys Mapping
		const idKey = "id";
		const parentKey = "parentId";
		const nameKey = "name";

		// Filter divisions by tenant context for security
		const rawData = await dr
			.select()
			.from(divisionTable)
			.where(sql`country_accounts_id = ${tenantContext.countryAccountId}`);

		const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", [
			"geojson",
			"importId",
			"nationalId",
			"level",
			"name",
		]);

		// Use tenant's ISO3 from tenant context
		const ctryIso3 = tenantContext.iso3;

		// Get division GeoJSON filtered by tenant context
		const divisionGeoJSON = await getDivisionGeoJSON(tenantContext);

		return {
			item: null, // No existing item for new disaster event
			hip: await dataForHazardPicker(),
			treeData: treeData,
			ctryIso3: ctryIso3,
			divisionGeoJSON: divisionGeoJSON?.rows || [],
			user: authLoaderGetUserForFrontend(loaderArgs)
		};
	}

	// For existing items, fetch the disaster event
	const getDisasterEvent = async (id: string) => {
		// Pass tenant context for data isolation
		return disasterEventById(id, tenantContext.countryAccountId);
	};

	let item = null;
	try {
		item = await getItem2(params, getDisasterEvent);
	} catch (error) {
		// If item not found, return 404
		if (error instanceof Response && error.status === 404) {
			throw new Response("Disaster event not found", { status: 404 });
		}
		// Re-throw other errors
		throw error;
	}

	// Fetch division data & build tree
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	// Filter divisions by tenant context for security
	const rawData = await dr
		.select()
		.from(divisionTable)
		.where(sql`country_accounts_id = ${tenantContext.countryAccountId}`);

	const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", ["geojson", "importId", "nationalId", "level", "name"]);

	// Get hazard picker data
	const hip = await dataForHazardPicker();

	// Get division GeoJSON data
	const divisionGeoJSON = await getDivisionGeoJSON(tenantContext);

	return {
		item,
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON?.rows || [],
		user: authLoaderGetUserForFrontend(loaderArgs)
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let fieldsInitial: Partial<DisasterEventFields> = ld.item
		? {
			...ld.item,
		}
		: {};

	// Fix the hazardousEvent to include missing HIP properties with complete structure
	const fixedHazardousEvent = ld.item?.hazardousEvent ? {
		...ld.item.hazardousEvent,
		hipHazard: {
			id: "",
			code: "",
			clusterId: "",
			nameEn: "",
			descriptionEn: ""
		},
		hipCluster: {
			id: "",
			nameEn: "",
			typeId: ""
		},
		hipType: {
			id: "",
			nameEn: ""
		},
	} : null;

	return formScreen({
		extraData: {
			hip: ld.hip,
			hazardousEvent: fixedHazardousEvent,
			disasterEvent: ld.item?.disasterEvent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
			user: ld.user
		},
		fieldsInitial: fieldsInitial,
		form: DisasterEventForm,
		edit: !!ld.item,
		id: ld.item?.id,
	});
}
