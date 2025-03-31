import {getTableName} from "drizzle-orm"
import {createDeleteAction} from "~/backend.server/handlers/form/form"
import {disruptionById, disruptionDeleteById} from "~/backend.server/models/disruption"
import {disruptionTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/disruption"

import {ContentRepeaterUploadFile} from "~/components/ContentRepeater/UploadFile";

export const action = createDeleteAction({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	delete: disruptionDeleteById,
	tableName: getTableName(disruptionTable),
	getById: disruptionById,
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
})
