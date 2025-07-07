import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";
import { requireUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

import {
	hazardousEventById,
	hazardousEventDelete
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const action = async (args: any) => {
	// Get user session
	const userSession = await requireUser(args.request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	// Get tenant context
	const tenantContext = await getTenantContext(userSession);

	return createDeleteAction({
		baseRoute: "/hazardous-event",
		delete: async (id: string) => {
			return hazardousEventDelete(id, tenantContext);
		},
		tableName: getTableName(hazardousEventTable),
		getById: async (id: string) => {
			return hazardousEventById(id, tenantContext);
		},
		postProcess: async (_id: string, data: any) => {
			if (data.attachments) {
				ContentRepeaterUploadFile.delete(data.attachments);
			}
		}
	})(args);
};



