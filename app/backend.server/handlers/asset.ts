import {
	assetTable,
} from '~/drizzle/schema';

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {and, desc, or, ilike, sql} from 'drizzle-orm';

import {
	LoaderFunctionArgs,
} from "@remix-run/node";

interface assetLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function assetLoader(args: assetLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["search"]
	const filters: {
		search: string;
	} = {
		search: url.searchParams.get("search") || "",
	};

	filters.search = filters.search.trim()
	let searchIlike = "%" + filters.search + "%"

	let condition = and(
		filters.search !== "" ? or(
			sql`${assetTable.id}::text ILIKE ${searchIlike}`,
			ilike(assetTable.nationalId, searchIlike),
			ilike(assetTable.name, searchIlike),
			ilike(assetTable.category, searchIlike),
			ilike(assetTable.notes, searchIlike),
			ilike(assetTable.sectorIds, searchIlike),
		) : undefined,
	)

	const count = await dr.$count(assetTable, condition)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.assetTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				name: true,
				sectorIds: true,
			},
			orderBy: [desc(assetTable.name)],
			where: condition
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)

	return {
		filters,
		data: res,
	}

}

