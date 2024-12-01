import {
	hazardEventUpdate,
	hazardEventById
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardEventForm,
} from "~/components/events/hazardeventform";

import {
	formScreen,
	fieldsFromMap
} from "~/components/form";

import {
	formUpdate
} from "~/backend.server/components/form";


import {
	authActionWithRole,
	authLoaderWithRole,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	getItem2
} from "~/backend.server/components/view"


export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, hazardEventById)
	let hip = await dataForHazardPicker();
	return {hip: hip, item: item};
})

export const action = authActionWithRole("EditData", async (actionArgs) => {
	return formUpdate({
		fieldsDef,
		actionArgs,
		fieldsFromMap: fieldsFromMap,
		update: hazardEventUpdate,
		redirectTo: (id: string) => `/hazard-event/${id}`
	})
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	if (!ld.item){
		throw "invalid"
	}
	let fieldsInitial = {
		...ld.item,
		...ld.item.event,
		parent: ""
	}
	return formScreen({
		extraData: {hip: ld.hip},
		fieldsInitial,
		form: HazardEventForm,
		edit: true,
		id: ld.item.id
	})
}
