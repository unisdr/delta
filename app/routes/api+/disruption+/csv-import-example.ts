import { createExampleLoader } from "~/backend.server/handlers/csv_import"

import {
	fieldsDefApi,
} from "~/frontend/disruption"

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})

