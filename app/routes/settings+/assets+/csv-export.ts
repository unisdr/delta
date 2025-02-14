import {
  assetTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export"

export const loader = csvExportLoader({
  table: assetTable,
  fetchData: () => {
    return dr.query.assetTable.findMany({
      orderBy: [asc(assetTable.id)],
    })
  },
})
