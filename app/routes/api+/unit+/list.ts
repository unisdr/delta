import {
  unitTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export let loader = createApiListLoader(
  unitTable,
  async (offsetLimit) => {
    return dr.query.unitTable.findMany({
      ...offsetLimit,
      columns: {id: true, name: true},
      orderBy: [desc(unitTable.name)],
    });
  },
  [desc(unitTable.name)]
)
