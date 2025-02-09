import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	devExample1Create,
	devExample1Update,
	devExample1IdByImportId,
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

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
	create: devExample1Create,
	update: devExample1Update,
	idByImportId: devExample1IdByImportId,
})

export default createScreen({
	title: "Dev Example 1",
	apiBaseUrl: "/api/dev-example1",
	listUrl: "/examples/dev-example1"
}) 
