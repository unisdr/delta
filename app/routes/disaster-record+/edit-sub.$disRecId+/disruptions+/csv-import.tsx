import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	disruptionCreate,
	disruptionUpdate,
	disruptionIdByImportId
} from "~/backend.server/models/disruption"

import {
	fieldsDefApi,
} from "~/frontend/disruption"

import {
	createAction,
} from "~/backend.server/handlers/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"

export const loader = authLoaderWithPerm("EditData", async () => {
	return null
})

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: disruptionCreate,
	update: disruptionUpdate,
	idByImportId: disruptionIdByImportId,
})

export default createScreen({
	title: "Disruption",
	apiBaseUrl: "/api/disruption",
	listUrl: "/disruptions"
})

