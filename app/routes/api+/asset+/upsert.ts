import {
  authLoaderApi,
  authActionApi
} from "~/util/auth";

import {
  jsonUpsert,
} from "~/backend.server/handlers/form/form_api";

import {
  assetCreate,
  assetUpdate,
  assetIdByImportId,
  fieldsDefApi
} from "~/backend.server/models/asset";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  let data = await args.request.json()
  let saveRes = await jsonUpsert({
    data,
    fieldsDef: await fieldsDefApi(),
    create: assetCreate,
    update: assetUpdate,
    idByImportId: assetIdByImportId,
  })
  return Response.json(saveRes)
})
