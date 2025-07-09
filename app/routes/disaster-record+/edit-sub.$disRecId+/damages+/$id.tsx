import { damagesById } from "~/backend.server/models/damages";

import { DamagesView } from "~/frontend/damages";

import { fieldsDefView } from "~/backend.server/models/damages";
import { createViewLoader } from "~/backend.server/handlers/form/form";
import { ViewScreenWithDef } from "~/frontend/form";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountrySettingsFromSession } from "~/util/session";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;
	return createViewLoader({
		getById: damagesById,
		extra: async (_item) => {
			const settings = await getCountrySettingsFromSession(request);
			const currencies = settings.currencyCodes;
			return { def: await fieldsDefView(currencies) };
		},
	})(loaderArgs);
};

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: DamagesView,
	});
}
