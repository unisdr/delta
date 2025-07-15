import { desc, eq, sql } from "drizzle-orm";
import { dr } from "../../db.server";
import { divisionTable } from "../../drizzle/schema";

export async function getDivisionByCountryAccountsId(
	countryAccountsId: string,
	offset: number,
	pageSize: number
) {
	const data = await dr.query.divisionTable.findMany({
		columns: {
			id: true,
			importId: true,
			nationalId: true,
			parentId: true,
			name: true,
			level: true,
		},
		extras: {
			hasGeoData: sql`${divisionTable.geojson} IS NOT NULL`.as("hasGeoData"),
		},
		where: eq(divisionTable.countryAccountsId, countryAccountsId),
		orderBy: [desc(divisionTable.id)],
		limit: pageSize,
		offset: offset,
	});

	return data;
}

export async function getDivisionCountByCountryAccountsId(countryAccountsId: string) {
	return await dr.$count(
		divisionTable,
		eq(divisionTable.countryAccountsId, countryAccountsId)
	);
}
