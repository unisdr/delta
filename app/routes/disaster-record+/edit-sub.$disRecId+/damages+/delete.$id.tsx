import {getTableName} from "drizzle-orm"
import {damagesById, damagesDeleteById} from "~/backend.server/models/damages"
import {damagesTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/damages"

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import {createDeleteAction} from "~/backend.server/handlers/form";

export const action = createDeleteAction({
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
