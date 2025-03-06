import {
	hazardousEventTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {and, eq, desc} from 'drizzle-orm';

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {approvalStatusIds} from '~/frontend/approval';

interface hazardousEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function hazardousEventsLoader(args: hazardousEventLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;

	const url = new URL(request.url);
	let extraParams = ["hazardId"];

	const filters: {
		hipHazardId: string;
		hipClusterId: string;
		hipTypeId: string;
		approvalStatus?: approvalStatusIds
	} = {
		hipHazardId: url.searchParams.get("hipHazardId") || "",
		hipClusterId: url.searchParams.get("hipClusterId") || "",
		hipTypeId: url.searchParams.get("hipTypeId") || "",
		approvalStatus: "published",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	const count = await dr.$count(hazardousEventTable)
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
			orderBy: [desc(hazardousEventTable.startDate)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				}
			},
			where: and(
				filters.hipHazardId ? eq(hazardousEventTable.hipHazardId, filters.hipHazardId) : undefined,
				filters.hipClusterId ? eq(hazardousEventTable.hipClusterId, filters.hipClusterId) : undefined,
				filters.hipTypeId ? eq(hazardousEventTable.hipTypeId, filters.hipTypeId) : undefined,
				filters.approvalStatus ? eq(hazardousEventTable.approvalStatus, filters.approvalStatus) : undefined,
			),
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

