import {createExampleLoader} from "~/backend.server/handlers/form/csv_import";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
