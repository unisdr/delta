import {
	disasterRecordsTable,
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

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;


	const filters: {approvalStatus?: approvalStatusIds} = {
		approvalStatus: "published",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	const count = await dr.$count(disasterRecordsTable)
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
			where: and(
				filters.approvalStatus ? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus) : undefined,
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


