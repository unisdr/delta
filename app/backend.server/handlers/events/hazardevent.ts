import {
	hazardEventTable,
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

interface hazardEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function hazardEventsLoader(args: hazardEventLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;

	const url = new URL(request.url);
	let extraParams = ["hazardId"];

	const filters: {hazardId: string; approvalStatus?: approvalStatusIds} = {
		hazardId: url.searchParams.get("hazardId") || "",
		approvalStatus: "approved",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	const count = await dr.$count(hazardEventTable)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.hazardEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hazardId: true,
				startDate: true,
				endDate: true,
				description: true,
				approvalStatus: true,
			},
			orderBy: [desc(hazardEventTable.startDate)],
			with: {
				hazard: {
					columns: {
						nameEn: true,
					},
				}
			},
			where: and(
				filters.hazardId ? eq(hazardEventTable.hazardId, filters.hazardId) : undefined,
				filters.approvalStatus ? eq(hazardEventTable.approvalStatus, filters.approvalStatus) : undefined,
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

