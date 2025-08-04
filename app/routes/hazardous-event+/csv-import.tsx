import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	hazardousEventUpdate,
	hazardousEventIdByImportId,
	hazardousEventCreate,
} from "~/backend.server/models/event";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

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
	create: hazardousEventCreate,
	update: hazardousEventUpdate,
	idByImportId: hazardousEventIdByImportId,
})

export default createScreen({
	title: "Hazardous Events",
	apiBaseUrl: "/api/hazardous-event",
	listUrl: "/hazardous-event"
}) 
