import {
  assetTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export let loader = createApiListLoader(
  assetTable,
  async (offsetLimit) => {
    return dr.query.assetTable.findMany({
      ...offsetLimit,
      columns: {id: true, name: true, nationalId: true, notes: true},
      orderBy: [desc(assetTable.name)],
    });
  },
  [desc(assetTable.name)]
)
