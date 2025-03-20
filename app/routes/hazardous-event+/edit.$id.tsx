import {
	hazardousEventUpdate,
	hazardousEventById
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardousEventForm,
} from "~/frontend/events/hazardeventform";

import {
	formScreen,
} from "~/frontend/form";

import {
	formSave,
} from "~/backend.server/handlers/form";

import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetAuth,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	getItem2
} from "~/backend.server/handlers/view"

import {buildTree} from "~/components/TreeView";
import {dr} from "~/db.server"; // Drizzle ORM instance
import {divisionTable} from "~/drizzle/schema";
import {RoleId} from "~/frontend/user/roles";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, hazardousEventById)
	let hip = await dataForHazardPicker();

	let user = authLoaderGetUserForFrontend(loaderArgs)

	if (item!.event.ps.length > 0) {
		let parent = item!.event.ps[0].p.he;
		// get parent of parent as well, to match what we use in new form
		let parent2 = await hazardousEventById(parent.id);
		return {hip, item, parent: parent2, treeData: [], user};
	}

	// Define Keys Mapping (Make it Adaptable)
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

	const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;

    const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);
	//console.log('divisionGeoJSON: ', divisionGeoJSON.rows);

	return {hip: hip, item: item, treeData: treeData, ctryIso3: ctryIso3, divisionGeoJSON: divisionGeoJSON?.rows || [], user};
})

export const action = authActionWithPerm("EditData", async (actionArgs) => {

	const user = authActionGetAuth(actionArgs);
	return formSave({
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			if (id) {
				return hazardousEventUpdate(tx, id, data, user.user.id);
			} else {
				throw "not an create screen"
			}
		},
		redirectTo: (id: string) => `/hazardous-event/${id}`
	})
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	if (!ld.item) {
		throw "invalid"
	}
	let fieldsInitial = {
		...ld.item,
		...ld.item.event,
		parent: ""
	}
	return formScreen({
		extraData: {
			hip: ld.hip,
			parent: ld.parent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			user: ld.user,
			divisionGeoJSON: ld.divisionGeoJSON
		},
		fieldsInitial,
		form: HazardousEventForm,
		edit: true,
		id: ld.item.id
	});
}
