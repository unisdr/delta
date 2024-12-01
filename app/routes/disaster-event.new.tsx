import {
	disasterEventCreate,
	DisasterEventFields
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
	formCreate,
} from "~/backend.server/components/form";


import {
	authActionWithRole,
	authLoaderWithRole,
} from "~/util/auth";



export const loader = authLoaderWithRole("EditData", async () => {
	//let {request} = loaderArgs;
	//let hip = await dataForHazardPicker();
	//let u = new URL(request.url);
	return {/*hip: hip, parent: u.searchParams.get("parent") || ""*/};
})

export const action = authActionWithRole("EditData", async (actionArgs) => {

	return formCreate({
		fieldsDef,
		actionArgs,
		//queryParams: ["parent"],
		fieldsFromMap: fieldsFromMap,
		create: disasterEventCreate,
		redirectTo: (id: string) => `/disaster-event/${id}`
	})
});

export default function Screen() {
	//let ld = useLoaderData<typeof loader>()

	let fieldsInitial = fieldsFromMap<DisasterEventFields>({
		//parent: ld.parent
	}, fieldsDef)

	return formScreen({
		extraData: {},
		fieldsInitial,
		form: DisasterEventForm,
		edit: false
	})
}
