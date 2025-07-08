import {
	hazardousEventUpdate,
	hazardousEventById,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardousEventForm,
} from "~/frontend/events/hazardeventform";

import { formScreen } from "~/frontend/form";

import { formSave } from "~/backend.server/handlers/form/form";

import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";

import { useLoaderData } from "@remix-run/react";

import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { getItem2 } from "~/backend.server/handlers/view";

import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";


import { getTenantContext } from "~/util/tenant";


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params } = loaderArgs;
	const userSession = (loaderArgs as any).userSession; // 🔧 CHANGE: Use same pattern as existing codebase
	const user = authLoaderGetUserForFrontend(loaderArgs);

	// Extract tenant context for secure data access
	const tenantContext = await getTenantContext(userSession);

	const getHazardousEvent = async (id: string) => {
		// Pass tenant context instead of userSession for data isolation
		return hazardousEventById(id, tenantContext);
	};

	const item = await getItem2(params, getHazardousEvent);
	let hip = await dataForHazardPicker();

	if (item!.event.ps.length > 0) {
		let parent = item!.event.ps[0].p.he;
		// get parent of parent as well, to match what we use in new form
		// Use tenant context for parent lookup too
		let parent2 = await hazardousEventById(parent.id, tenantContext);
		return { hip, item, parent: parent2, treeData: [], user };
	}


	// Define Keys Mapping (Make it Adaptable)
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
	console.log(treeData);

	// Use tenant's ISO3 from tenant context
	const ctryIso3 = tenantContext.iso3;


	// Filter top-level divisions by tenant context
	const divisionGeoJSON = await dr.execute(sql`
		SELECT id, name, geojson, import_id
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) 
		AND geojson IS NOT NULL
		AND country_accounts_id = ${tenantContext.countryAccountId};
    `);


	return {
		hip: hip,
		item: item,
		treeData: treeData,
		ctryIso3: ctryIso3,
		divisionGeoJSON: divisionGeoJSON?.rows || [],
		user,
		tenantContext,
	};
});

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
				return hazardousEventUpdate(tx, id, data, tenantContext);
			} else {
				throw "not an create screen";
			}
		},
		redirectTo: (id: string) => `/hazardous-event/${id}`,
	});
});


export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	let fieldsInitial = {
		...ld.item,
		...ld.item.event,
		parent: "",
	};
	return formScreen({
		extraData: {
			hip: ld.hip,
			parent: ld.parent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			user: ld.user,
			divisionGeoJSON: ld.divisionGeoJSON,
			tenantContext: ld.tenantContext,
		},
		fieldsInitial,
		form: HazardousEventForm,
		edit: true,
		id: ld.item.id,
	});
}