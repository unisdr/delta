
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
					<>
					<a href="/hazard-event/new">New</a>
					<div className="dts-legend">
						<span className="dts-body-label">Status legend</span>
						<div className="dts-legend__item">
							<span className="dts-status dts-status--draft" aria-labelledby="legend1"></span>
							<span id="legend1">Draft</span>
						</div>
						<div className="dts-legend__item">
							<span className="dts-status dts-status--published" aria-labelledby="legend2"></span>
							<span id="legend2">Published</span>
						</div>
						<div className="dts-legend__item">
							<span className="dts-status dts-status--rejected" aria-labelledby="legend3"></span>
							<span id="legend3">Rejected</span>
						</div>
					</div>
					</>
				)}
				<ListView
					isPublic={ld.isPublic}
					basePath="/hazard-event"
				></ListView>
			</>
		</MainContainer>
	)
}

