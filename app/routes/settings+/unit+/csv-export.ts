import {
  unitTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export let loader = csvExportLoader({
  table: unitTable,
  fetchData: () => {
    return dr.query.unitTable.findMany({
      orderBy: [asc(unitTable.id)],
    });
  },
})
