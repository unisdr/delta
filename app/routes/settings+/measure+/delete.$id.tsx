import { getTableName } from "drizzle-orm";
import { createDeleteLoader } from "~/backend.server/handlers/form";
import { measureById, measureDeleteById } from "~/backend.server/models/measure";
import { measureTable } from "~/drizzle/schema";

import { route } from "~/frontend/measure";

export const loader = createDeleteLoader({
  baseRoute: route,
  delete: measureDeleteById,
  tableName: getTableName(measureTable),
  getById: measureById
});

