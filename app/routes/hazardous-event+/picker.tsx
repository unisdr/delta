import {hazardous_eventsLoader} from "~/backend.server/handlers/events/hazardevent"

import {ListView} from "~/frontend/events/hazardeventlist"

import {
	authLoaderWithPerm,
} from "~/util/auth";


import {Link} from "@remix-run/react";

import {MainContainer} from "~/frontend/container"

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	return hazardous_eventsLoader({loaderArgs})
})


/*
			<p>
				Current Parent:&nbsp;
				{item.event.ps.length > 0 ? (
					(() => {
						const parent = item.event.ps[0].p.he;
						return hazardous_eventLabel(parent);
					})()
				) : (
					"-"
				)}
			</p>

*/
export default function Data() {
	return (
		<MainContainer title="Select parent for event">
			{
				ListView({
					isPublic: false,
					basePath: `/hazardous-event/picker`,
					linksNewTab: true,
					actions: (item) => (
						<Link
							to="#"
							onClick={
								() => {
									if (window.opener) {
										window.opener.postMessage({selected: item}, "*");
										window.close();
									} else {
										alert("Can't get window that opened this window. Close and try again.")
									}
								}}
						>
							Select
						</Link>

					)
				})
			}
		</MainContainer>
	)
}

