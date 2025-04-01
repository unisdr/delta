import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import { devExample1ById, devExample1DeleteById } from "~/backend.server/models/dev_example1";
import { devExample1Table } from "~/drizzle/schema";

import { route } from "~/frontend/dev_example1";

export const action = createDeleteAction({
  baseRoute: route,
  delete: devExample1DeleteById,
  tableName: getTableName(devExample1Table),
  getById: devExample1ById
});
