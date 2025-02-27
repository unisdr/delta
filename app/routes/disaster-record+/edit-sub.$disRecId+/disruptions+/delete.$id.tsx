import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {disruptionById, disruptionDeleteById} from "~/backend.server/models/disruption"
import {disruptionTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/disruption"

import {ContentRepeaterUploadFile} from "~/components/ContentRepeater/UploadFile";

export const loader = createDeleteLoader({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	redirectToError: (id: string) => route + "/" + id,
	delete: disruptionDeleteById,
	tableName: getTableName(disruptionTable),
	getById: disruptionById,
	postProcess: async (id, data) => {
		console.log(`Post-processing record: ${id}`);
		console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
})
