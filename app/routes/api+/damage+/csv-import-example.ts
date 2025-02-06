import { createExampleLoader } from "~/backend.server/handlers/csv_import"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})

