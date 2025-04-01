import {createExampleLoader} from "~/backend.server/handlers/form/csv_import";

import {
  fieldsDefApi
} from "~/backend.server/models/asset";

export let loader = createExampleLoader({
  fieldsDef: fieldsDefApi
})
