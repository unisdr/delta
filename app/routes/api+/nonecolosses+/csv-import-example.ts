import {createExampleLoader} from "~/backend.server/handlers/csv_import";

import {
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
