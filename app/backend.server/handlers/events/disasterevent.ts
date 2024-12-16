import {
	disasterEventTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";


import {and, eq, desc} from 'drizzle-orm';


import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {approvalStatusIds} from '~/frontend/approval';

interface disasterEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function disasterEventsLoader(args: disasterEventLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;


	const filters: {approvalStatus?: approvalStatusIds} = {
		approvalStatus: "approved",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	const count = await dr.$count(disasterEventTable)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDateUTC: true,
				endDateUTC: true,
			},
			orderBy: [desc(disasterEventTable.startDateUTC)],
			where: and(
				filters.approvalStatus ? eq(disasterEventTable.approvalStatus, filters.approvalStatus) : undefined,
			),
		})
	}

	const res = await executeQueryForPagination3(request, count, events, [])

	return {
		isPublic,
		filters,
		data: res,
	}

}


