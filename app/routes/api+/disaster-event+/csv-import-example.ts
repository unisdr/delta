import {createExampleLoader} from "~/backend.server/handlers/form/csv_import";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
