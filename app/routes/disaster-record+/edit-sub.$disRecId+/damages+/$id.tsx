import { damagesById, fieldsDefView } from "~/backend.server/models/damages";

import { DamagesView } from "~/frontend/damages";

import { ViewScreenWithDef } from "~/frontend/form";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountrySettingsFromSession } from "~/util/session";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;
	const settings = await getCountrySettingsFromSession(request);

	if (!settings) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	const currencies = settings.currencyCode ? [settings.currencyCode] : ["USD"];

	return (await (async () => {
		const result = (await (await import("~/backend.server/handlers/form/form")).createViewLoader)({
			getById: damagesById,
			extra: async (_item) => {
				return { def: await fieldsDefView(currencies) };
			},
		})(loaderArgs);
		return result;
	})());
};

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: DamagesView,
	});
}