import {
  authLoaderApi,
  authActionApi
} from "~/util/auth";

import {
  jsonCreate,
} from "~/backend.server/handlers/form";
import {
  assetCreate,
  fieldsDefApi
} from "~/backend.server/models/asset";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  let data = await args.request.json()

  let saveRes = await jsonCreate({
    data,
    fieldsDef: fieldsDefApi,
    create: assetCreate
  })

  return Response.json(saveRes)
})

