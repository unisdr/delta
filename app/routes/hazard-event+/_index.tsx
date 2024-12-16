
import {hazardEventsLoader} from "~/backend.server/handlers/events/hazardevent"

import {ListView} from "~/frontend/events/hazardeventlist"

import {
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithRole,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithRole("ViewData", async (loaderArgs) => {
	return hazardEventsLoader({loaderArgs})
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();

	return (
		<div>
			{!ld.isPublic && (
				<a href="/hazard-event/new">New</a>
			)}
			<ListView
				isPublic={ld.isPublic}
				basePath="/hazard-event"
			></ListView>
		</div>
	)
}

