import {
	authLoaderWithPerm,
} from "~/util/auth";

import {
	disasterEventCreate,
	disasterEventUpdate,
	disasterEventIdByImportId
} from "~/backend.server/models/event";


import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"


export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: disasterEventCreate,
	update: disasterEventUpdate,
	idByImportId: disasterEventIdByImportId,
})

export default createScreen({
	title: "Disaster Events",
	apiBaseUrl: "/api/disaster-event",
	listUrl: "/disaster-event"
}) 
