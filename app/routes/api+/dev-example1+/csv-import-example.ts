import {createExampleLoader} from "~/backend.server/handlers/csv_import";

import {
	fieldsDefApi,
} from "~/frontend/dev_example1";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
