import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";

import {
	disasterEventById,
	disasterEventDelete
} from "~/backend.server/models/event";
import { disasterEventTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

import {
	route,
} from "~/frontend/events/disastereventform";

export const action = createDeleteAction({
	baseRoute: route,
	delete: disasterEventDelete,
	tableName: getTableName(disasterEventTable),
	getById: disasterEventById,
	postProcess: async (_id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
});



