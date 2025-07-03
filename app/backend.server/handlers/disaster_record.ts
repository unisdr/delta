import {
	disasterRecordsTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic,
	authLoaderGetAuth
} from "~/util/auth";

import { getTenantContext, type TenantContext } from "~/util/tenant";

import { dr } from "~/db.server";

import { executeQueryForPagination3, OffsetLimit } from "~/frontend/pagination/api.server";

import { and, eq, desc, or, ilike, sql } from 'drizzle-orm';

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import { approvalStatusIds } from '~/frontend/approval';

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["search"]
	const filters: {
		approvalStatus?: approvalStatusIds;
		search: string;
	} = {
		approvalStatus: "published",
		search: url.searchParams.get("search") || "",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	// Extract tenant context for authenticated users
	let tenantContext: TenantContext | null = null;
	if (!isPublic) {
		const userSession = authLoaderGetAuth(loaderArgs);
		if (userSession) {
			tenantContext = await getTenantContext(userSession);
		}
		filters.approvalStatus = undefined
	}

	filters.search = filters.search.trim()

	let searchIlike = "%" + filters.search + "%"

	let condition = and(
		// Tenant isolation - filter by tenant context if available
		tenantContext ? eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId) : undefined,
		filters.approvalStatus ? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus) : undefined,
		filters.search !== "" ? or(
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
			ilike(disasterRecordsTable.dataCollector, searchIlike),
		) : undefined,
	)

	const count = await dr.$count(disasterRecordsTable, condition)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.disasterRecordsTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				disasterEventId: true,
				approvalStatus: true,
				startDate: true,
				endDate: true,
			},
			orderBy: [desc(disasterRecordsTable.updatedAt)],
			where: condition
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)

	return {
		isPublic,
		filters,
		data: res,
	}

}


