import { disasterRecordsTable } from "~/drizzle/schema";

import { authLoaderIsPublic } from "~/util/auth";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, eq, desc, or, sql } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { approvalStatusIds } from "~/frontend/approval";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["disasterEventUUID", "disasterRecordUUID"];
	const filters: {
		approvalStatus?: approvalStatusIds;
		disasterEventUUID: string;
		disasterRecordUUID: string;
	} = {
		approvalStatus: "published",
		disasterEventUUID: url.searchParams.get("disasterEventUUID") || "",
		disasterRecordUUID: url.searchParams.get("disasterRecordUUID") || "",
	};

	const isPublic = authLoaderIsPublic(loaderArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "Disaster Tracking System";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	if (!isPublic) {
		filters.approvalStatus = undefined;
	}

	filters.disasterEventUUID = filters.disasterEventUUID.trim();

	let searchDisasterEventUIID = "%" + filters.disasterEventUUID + "%";
	let searchDisasterRecordUIID = "%" + filters.disasterRecordUUID + "%";

	let condition = and(
		countryAccountsId
			? eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			: undefined,
		filters.approvalStatus
			? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.disasterEventUUID !== ""
			? or(
					sql`${disasterRecordsTable.disasterEventId}::text ILIKE ${searchDisasterEventUIID}`
			  )
			: undefined,
		filters.disasterRecordUUID !== ""
			? sql`${disasterRecordsTable.id}::text ILIKE ${searchDisasterRecordUIID}`
			: undefined
	);

	const count = await dr.$count(disasterRecordsTable, condition);
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.disasterRecordsTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				disasterEventId: true,
				approvalStatus: true,
				startDate: true,
				endDate: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: [desc(disasterRecordsTable.updatedAt)],
			where: condition,
		});
	};

	const res = await executeQueryForPagination3(
		request,
		count,
		events,
		extraParams
	);
	console.log("res =", res);

	return {
		isPublic,
		filters,
		data: res,
		instanceName,
	};
}
