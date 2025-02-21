import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	hazardous_eventUpdate,
	hazardous_eventIdByImportId,
	hazardous_eventCreate
} from "~/backend.server/models/event";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	createAction,
} from "~/backend.server/handlers/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"


export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: hazardous_eventCreate,
	update: hazardous_eventUpdate,
	idByImportId: hazardous_eventIdByImportId,
})

export default createScreen({
	title: "Hazardous Events",
	apiBaseUrl: "/api/hazardous-event",
	listUrl: "/hazardous-event"
}) 
