import { and, eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema";

export async function getDisasterRecordsByIdAndCountryAccountsId(
	id: string,
	countryAccountsId: string
) {
	if (!id || typeof id !== "string") return null;
	const [disasterRecords] = await dr
		.select()
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.id, id),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	return disasterRecords || null;
}
