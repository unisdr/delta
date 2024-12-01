import {
	disasterEventUpdate,
	disasterEventById
} from "~/backend.server/models/event";

import {
	fieldsDef,
	DisasterEventForm,
} from "~/components/events/disastereventform";

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


import {
	getItem2
} from "~/backend.server/components/view"


export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, disasterEventById)
	//let hip = await dataForHazardPicker();
	return {/*hip: hip*/ item: item};
})

export const action = authActionWithRole("EditData", async (actionArgs) => {
	return formUpdate({
		fieldsDef,
		actionArgs,
		fieldsFromMap: fieldsFromMap,
		update: disasterEventUpdate,
		redirectTo: (id: string) => `/disaster-event/${id}`
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
		extraData: {},
		fieldsInitial,
		form: DisasterEventForm,
		edit: true,
		id: ld.item.id
	})
}
