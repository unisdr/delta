import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api"

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId
} from "~/backend.server/models/damages"
import { ActionFunctionArgs } from "@remix-run/server-runtime"
import { getCountrySettingsFromSession } from "~/util/session"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args: ActionFunctionArgs) => {
  const { request } = args;
  const data = await args.request.json();
  const settings = await getCountrySettingsFromSession(request);
  const currencies = settings.currencyCodes ?? ["USD"];
  const fieldsDef = await fieldsDefApi(currencies); 
  const saveRes = await jsonUpsert({
    data,
    fieldsDef, 
    create: damagesCreate,
    update: damagesUpdate,
    idByImportId: damagesIdByImportId,
  });

  return Response.json(saveRes);
})