import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";


import {
	hazardEventDelete
} from "~/backend.server/models/event";

export const loader = createDeleteLoader({
	baseRoute: "/hazard-event",
	delete: hazardEventDelete
});



