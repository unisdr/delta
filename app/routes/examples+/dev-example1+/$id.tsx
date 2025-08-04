import {
	devExample1ById,
	fieldsDefView,
} from "~/backend.server/models/dev_example1";

import { DevExample1View } from "~/frontend/dev_example1";

import { createViewLoader } from "~/backend.server/handlers/form/form";

import { ViewScreenWithDef } from "~/frontend/form";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession} from "~/util/session";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const result = createViewLoader(
		{
			// getByIdAndCountryAccountsId: devExample1ByIdAndCountryAccountsId,
			getById: devExample1ById,
			extra: async () => {
				return { def: await fieldsDefView() };
			},
			// countryAccountsId
		},
	)(args);

	const item = (await result).item;
	if(item && item.countryAccountsId !== countryAccountsId){
		throw new Response("unauthorized", {status:401})
	}
	return result;
};

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: DevExample1View,
	});
}
