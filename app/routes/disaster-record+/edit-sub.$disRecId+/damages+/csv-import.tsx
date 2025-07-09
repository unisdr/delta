import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId,
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
	createScreen
} from "~/frontend/csv_import"
import { ActionFunctionArgs } from "@remix-run/server-runtime"
import { getCountrySettingsFromSession } from "~/util/session"

export const loader = authLoaderWithPerm("EditData", async () => {
	return null
})

export const action = async (actionArgs: ActionFunctionArgs) => {
  const { request } = actionArgs;
  return createAction({
    fieldsDef: async () => {
      const settings = await getCountrySettingsFromSession(request);
      const currencies = settings.currencyCodes ?? ["USD"];
      return await fieldsDefApi(currencies);
    },
    create: damagesCreate,
    update: damagesUpdate,
    idByImportId: damagesIdByImportId,
  })(actionArgs);
}

export default createScreen({
	title: "Damages",
	apiBaseUrl: "/api/damages",
	listUrl: "/damages"
})

