import {
	hazardEventCreate,
	HazardEventFields
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
	formCreate,
} from "~/backend.server/components/form";


import {
	authActionWithRole,
	authLoaderWithRole,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";

import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	let {request} = loaderArgs;
	let hip = await dataForHazardPicker();
	let u = new URL(request.url);
	return {hip: hip, parent: u.searchParams.get("parent") || ""};
})

export const action = authActionWithRole("EditData", async (actionArgs) => {

	return formCreate({
		fieldsDef,
		actionArgs,
		queryParams: ["parent"],
		fieldsFromMap: fieldsFromMap,
		create: hazardEventCreate,
		redirectTo: (id: string) => `/hazard-event/${id}`
	})
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>()

	let fieldsInitial = fieldsFromMap<HazardEventFields>({
	parent: ld.parent}, fieldsDef)

	return formScreen({
		extraData: {hip: ld.hip},
		fieldsInitial,
		form: HazardEventForm,
		edit: false
	})
}
