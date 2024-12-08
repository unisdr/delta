import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";

import {
	disasterEventDelete
} from "~/backend.server/models/event";

import {
	route,
} from "~/frontend/events/disastereventform";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: disasterEventDelete
});



