import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	hazardEventUpdate,
	hazardEventIdByImportId,
	hazardEventCreate
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
	create: hazardEventCreate,
	update: hazardEventUpdate,
	idByImportId: hazardEventIdByImportId,
})

export default createScreen({
	title: "Hazardous Events",
	apiBaseUrl: "/api/hazard-event",
	listUrl: "/hazard-event"
}) 
