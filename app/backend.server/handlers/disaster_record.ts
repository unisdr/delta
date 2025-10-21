import { disasterEventTable, disasterRecordsTable } from "~/drizzle/schema";

import { authLoaderIsPublic } from "~/util/auth";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, eq, desc, sql, ilike } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { approvalStatusIds } from "~/frontend/approval";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { getSectorByLevel } from "~/db/queries/sector";

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const extraParams = [
		"disasterEventUUID",
		"disasterRecordUUID",
		"recordStatus",
	];
	const filters: {
		approvalStatus?: approvalStatusIds;
		disasterEventName: string;
		disasterRecordUUID: string;
		recordStatus: string;
	} = {
		approvalStatus: "published",
		disasterEventName: url.searchParams.get("disasterEventName") || "",
		disasterRecordUUID: url.searchParams.get("disasterRecordUUID") || "",
		recordStatus: url.searchParams.get("recordStatus") || "",
	};
	const isPublic = authLoaderIsPublic(loaderArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	const sectors = await getSectorByLevel(2);

	if (!isPublic) {
		filters.approvalStatus = undefined;
	}

	filters.disasterEventName = filters.disasterEventName.trim();

	let searchDisasterEventName = "%" + filters.disasterEventName + "%";
	let searchDisasterRecordUIID = "%" + filters.disasterRecordUUID + "%";
	let searchRecordStatus = "%" + filters.recordStatus + "%";

	// build base condition
	let baseCondition = and(
		countryAccountsId
			? eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			: undefined,
		filters.approvalStatus
			? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.disasterRecordUUID !== ""
			? sql`${disasterRecordsTable.id}::text ILIKE ${searchDisasterRecordUIID}`
			: undefined,
		filters.recordStatus !== ""
			? sql`${disasterRecordsTable.approvalStatus}::text ILIKE ${searchRecordStatus}`
			: undefined
	);

	// count and select must now join the disasterEventTable
	const countResult = await dr
		.select({ count: sql<number>`count(*)` })
		.from(disasterRecordsTable)
		.leftJoin(
			disasterEventTable,
			eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
		)
		.where(
			and(
				baseCondition,
				filters.disasterEventName !== ""
					? ilike(disasterEventTable.nameNational, searchDisasterEventName)
					: undefined
			)
		);

	// extract numeric count
	const count = countResult[0]?.count ?? 0;

	// query with the same condition
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr
			.select({
				id: disasterRecordsTable.id,
				disasterEventId: disasterRecordsTable.disasterEventId,
				approvalStatus: disasterRecordsTable.approvalStatus,
				startDate: disasterRecordsTable.startDate,
				endDate: disasterRecordsTable.endDate,
				createdAt: disasterRecordsTable.createdAt,
				updatedAt: disasterRecordsTable.updatedAt,
				nameNational: disasterEventTable.nameNational,
			})
			.from(disasterRecordsTable)
			.leftJoin(
				disasterEventTable,
				eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
			)
			.where(
				and(
					baseCondition,
					filters.disasterEventName !== ""
						? ilike(disasterEventTable.nameNational, searchDisasterEventName)
						: undefined
				)
			)
			.orderBy(desc(disasterRecordsTable.updatedAt))
			.limit(offsetLimit.limit)
			.offset(offsetLimit.offset);
	};

	const res = await executeQueryForPagination3(
		request,
		count,
		events,
		extraParams
	);

	return {
		isPublic,
		filters,
		data: res,
		instanceName,
		sectors,
	};
}
