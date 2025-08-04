import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { getTableName } from "drizzle-orm";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import {
	devExample1ById,
	devExample1DeleteByIdAndCountryAccounts,
} from "~/backend.server/models/dev_example1";
import { devExample1Table } from "~/drizzle/schema";

import { route } from "~/frontend/dev_example1";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createDeleteActionWithCountryAccounts({
		baseRoute: route,
		delete: devExample1DeleteByIdAndCountryAccounts,
		tableName: getTableName(devExample1Table),
		getById: devExample1ById,
		countryAccountsId: countryAccountsId,
	})(args);
};
