import { getTableName } from "drizzle-orm";
import { createDeleteLoader } from "~/backend.server/handlers/form";
import {
  disasterRecordsById,
  disasterRecordsDeleteById,
} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema";

import { route } from "~/frontend/disaster-record/form";

export const loader = createDeleteLoader({
  baseRoute: route,
  delete: disasterRecordsDeleteById,
  tableName: getTableName(disasterRecordsTable),
  getById: disasterRecordsById,
});
