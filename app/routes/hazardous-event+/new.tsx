import {
	hazardousEventCreate,
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
} from "~/backend.server/handlers/form/form";


import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	hazardousEventById
} from "~/backend.server/models/event";

import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	let {request} = loaderArgs;
	let hip = await dataForHazardPicker();
	let u = new URL(request.url);

	let user = authLoaderGetUserForFrontend(loaderArgs)

	const parentId = u.searchParams.get("parent") || "";
	if (parentId) {
		const parent = await hazardousEventById(parentId);
		if (!parent){
			throw new Response("Parent not found", {status: 404});
		}
		return {hip, parentId, parent, treeData: [], ctryIso3: [], user};
	}

	// Define Keys Mapping (Make it Adaptable)
	const idKey = "id"; 
	const parentKey = "parentId"; 
	const nameKey = "name"; 
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson", "importId", "nationalId", "level", "name"]);

	const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;


    const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);

	return {hip: hip, treeData: treeData, ctryIso3: ctryIso3, divisionGeoJSON: divisionGeoJSON?.rows || [], user};
})

export const action = authActionWithPerm("EditData", async (actionArgs) => {

	const user = authActionGetAuth(actionArgs);
	return formSave({
		isCreate: true,
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			if (!id) {
				return hazardousEventCreate(tx, data, user.user.id);
			} else {
				throw "not an update screen"
			}
		},
		redirectTo: (id: string) => `/hazardous-event/${id}`

	})
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>()

	let fieldsInitial = {parent: ld.parentId}

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
		edit: false
	});
}
