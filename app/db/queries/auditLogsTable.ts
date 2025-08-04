import {
	auditLogsTable,
	userTable,
} from "../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { dr } from "~/db.server";

export async function getAllAuditLogsWithUserByTableNameAndRecordIdsAndCountryAccountsIdOrderByTimestampDesc(
	tableName: string,
	recordId: string,
	countryAccountsId: string
) {
	return await dr
		.select()
		.from(auditLogsTable)
		.innerJoin(userTable, eq(auditLogsTable.userId, userTable.id))
		.where(
			and(
				eq(auditLogsTable.countryAccountsId, countryAccountsId),
				eq(auditLogsTable.tableName, tableName),
				eq(auditLogsTable.recordId, recordId)
			)
		)
		.orderBy(desc(auditLogsTable.timestamp))
		.execute();
}
