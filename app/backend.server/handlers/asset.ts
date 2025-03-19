import {
	assetTable,
} from '~/drizzle/schema';

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {and, eq, desc, or, ilike} from 'drizzle-orm';

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {isValidUUID} from '~/util/id';

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

	let searchIlike = "%" + filters.search + "%"
	let isValidUUID2 = isValidUUID(filters.search)

	let condition = and(
		filters.search !== "" ? or(
			isValidUUID2 ? eq(assetTable.id, filters.search) : undefined,
			isValidUUID2 ? eq(assetTable.nationalId, filters.search) : undefined,
			ilike(assetTable.name, searchIlike),
			ilike(assetTable.category, searchIlike),
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

