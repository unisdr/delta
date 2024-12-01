import {
	disasterEventById

} from "~/backend.server/models/event";

import {
	DisasterEventView,
} from "~/components/events/disastereventform";


import {
	authLoaderWithRole,
} from "~/util/auth";

import {
	useLoaderData,
} from "@remix-run/react";


import {
	getItem2
} from "~/backend.server/components/view"

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, disasterEventById)
	return {
		item: item,
	};
})

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	if (!ld.item){
		throw "invalid"
	}
	return DisasterEventView({item: ld.item})
}

