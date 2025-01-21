import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

export const loader: LoaderFunction = async () => {
  // Fetch all sectors from the database
  const sectors = await dr.select().from(sectorTable).orderBy(sectorTable.name);
  return json(sectors);
};