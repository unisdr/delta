import {
  authLoaderApi,
  authActionApi
} from "~/util/auth";

import {
  jsonCreate,
} from "~/backend.server/handlers/form/form_api";
import {
  unitCreate,
  fieldsDefApi
} from "~/backend.server/models/unit";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  const data = await args.request.json()

  const saveRes = await jsonCreate({
    data,
    fieldsDef: await fieldsDefApi(),
    create: unitCreate
  })

  return Response.json(saveRes)
})
