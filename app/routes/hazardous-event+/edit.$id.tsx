import {
	hazardousEventById,
	hazardousEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardousEventForm,
} from "~/frontend/events/hazardeventform";

import { formScreen } from "~/frontend/form";

import { formSave } from "~/backend.server/handlers/form/form";

import {
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";

import { useLoaderData } from "@remix-run/react";

import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { getItem2 } from "~/backend.server/handlers/view";

import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const item = await getItem2(params, hazardousEventById);
	if (!item || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const user = await authLoaderGetUserForFrontend(loaderArgs);
	
	let hip = await dataForHazardPicker();
	
	if (item!.event.ps.length > 0) {
		let parent = item!.event.ps[0].p.he;
		let parent2 = await hazardousEventById(parent.id);
		if(parent2?.countryAccountsId!== countryAccountsId){
			throw new Response("Unauthorized", { status: 401 });
		}
		return { hip, item, parent: parent2, treeData: [], user };
	}

	const settings = await getCountrySettingsFromSession(request);
	const ctryIso3 = settings.ctryIso3;

	return {
		hip: hip,
		item: item,
		treeData: [],
		ctryIso3: ctryIso3,
		divisionGeoJSON: [],
		user,
		countryAccountsId,
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave({
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			const updatedData = {
				...data,
				countryAccountsId,
			};
			if (id) {
				return hazardousEventUpdate(tx, id, updatedData);
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
			countryAccountsId: ld.countryAccountsId,
		},
		fieldsInitial,
		form: HazardousEventForm,
		edit: true,
		id: ld.item.id,
	});
}
