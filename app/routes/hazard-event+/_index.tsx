
import {hazardEventsLoader} from "~/backend.server/handlers/events/hazardevent"

import {ListView} from "~/frontend/events/hazardeventlist"

import {
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return hazardEventsLoader({loaderArgs})
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Hazardous events</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					<div>
						{!ld.isPublic && (
							<a href="/hazard-event/new">New</a>
						)}
						<ListView
							isPublic={ld.isPublic}
							basePath="/hazard-event"
						></ListView>
					</div>
				</div>
			</section>

		</>
	)
}

