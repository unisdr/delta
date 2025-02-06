import { createExampleLoader } from "~/backend.server/handlers/csv_import"

import {
	fieldsDefApi
} from "~/backend.server/models/disruption"

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})

