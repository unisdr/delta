// Import necessary modules
import {
	disasterEventById,
	disasterEventCreate,
	DisasterEventFields,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	DisasterEventForm,
	fieldsDef,
} from "~/frontend/events/disastereventform";

import { formSave } from "~/backend.server/handlers/form/form";

import { formScreen } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { useLoaderData } from "@remix-run/react";

import { getItem2 } from "~/backend.server/handlers/view";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import { authActionGetAuth, authActionWithPerm, authLoaderGetUserForFrontend, authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

// Helper function to get country ISO3 code
async function getCountryIso3(request: Request): Promise<string> {
	const settings = await getCountrySettingsFromSession(request);
	return settings?.dtsInstanceCtryIso3 || "";
}

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {request} = actionArgs;
	authActionGetAuth(actionArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave({
		actionArgs,
		fieldsDef,
		save: async (tx, id, data) => {
			const updatedData = {...data, countryAccountsId}
			if (id) {
				return disasterEventUpdate(tx, id, updatedData);
			} else {
				return disasterEventCreate(tx, updatedData);
			}
		},
		redirectTo: (id: string) => route + "/" + id,
	});
});


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	const ctryIso3 = await getCountryIso3(request);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	

	// Handle 'new' case without DB query
	if (params.id === "new") {
		return {
			item: null, // No existing item for new disaster event
			hip: await dataForHazardPicker(),
			treeData: [],
			ctryIso3: ctryIso3,
			divisionGeoJSON: [],
			user: authLoaderGetUserForFrontend(loaderArgs),
		};
	}

	// For existing items, fetch the disaster event
	const getDisasterEvent = async (id: string) => {
		return disasterEventById(id);
	};

	let item = null;
	try {
		item = await getItem2(params, getDisasterEvent);
		if(item.countryAccountsId !== countryAccountsId){
			throw new Response("Unauthorized access", { status: 401 });
		}
	} catch (error) {
		// If item not found, return 404
		if (error instanceof Response && error.status === 404) {
			throw new Response("Disaster event not found", { status: 404 });
		}
		// Re-throw other errors
		throw error;
	}

	// Get hazard picker data
	const hip = await dataForHazardPicker();


	return {
		item,
		hip,
		treeData: [],
		ctryIso3,
		divisionGeoJSON: [],
		user: authLoaderGetUserForFrontend(loaderArgs),
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
	const fixedHazardousEvent = ld.item?.hazardousEvent
		? {
				...ld.item.hazardousEvent,
				hipHazard: {
					id: "",
					code: "",
					clusterId: "",
					nameEn: "",
					descriptionEn: "",
				},
				hipCluster: {
					id: "",
					nameEn: "",
					typeId: "",
				},
				hipType: {
					id: "",
					nameEn: "",
				},
		  }
		: null;

	return formScreen({
		extraData: {
			hip: ld.hip,
			hazardousEvent: fixedHazardousEvent,
			disasterEvent: ld.item?.disasterEvent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
			user: ld.user,
		},
		fieldsInitial: fieldsInitial,
		form: DisasterEventForm,
		edit: !!ld.item,
		id: ld.item?.id,
	});
}
