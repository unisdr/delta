import {getTableName} from "drizzle-orm"
import {createDeleteAction} from "~/backend.server/handlers/form"
import {lossesById, lossesDeleteById} from "~/backend.server/models/losses"
import {lossesTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/losses"

import {ContentRepeaterUploadFile} from "~/components/ContentRepeater/UploadFile";

export const action = createDeleteAction({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	redirectToError: (id: string) => route + "/" + id,
	baseRoute: route,
	delete: lossesDeleteById,
	tableName: getTableName(lossesTable),
	getById: lossesById,
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`Data before deletion:`, data);

		ContentRepeaterUploadFile.delete(data.attachments);
	},
})

