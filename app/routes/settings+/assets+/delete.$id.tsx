import { getTableName } from "drizzle-orm";
import { createDeleteLoader } from "~/backend.server/handlers/form";
import { assetById, assetDeleteById } from "~/backend.server/models/asset";
import { assetTable } from "~/drizzle/schema";

import { route } from "~/frontend/asset";

export let loader = createDeleteLoader({
  baseRoute: route,
  delete: assetDeleteById,
  tableName: getTableName(assetTable),
  getById: assetById
})
