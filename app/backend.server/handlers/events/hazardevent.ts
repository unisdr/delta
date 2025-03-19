import {
	hazardousEventTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {and, eq, desc, ilike, or} from 'drizzle-orm';

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {approvalStatusIds} from '~/frontend/approval';
import {isValidUUID} from '~/util/id';

interface hazardousEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function hazardousEventsLoader(args: hazardousEventLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["hipHazardId", "hipClusterId", "hipTypeId", "search"]

	const filters: {
		hipHazardId: string;
		hipClusterId: string;
		hipTypeId: string;
		approvalStatus?: approvalStatusIds
		search: string;
	} = {
		hipHazardId: url.searchParams.get("hipHazardId") || "",
		hipClusterId: url.searchParams.get("hipClusterId") || "",
		hipTypeId: url.searchParams.get("hipTypeId") || "",
		approvalStatus: "published",
		search: url.searchParams.get("search") || "",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	let searchIlike = "%" + filters.search + "%"
	let isValidUUID2 = isValidUUID(filters.search)

	let condition = and(
		filters.hipHazardId ? eq(hazardousEventTable.hipHazardId, filters.hipHazardId) : undefined,
		filters.hipClusterId ? eq(hazardousEventTable.hipClusterId, filters.hipClusterId) : undefined,
		filters.hipTypeId ? eq(hazardousEventTable.hipTypeId, filters.hipTypeId) : undefined,
		filters.approvalStatus ? eq(hazardousEventTable.approvalStatus, filters.approvalStatus) : undefined,
		filters.search ? or(
			isValidUUID2 ? eq(hazardousEventTable.id, filters.search): undefined,
			ilike(hazardousEventTable.description, searchIlike))
			: undefined,
	)

	const count = await dr.$count(hazardousEventTable, condition)

	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hipHazardId: true,
				startDate: true,
				endDate: true,
				description: true,
				approvalStatus: true,
			},
			orderBy: [desc(hazardousEventTable.updatedAt)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				}
			},
			where: condition
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)
	let hip = await dataForHazardPicker();

	return {
		isPublic,
		filters,
		hip,
		data: res,
	}

}

