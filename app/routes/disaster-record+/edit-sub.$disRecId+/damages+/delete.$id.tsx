import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {damagesById, damagesDeleteById} from "~/backend.server/models/damages"
import {damagesTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/damages"

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const loader = createDeleteLoader({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	redirectToError: (id: string) => route + "/" + id,
	delete: damagesDeleteById,
	tableName: getTableName(damagesTable),
	getById: damagesById,
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);
		ContentRepeaterUploadFile.delete(data.attachments);
	}
})