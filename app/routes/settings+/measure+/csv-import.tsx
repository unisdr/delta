import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	measureCreate,
	measureUpdate,
	measureIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/measure";

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
	create: measureCreate,
	update: measureUpdate,
	idByImportId: measureIdByImportId,
})

export default createScreen({
	title: "Measure",
	apiBaseUrl: "/api/measure",
	listUrl: "/settings/measure"
})

