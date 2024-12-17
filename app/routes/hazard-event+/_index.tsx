
import {hazardEventsLoader} from "~/backend.server/handlers/events/hazardevent"

import {ListView} from "~/frontend/events/hazardeventlist"

import {
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";

import {MainContainer} from "~/frontend/container"

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return hazardEventsLoader({loaderArgs})
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	return (
		<MainContainer title="Hazardous events">
			<>
				{!ld.isPublic && (
					<a href="/hazard-event/new">New</a>
				)}
				<ListView
					isPublic={ld.isPublic}
					basePath="/hazard-event"
				></ListView>
			</>
		</MainContainer>
	)
}

