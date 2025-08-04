import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import { assetById, assetDeleteById } from "~/backend.server/models/asset";
import { assetTable } from "~/drizzle/schema";

import { route } from "~/frontend/asset";
import { requireUser } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const action = async (args: any) => {
	const { request } = args;
	const userSession = await requireUser(args.request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createDeleteAction({
		baseRoute: route,
		delete: async (id: string) => {
			return assetDeleteById(id, countryAccountsId);
		},
		tableName: getTableName(assetTable),
		getById: async (id: string) => {
			return assetById(id);
		},
	})(args);
};

