import {
  authLoaderApi,
  authActionApi
} from "~/util/auth";

import {
  jsonUpdate,
} from "~/backend.server/handlers/form";
import {
  fieldsDefApi,
  assetUpdate
} from "~/backend.server/models/asset";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  let data = await args.request.json()

  let saveRes = await jsonUpdate({
    data,
    fieldsDef: fieldsDefApi,
    update: assetUpdate
  })

  return Response.json(saveRes)
})

