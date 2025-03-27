import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form";
import {
  disasterRecordsById,
  disasterRecordsDeleteById,
} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema";

import { route } from "~/frontend/disaster-record/form";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export const action = createDeleteAction({
  baseRoute: route,
  delete: disasterRecordsDeleteById,
  tableName: getTableName(disasterRecordsTable),
  getById: disasterRecordsById,
  postProcess: async (id, data) => {
    //console.log(`Post-processing record: ${id}`);
    //console.log(`data: `, data);
    ContentRepeaterUploadFile.delete(data.attachments);
  }
});
