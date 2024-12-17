import {
	resourceRepoTable,
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

interface resourceRepoLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function resourceRepoLoader(args: resourceRepoLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;


	const filters: {approvalStatus?: approvalStatusIds} = {
		approvalStatus: "approved",
	};

	const isPublic = authLoaderIsPublic(loaderArgs)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	const count = await dr.$count(resourceRepoTable)
	const events = async (offsetLimit: OffsetLimit) => {

		return await dr.query.resourceRepoTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				title: true,
				summary: true,
			},
			orderBy: [desc(resourceRepoTable.updatedAt)],
			where: and(
				filters.approvalStatus ? eq(resourceRepoTable.approvalStatus, filters.approvalStatus) : undefined,
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


