import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";
import { requireUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

import {
	disasterEventById,
	disasterEventDelete
} from "~/backend.server/models/event";
import { disasterEventTable } from "~/drizzle/schema";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

import {
	route,
} from "~/frontend/events/disastereventform";

export const action = async (args: any) => {
	// Get user session
	const userSession = await requireUser(args.request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	// Get tenant context
	const tenantContext = await getTenantContext(userSession);

	return createDeleteAction({
		baseRoute: route,
		delete: async (id: string) => {
			return disasterEventDelete(id, tenantContext);
		},
		tableName: getTableName(disasterEventTable),
		getById: async (id: string) => {
			return disasterEventById(id, tenantContext);
		},
		postProcess: async (_id: string, data: any) => {
			if (data.attachments) {
				ContentRepeaterUploadFile.delete(data.attachments);
			}
		}
	})(args);
};



