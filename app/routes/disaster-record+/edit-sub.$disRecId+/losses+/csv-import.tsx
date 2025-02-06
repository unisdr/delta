import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	lossesCreate,
	lossesUpdate,
	lossesIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/losses"

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
	create: lossesCreate,
	update: lossesUpdate,
	idByImportId: lossesIdByImportId,
})

export default createScreen({
	title: "Losses",
	apiBaseUrl: "/api/losses",
	listUrl: "/losses"
})

