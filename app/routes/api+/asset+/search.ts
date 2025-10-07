import {
  assetTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc, sql} from "drizzle-orm";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  let assets = await dr.query.assetTable.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: [asc(assetTable.name)],
    ...(query
      ? {
          where: sql`lower(${assetTable.name}) LIKE ${`%${query.toLowerCase()}%`}`,
        }
      : {}),
		limit: 25
  });

  return Response.json(assets);
});

