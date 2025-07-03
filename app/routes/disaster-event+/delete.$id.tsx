import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";

import {
	disasterEventById,
	disasterEventDelete
} from "~/backend.server/models/event";
import { disasterEventTable } from "~/drizzle/schema";
import { getTenantContext } from "~/util/tenant";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

import {
	route,
} from "~/frontend/events/disastereventform";

export const action = createDeleteAction({
	baseRoute: route,
	delete: async (id: string) => {
		// Get user session and tenant context
		const userSession = (action as any).userSession;
		if (!userSession) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const tenantContext = await getTenantContext(userSession);
		return disasterEventDelete(id, tenantContext);
	},
	tableName: getTableName(disasterEventTable),
	getById: async (id: string) => {
		// Get user session and tenant context
		const userSession = (action as any).userSession;
		if (!userSession) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const tenantContext = await getTenantContext(userSession);
		return disasterEventById(id, tenantContext);
	},
	postProcess: async (_id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
});



