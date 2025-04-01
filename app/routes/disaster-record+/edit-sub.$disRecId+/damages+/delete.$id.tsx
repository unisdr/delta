import {getTableName} from "drizzle-orm"
import {damagesById, damagesDeleteById} from "~/backend.server/models/damages"
import {damagesTable} from "~/drizzle/schema"

import {route2} from "~/frontend/damages"

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import {createDeleteAction} from "~/backend.server/handlers/form/form";

export const action = createDeleteAction({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	delete: damagesDeleteById,
	tableName: getTableName(damagesTable),
	getById: damagesById,
	postProcess: async (_id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);
		ContentRepeaterUploadFile.delete(data.attachments);
	}
})
