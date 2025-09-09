import { type LoaderFunctionArgs } from "@remix-run/node";
import { dr } from "~/db.server"; 

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) {
    throw new Response("Missing ID", { status: 400 });
  }
  const result = await dr.query.divisionTable.findFirst({
    where: (divisionTable, { eq }) => eq(divisionTable.id, id),
  });

  if (!result?.geojson) {
    throw new Response("GeoJSON not found", { status: 404 });
  }

  return  Response.json({geojson: result.geojson });
}
