import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	return ListView({})
}
