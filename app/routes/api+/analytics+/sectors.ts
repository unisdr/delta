import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { userTable } from "~/drizzle/schema";

export const loader: LoaderFunction = async () => {
  const sectors = await dr.select().from(userTable).orderBy(userTable.firstName);
  return json(sectors);
};