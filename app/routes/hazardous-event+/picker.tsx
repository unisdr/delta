import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent"
import { ListView } from "~/frontend/events/hazardeventlist"
import {
	authLoaderWithPerm,
} from "~/util/auth";
import { Link } from "@remix-run/react";
import { MainContainer } from "~/frontend/container"
import { getTenantContext } from "~/util/tenant";
import type { UserSession } from "~/util/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	// Extract tenant context from user session (injected by authLoaderWithPerm)
	const userSession = (loaderArgs as any).userSession as UserSession;
	const tenantContext = await getTenantContext(userSession);

	// Pass tenant context to the loader
	return hazardousEventsLoader({
		loaderArgs,
		tenantContext
	});
})


/*
			<p>
				Current Parent:&nbsp;
				{item.event.ps.length > 0 ? (
					(() => {
						const parent = item.event.ps[0].p.he;
						return hazardousEventLabel(parent);
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
										window.opener.postMessage({ selected: item, type: "select_hazard" }, "*");
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

