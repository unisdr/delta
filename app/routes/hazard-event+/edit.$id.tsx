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
	fieldsFromMap
} from "~/frontend/form";

import {
	formUpdate
} from "~/backend.server/handlers/form";


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
} from "~/backend.server/handlers/view"


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
	let myFormScreen = formScreen({
		extraData: {hip: ld.hip},
		fieldsInitial,
		form: HazardEventForm,
		edit: true,
		id: ld.item.id
	});

	return (<>
		<div className="dts-page-header">
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">Hazardous events</h1>
				</div>
			</header>
		</div>
		<section>
			<div className="mg-container">
				{ myFormScreen }
			</div>
		</section>
	</>);
}
