import { disasterRecordsTable } from "~/drizzle/schema";

import { authLoaderIsPublic } from "~/util/auth";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, eq, desc, or, ilike, sql } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { approvalStatusIds } from "~/frontend/approval";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["search"];
	const filters: {
		approvalStatus?: approvalStatusIds;
		search: string;
	} = {
		approvalStatus: "published",
		search: url.searchParams.get("search") || "",
	};

	const isPublic = authLoaderIsPublic(loaderArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName="Disaster Tracking System"
	if(countryAccountsId){
		const settigns= await getCountrySettingsFromSession(request);
		instanceName=settigns.websiteName;
	}
	

	if (!isPublic) {
		filters.approvalStatus = undefined
	}


	filters.search = filters.search.trim();

	let searchIlike = "%" + filters.search + "%";

	let condition = and(
		countryAccountsId
			? eq(
					disasterRecordsTable.countryAccountsId,
					countryAccountsId
			  )
			: undefined,
		filters.approvalStatus
			? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.search !== ""
			? or(
					sql`${disasterRecordsTable.id}::text ILIKE ${searchIlike}`,
					sql`${disasterRecordsTable.disasterEventId}::text ILIKE ${searchIlike}`,
					ilike(disasterRecordsTable.locationDesc, searchIlike),
					ilike(disasterRecordsTable.startDate, searchIlike),
					ilike(disasterRecordsTable.endDate, searchIlike),
					ilike(disasterRecordsTable.localWarnInst, searchIlike),
					ilike(disasterRecordsTable.primaryDataSource, searchIlike),
					ilike(disasterRecordsTable.otherDataSource, searchIlike),
					ilike(disasterRecordsTable.assessmentModes, searchIlike),
					ilike(disasterRecordsTable.originatorRecorderInst, searchIlike),
					ilike(disasterRecordsTable.validatedBy, searchIlike),
					ilike(disasterRecordsTable.checkedBy, searchIlike),
					ilike(disasterRecordsTable.dataCollector, searchIlike)
			  )
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

	return {
		isPublic,
		filters,
		data: res,
		instanceName
	};
}
