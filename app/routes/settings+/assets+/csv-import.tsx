import {
  authLoaderWithPerm
} from "~/util/auth";

import {
  assetCreate,
  assetUpdate,
  assetIdByImportId,
  fieldsDefApi
} from "~/backend.server/models/asset";

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
  create: assetCreate,
  update: assetUpdate,
  idByImportId: assetIdByImportId,
})

export default createScreen({
  title: "Asset",
  apiBaseUrl: "/api/asset",
  listUrl: "/settings/asset"
})
