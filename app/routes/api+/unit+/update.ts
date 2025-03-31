import {
	authLoaderApi,
	authActionApi
} from "~/util/auth";


import {
  jsonUpdate,
} from "~/backend.server/handlers/form/form_api";
import {
  fieldsDefApi,
  unitUpdate
} from "~/backend.server/models/unit";

export let loader = authLoaderApi(async () => {
  return Response.json("Use POST")
})

export let action = authActionApi(async (args) => {
  const data = await args.request.json()

  const saveRes = await jsonUpdate({
    data,
    fieldsDef: await fieldsDefApi(),
    update: unitUpdate
  })

  return Response.json(saveRes)
})
