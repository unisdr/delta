import { Link } from "@remix-run/react";
import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";
import { MainContainer } from "~/frontend/container";
import { ListView } from "~/frontend/events/hazardeventlist";
import { authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("No selected country accounts instance ", {
			status: 404,
		});
	}
	return hazardousEventsLoader(args);
});

export default function Data() {
	return (
		<MainContainer title="Select parent for event">
			{ListView({
				isPublic: false,
				basePath: `/hazardous-event/picker`,
				linksNewTab: true,
				actions: (item) => (
					<Link
						to="#"
						onClick={() => {
							if (window.opener) {
								window.opener.postMessage(
									{ selected: item, type: "select_hazard" },
									"*"
								);
								window.close();
							} else {
								alert(
									"Can't get window that opened this window. Close and try again."
								);
							}
						}}
					>
						Select
					</Link>
				),
			})}
		</MainContainer>
	);
}
