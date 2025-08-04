import { getTableName } from "drizzle-orm";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import { requireUser } from "~/util/auth";

import {
	hazardousEventById,
	hazardousEventDelete,
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const action = async (args: any) => {
	const { request } = args;
	const userSession = await requireUser(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("No instance selected", { status: 500 });
	}

	return createDeleteActionWithCountryAccounts({
		baseRoute: "/hazardous-event",
		delete: async (id: string) => {
			return hazardousEventDelete(id);
		},
		tableName: getTableName(hazardousEventTable),
		getById: async (id: string) => {
			return hazardousEventById(id);
		},
		postProcess: async (_id: string, data: any) => {
			if (data.attachments) {
				ContentRepeaterUploadFile.delete(data.attachments);
			}
		},
		countryAccountsId,
	})(args);
};
