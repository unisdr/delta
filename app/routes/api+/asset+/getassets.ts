import { LoaderFunction } from "@remix-run/server-runtime";
import { ilike, } from "drizzle-orm";
import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema";

export const loader:LoaderFunction = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const assets = await dr
    .select()
    .from(assetTable)
    .where(ilike(assetTable.name, `%${query}%`))
    .limit(20);

  return Response.json(assets);
};