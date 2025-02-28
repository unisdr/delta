import {disasterEventsLoader} from "~/backend.server/handlers/events/disasterevent";

import {ListView} from "~/frontend/events/disastereventlist";

import {authLoaderPublicOrWithPerm} from "~/util/auth";

import {Link} from "@remix-run/react";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({loaderArgs});
	}
);

export default function Data() {
	return ListView({
		titleOverride: "Select related disaster event",
		hideMainLinks: true,
		linksNewTab: true,
		actions: (item) => (
			<Link
				to="#"
				onClick={
					() => {
						if (window.opener) {
							window.opener.postMessage({selected: item, type:"select_disaster"}, "*");
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
