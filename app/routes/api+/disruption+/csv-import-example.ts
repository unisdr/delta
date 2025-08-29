import { createExampleLoader } from "~/backend.server/handlers/form/csv_import"

import {
	getFieldsDefApi
} from "~/backend.server/models/disruption"

export const loader = createExampleLoader({
	fieldsDef: getFieldsDefApi()
})

