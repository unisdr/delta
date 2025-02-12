import {
  authLoaderWithPerm
} from "~/util/auth";

import {
  unitCreate,
  unitUpdate,
  unitIdByImportId,
  fieldsDefApi
} from "~/backend.server/models/unit";

import {
  createAction,
} from "~/backend.server/handlers/csv_import"

import {
  createScreen
} from "~/frontend/csv_import"

export let loader = authLoaderWithPerm("EditData", async () => {
  return null
})

export let action = createAction({
  fieldsDef: fieldsDefApi,
  create: unitCreate,
  update: unitUpdate,
  idByImportId: unitIdByImportId,
})

export default createScreen({
  title: "Unit",
  apiBaseUrl: "/api/unit",
  listUrl: "/settings/unit"
})
