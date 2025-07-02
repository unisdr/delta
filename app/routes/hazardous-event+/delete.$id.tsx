import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";

import {
	hazardousEventById,
	hazardousEventDelete
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema";
import { getTenantContext } from "~/util/tenant";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const action = createDeleteAction({
	baseRoute: "/hazardous-event",
	delete: async (id: string) => {
		// Get user session and tenant context
		const userSession = (action as any).userSession;
		if (!userSession) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const tenantContext = await getTenantContext(userSession);
		return hazardousEventDelete(id, tenantContext);
	},
	tableName: getTableName(hazardousEventTable),
	getById: async (id: string) => {
		// Get user session and tenant context
		const userSession = (action as any).userSession;
		if (!userSession) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const tenantContext = await getTenantContext(userSession);
		return hazardousEventById(id, tenantContext);
	},
	postProcess: async (_id, data) => {
		ContentRepeaterUploadFile.delete(data.attachments);
	}
});



