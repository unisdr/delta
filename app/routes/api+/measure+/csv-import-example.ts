import {createExampleLoader} from "~/backend.server/handlers/form/csv_import";

import {
	fieldsDefApi
} from "~/backend.server/models/measure";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})

