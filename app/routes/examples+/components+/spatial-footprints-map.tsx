import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server";
import { sql, eq } from "drizzle-orm";
import {
  disasterRecordsTable,
  disruptionTable,
  lossesTable,
  damagesTable,
} from "~/drizzle/schema";
import SpatialFootprintMapViewer from "~/components/SpatialFootprintMapViewer";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const disasterId =
    url.searchParams.get("disasterId") || "f27095d8-b49a-4f87-8380-e15526b5fefb";

  const disasterRecord = await dr
    .select({
      disaster_id: disasterRecordsTable.id,
      disaster_spatial_footprint: disasterRecordsTable.spatialFootprint,
      disruptions: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${disruptionTable.id},
              'spatial_footprint', ${disruptionTable.spatialFootprint}
            )
          ) FILTER (WHERE ${disruptionTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("disruptions"),
      losses: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${lossesTable.id},
              'spatial_footprint', ${lossesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${lossesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("losses"),
      damages: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${damagesTable.id},
              'spatial_footprint', ${damagesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${damagesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("damages"),
    })
    .from(disasterRecordsTable)
    .leftJoin(disruptionTable, eq(disasterRecordsTable.id, disruptionTable.recordId))
    .leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
    .leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
    .where(eq(disasterRecordsTable.id, disasterId))
    .groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

  return { disasterRecord };
};

export default function MapPage() {
  const { disasterRecord } = useLoaderData<typeof loader>();

  return (
    <div>
      <SpatialFootprintMapViewer dataSource={disasterRecord} />
    </div>
  );
}
