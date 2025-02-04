import {
	hazardEventUpdate,
	hazardEventById
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
	getItem2
} from "~/backend.server/handlers/view"


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, hazardEventById)
	let hip = await dataForHazardPicker();
	
	if (item!.event.ps.length > 0){
		let parent = item!.event.ps[0].p.he;
		// get parent of parent as well, to match what we use in new form
		let parent2 = await hazardEventById(parent.id);
		return {hip, item, parent: parent2};
	}
	return {hip: hip, item: item};
})

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	return formSave({
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			if (id) {
				return hazardEventUpdate(tx, id, data, actionArgs.request);
			} else {
				throw "not an create screen"
			}
		},
		redirectTo: (id: string) => `/hazard-event/${id}`
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
		extraData: {hip: ld.hip, parent: ld.parent},
		fieldsInitial,
		form: HazardEventForm,
		edit: true,
		id: ld.item.id
	});
}
