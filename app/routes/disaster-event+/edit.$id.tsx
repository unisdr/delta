import {getTableName} from "drizzle-orm";
import {
	disasterEventById,
	disasterEventByIdTx,
	disasterEventCreate,
	DisasterEventFields,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	DisasterEventForm,
} from "~/frontend/events/disastereventform";

import {createLoader, createAction} from "~/backend.server/handlers/form/form";

import {formScreen} from "~/frontend/form";

import {route} from "~/frontend/events/disastereventform";

import {useLoaderData} from "@remix-run/react";
import {disasterEventTable, divisionTable} from "~/drizzle/schema";

import {authLoaderGetUserForFrontend, authLoaderWithPerm} from "~/util/auth";
import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";

// export const loader = createLoader({
// 	getById: disasterEventById,
// });

export const action = createAction({
	fieldsDef,
	create: disasterEventCreate,
	update: disasterEventUpdate,
	redirectTo: (id) => route + "/" + id,
	getById: disasterEventByIdTx,
	tableName: getTableName(disasterEventTable),
	action: (isCreate) =>
		isCreate ? "Create disaster event" : "Update disaster event",
});

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	// ✅ Fetch existing disaster event data
	const baseData = await createLoader({getById: disasterEventById})(loaderArgs);

	// ✅ Fetch division data & build tree
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey,  "en", ["geojson", "importId", "nationalId", "level", "name"]);

	let user = authLoaderGetUserForFrontend(loaderArgs)
	let hip = await dataForHazardPicker()

	const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;

    const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);

	return {
		...baseData,
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON?.rows,
		user
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let fieldsInitial: Partial<DisasterEventFields> = ld.item
		? {
			...ld.item,
		}
		: {};
	return formScreen({
		extraData: {
			hip: ld.hip,
			hazardousEvent: ld.item?.hazardousEvent,
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
