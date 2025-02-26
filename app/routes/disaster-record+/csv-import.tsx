import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId
} from "~/backend.server/models/disaster_record";


import {
	fieldsDefApi,
} from "~/frontend/disaster-record/form";

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
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	idByImportId: disasterRecordsIdByImportId,
})

export default createScreen({
	title: "Disaster Events",
	apiBaseUrl: "/api/disaster-event",
	listUrl: "/disaster-event"
}) 
