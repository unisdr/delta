import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	disruptionCreate,
	disruptionUpdate,
	disruptionIdByImportId,
	getFieldsDefApi
} from "~/backend.server/models/disruption"

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"

export const loader = authLoaderWithPerm("EditData", async () => {
	return null
})

export const action = createAction({
	fieldsDef: getFieldsDefApi(),
	create: disruptionCreate,
	update: disruptionUpdate,
	idByImportId: disruptionIdByImportId,
})

export default createScreen({
	title: "Disruption",
	apiBaseUrl: "/api/disruption",
	listUrl: "/disruptions"
})

