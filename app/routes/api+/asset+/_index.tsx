import {
  fieldsDefApi
} from "~/backend.server/models/asset";

import {
  authLoaderApiDocs,
} from "~/util/auth";
import {
  jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

export let loader = authLoaderApiDocs(async () => {
  let docs = jsonApiDocs({
    baseUrl: "asset",
    fieldsDef: await fieldsDefApi()
  })

  return new Response(docs, {
    status: 200,
    headers: {"Content-Type": "text/plain"}
  })
})
