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

import {formSave} from "~/backend.server/handlers/form/form";

import {formScreen} from "~/frontend/form";

import {route} from "~/frontend/events/disastereventform";

import {useLoaderData} from "@remix-run/react";

import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend, 
	authLoaderWithPerm
} from "~/util/auth";
import {buildTree} from "~/components/TreeView";
import {dr} from "~/db.server"; // Drizzle ORM instance
import {divisionTable} from "~/drizzle/schema";
import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";
import { getInstanceSystemSettings } from "~/db/queries/instanceSystemSetting";

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

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params } = loaderArgs;
	const userSession = (loaderArgs as any).userSession;
	
	// Extract tenant context for secure data access
	const tenantContext = await getTenantContext(userSession);
	
	const getDisasterEvent = async (id: string) => {
		// Pass tenant context for data isolation
		return disasterEventById(id, tenantContext);
	};

	const item = await getItem2(params, getDisasterEvent);

	// ✅ Fetch division data & build tree
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey,  "en", ["geojson", "importId", "nationalId", "level", "name"]);

	// User already extracted above
	let hip = await dataForHazardPicker()

	let ctryIso3:string = "";
	const settings = await getInstanceSystemSettings()
	if(settings){
		ctryIso3=settings.dtsInstanceCtryIso3;
	}


    const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);

	return {
		item,
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON?.rows,
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
