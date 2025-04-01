import {createExampleLoader} from "~/backend.server/handlers/form/csv_import";

import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";


export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
