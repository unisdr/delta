import { assetTable, sectorTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, asc, or, ilike, sql, eq } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { stringToBoolean } from "~/util/string";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

interface assetLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function assetLoader(args: assetLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	let instanceName = "Disaster Tracking System";

	if (countryAccountsId) {
		const settings = await getCountrySettingsFromSession(request);
		instanceName = settings.websiteName;
	}

	const url = new URL(request.url);
	const extraParams = ["search", "builtIn"];
	const rawBuiltIn = url.searchParams.get("builtIn");

	const filters: {
		search: string;
		builtIn?: boolean;
	} = {
		search: url.searchParams.get("search") || "",
		builtIn:
			rawBuiltIn === "" || rawBuiltIn == null
				? undefined
				: stringToBoolean(rawBuiltIn),
	};

	filters.search = filters.search.trim();
	let searchIlike = "%" + filters.search + "%";

	// Build tenant filter based on builtIn selection
	let tenantCondition;
	if (filters.builtIn === true) {
		// Show only built-in assets
		tenantCondition = eq(assetTable.isBuiltIn, true);
	} else if (filters.builtIn === false) {
		// Show only custom (instance-owned) assets
		tenantCondition = and(
			eq(assetTable.countryAccountsId, countryAccountsId),
			eq(assetTable.isBuiltIn, false)
		);
	} else {
		// Show ALL assets: both built-in AND instance-owned
		tenantCondition = or(
			eq(assetTable.isBuiltIn, true),
			eq(assetTable.countryAccountsId, countryAccountsId)
		);
	}

	// Build search condition
	let searchCondition =
		filters.search !== ""
			? or(
					sql`${assetTable.id}::text ILIKE ${searchIlike}`,
					ilike(assetTable.nationalId, searchIlike),
					ilike(assetTable.name, searchIlike),
					ilike(assetTable.category, searchIlike),
					ilike(assetTable.notes, searchIlike),
					ilike(assetTable.sectorIds, searchIlike)
			  )
			: undefined;

	// Combine conditions
	let condition = and(tenantCondition, searchCondition);

	const count = await dr.$count(assetTable, condition);
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.assetTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				name: true,
				sectorIds: true,
				isBuiltIn: true,
			},
			extras: {
				sectorNames: sql`
		(
			SELECT string_agg(s.sectorname, ', ')
			FROM ${sectorTable} s
			WHERE s.id = ANY(string_to_array(${assetTable.sectorIds}, ',')::uuid[])
		)
	`.as("sector_names"),
			},
			orderBy: [asc(assetTable.name)],
			where: condition,
		});
	};

	const res = await executeQueryForPagination3(
		request,
		count,
		events,
		extraParams
	);

	return {
		filters,
		data: res,
		instanceName
	};
}
