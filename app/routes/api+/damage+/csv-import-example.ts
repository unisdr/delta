import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createExampleLoader } from "~/backend.server/handlers/form/csv_import"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"
import { getCountrySettingsFromSession } from "~/util/session";


export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  const { request } = loaderArgs;
  return createExampleLoader({
    fieldsDef: async () => {
      const settings = await getCountrySettingsFromSession(request);
      const currencies = settings.currencyCodes ?? ["USD"];
      return await fieldsDefApi(currencies);
    }
  })(loaderArgs);
}
