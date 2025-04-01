import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/damages"

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
	fieldsDef: fieldsDefApi,
	create: damagesCreate,
	update: damagesUpdate,
	idByImportId: damagesIdByImportId,
})

export default createScreen({
	title: "Damages",
	apiBaseUrl: "/api/damages",
	listUrl: "/damages"
})

