import {
	hazardEventCreate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardEventForm,
} from "~/frontend/events/hazardeventform";

import {
	formScreen,
} from "~/frontend/form";

import {
	formSave,
} from "~/backend.server/handlers/form";


import {
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	hazardEventById
} from "~/backend.server/models/event";


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	let {request} = loaderArgs;
	let hip = await dataForHazardPicker();
	let u = new URL(request.url);

	const parentId = u.searchParams.get("parent") || "";
	if (parentId) {
		const parent = await hazardEventById(parentId);
		if (!parent){
			throw new Response("Parent not found", {status: 404});
		}
		return {hip, parentId, parent};
	}
	return {hip};
})

export const action = authActionWithPerm("EditData", async (actionArgs) => {

	return formSave({
		isCreate: true,
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			if (!id) {
				return hazardEventCreate(tx, data);
			} else {
				throw "not an update screen"
			}
		},
		redirectTo: (id: string) => `/hazard-event/${id}`

	})
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>()

	let fieldsInitial = {parent: ld.parentId}

	return formScreen({
		extraData: {hip: ld.hip, parent: ld.parent},
		fieldsInitial,
		form: HazardEventForm,
		edit: false
	});
}
