import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import { measureById, measureDeleteById } from "~/backend.server/models/measure";
import { measureTable } from "~/drizzle/schema";

import { route } from "~/frontend/measure";

export const action = createDeleteAction({
  baseRoute: route,
  delete: measureDeleteById,
  tableName: getTableName(measureTable),
  getById: measureById
});

