import {
	assetTable,
	sectorTable,
} from '~/drizzle/schema';

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {and, asc, or, ilike, sql, eq} from 'drizzle-orm';

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {stringToBoolean} from '~/util/string';
import { getCountryAccountsIdFromSession} from '~/util/session';

interface assetLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function assetLoader(args: assetLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const url = new URL(request.url);
	const extraParams = ["search", "builtIn"]
	const rawBuiltIn = url.searchParams.get("builtIn")

	const filters: {
		search: string
		builtIn?: boolean
	} = {
		search: url.searchParams.get("search") || "",
		builtIn: rawBuiltIn === "" || rawBuiltIn == null ? undefined : stringToBoolean(rawBuiltIn),
	}

	filters.search = filters.search.trim()
	let searchIlike = "%" + filters.search + "%"

	let condition = and(
		eq(
			assetTable.countryAccountsId,
			countryAccountsId
		),
		filters.search !== "" ? or(
			sql`${assetTable.id}::text ILIKE ${searchIlike}`,
			ilike(assetTable.nationalId, searchIlike),
			ilike(assetTable.name, searchIlike),
			ilike(assetTable.category, searchIlike),
			ilike(assetTable.notes, searchIlike),
			ilike(assetTable.sectorIds, searchIlike),
		) : undefined,
		filters.builtIn !== undefined ? eq(assetTable.isBuiltIn, filters.builtIn) : undefined
	)

	const count = await dr.$count(assetTable, condition)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.assetTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				name: true,
				sectorIds: true,
				isBuiltIn: true
			},
			extras: {
				sectorNames: sql`
		(
			SELECT string_agg(s.sectorname, ', ')
			FROM ${sectorTable} s
			WHERE s.id = ANY(string_to_array(${assetTable.sectorIds}, ',')::int[])
		)
	`.as('sector_names'),
			},
			orderBy: [asc(assetTable.name)],
			where: condition
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)

	return {
		filters,
		data: res,
	}

}

