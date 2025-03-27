import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form";
import { unitById, unitDeleteById } from "~/backend.server/models/unit";
import { unitTable } from "~/drizzle/schema";

import { route } from "~/frontend/unit";

export let action = createDeleteAction({
  baseRoute: route,
  delete: unitDeleteById,
  tableName: getTableName(unitTable),
  getById: unitById
})
