import {createExampleLoader} from "~/backend.server/handlers/csv_import";

import {
  fieldsDefApi
} from "~/backend.server/models/unit";

export let loader = createExampleLoader({
  fieldsDef: fieldsDefApi
})
