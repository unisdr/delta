import { getTableName } from "drizzle-orm";
import {
	createDeleteAction,
} from "~/backend.server/handlers/form/form";


import {
	hazardousEventById,
	hazardousEventDelete
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const action = createDeleteAction({
	baseRoute: "/hazardous-event",
	delete: hazardousEventDelete,
	tableName: getTableName(hazardousEventTable),
	getById: hazardousEventById,
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);
		ContentRepeaterUploadFile.delete(data.attachments);
	}
});



