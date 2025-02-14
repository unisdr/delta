import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {disruptionById, disruptionDeleteById} from "~/backend.server/models/disruption"
import {disruptionTable} from "~/drizzle/schema"

import {route} from "~/frontend/disruption"

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: disruptionDeleteById,
	tableName: getTableName(disruptionTable),
	getById: disruptionById,
	postProcess: async (id, data) => {
		console.log(`Post-processing record: ${id}`);
		console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
})