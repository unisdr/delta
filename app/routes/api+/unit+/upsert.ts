import {
  authLoaderApi,
  authActionApi
} from "~/util/auth";

import {
  jsonUpsert,
} from "~/backend.server/handlers/form";

import {
  unitCreate,
  unitUpdate,
  unitIdByImportId,
  fieldsDefApi
} from "~/backend.server/models/unit";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  const data = await args.request.json()
  const saveRes = await jsonUpsert({
    data,
    fieldsDef: await fieldsDefApi(),
    create: unitCreate,
    update: unitUpdate,
    idByImportId: unitIdByImportId,
  })

  return Response.json(saveRes)
})
