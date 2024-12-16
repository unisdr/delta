import {hazardEventsLoader} from "~/backend.server/handlers/events/hazardevent"

import {ListView} from "~/frontend/events/hazardeventlist"

import {
	authLoaderWithRole,
} from "~/util/auth";


import {Link} from "@remix-run/react";

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	return hazardEventsLoader({loaderArgs})
})


/*
			<p>
				Current Parent:&nbsp;
				{item.event.ps.length > 0 ? (
					(() => {
						const parent = item.event.ps[0].p.he;
						return hazardEventLabel(parent);
					})()
				) : (
					"-"
				)}
			</p>

*/
export default function Data() {
	return (
		<div>
			<h2>Select parent for event</h2>
			{
				ListView({
					isPublic: false,
					basePath: `/hazard-event/picker`,
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
		</div >
	)
}

