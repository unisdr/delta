import {
	disasterEventTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";

import {hazardBasicInfoJoin} from "~/backend.server/models/event"


import {and, eq, desc, ilike, or} from 'drizzle-orm';

import {
	LoaderFunctionArgs,
} from "@remix-run/node";
import {approvalStatusIds} from '~/frontend/approval';
import {isValidUUID} from '~/util/id';

interface disasterEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs
}

export async function disasterEventsLoader(args: disasterEventLoaderArgs) {
	const {loaderArgs} = args;
	const {request} = loaderArgs;

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

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	let searchIlike = "%" + filters.search + "%"

	let isValidUUID2 = isValidUUID(filters.search)

	let condition = and(
		filters.approvalStatus ? eq(disasterEventTable.approvalStatus, filters.approvalStatus) : undefined,
		filters.search !== "" ? or(
			isValidUUID2 ? eq(disasterEventTable.id, filters.search): undefined,
			isValidUUID2 ? eq(disasterEventTable.hazardousEventId, filters.search) : undefined,
			isValidUUID2 ? eq(disasterEventTable.disasterEventId, filters.search): undefined,
			eq(disasterEventTable.nationalDisasterId, filters.search),
			eq(disasterEventTable.otherId1, filters.search),
			eq(disasterEventTable.otherId2, filters.search),
			eq(disasterEventTable.otherId3, filters.search),
			eq(disasterEventTable.glide, filters.search),
			ilike(disasterEventTable.nameNational, searchIlike),
			ilike(disasterEventTable.nameGlobalOrRegional, searchIlike),
			ilike(disasterEventTable.disasterDeclarationTypeAndEffect1, searchIlike),
			ilike(disasterEventTable.disasterDeclarationTypeAndEffect2, searchIlike),
			ilike(disasterEventTable.disasterDeclarationTypeAndEffect3, searchIlike),
			ilike(disasterEventTable.disasterDeclarationTypeAndEffect4, searchIlike),
			ilike(disasterEventTable.disasterDeclarationTypeAndEffect5, searchIlike),
			ilike(disasterEventTable.officialWarningAffectedAreas, searchIlike),
			ilike(disasterEventTable.earlyActionDescription1, searchIlike),
			ilike(disasterEventTable.earlyActionDescription2, searchIlike),
			ilike(disasterEventTable.earlyActionDescription3, searchIlike),
			ilike(disasterEventTable.earlyActionDescription4, searchIlike),
			ilike(disasterEventTable.earlyActionDescription5, searchIlike),
			ilike(disasterEventTable.rapidOrPreliminaryAssessmentDescription1, searchIlike),
			ilike(disasterEventTable.rapidOrPreliminaryAssessmentDescription2, searchIlike),
			ilike(disasterEventTable.rapidOrPreliminaryAssessmentDescription3, searchIlike),
			ilike(disasterEventTable.rapidOrPreliminaryAssessmentDescription4, searchIlike),
			ilike(disasterEventTable.rapidOrPreliminaryAssessmentDescription5, searchIlike),
			ilike(disasterEventTable.responseOperations, searchIlike),
			ilike(disasterEventTable.postDisasterAssessmentDescription1, searchIlike),
			ilike(disasterEventTable.postDisasterAssessmentDescription2, searchIlike),
			ilike(disasterEventTable.postDisasterAssessmentDescription3, searchIlike),
			ilike(disasterEventTable.postDisasterAssessmentDescription4, searchIlike),
			ilike(disasterEventTable.postDisasterAssessmentDescription5, searchIlike),
			ilike(disasterEventTable.otherAssessmentDescription1, searchIlike),
			ilike(disasterEventTable.otherAssessmentDescription2, searchIlike),
			ilike(disasterEventTable.otherAssessmentDescription3, searchIlike),
			ilike(disasterEventTable.otherAssessmentDescription4, searchIlike),
			ilike(disasterEventTable.otherAssessmentDescription5, searchIlike),
			ilike(disasterEventTable.dataSource, searchIlike),
			ilike(disasterEventTable.recordingInstitution, searchIlike),
			ilike(disasterEventTable.nonEconomicLosses, searchIlike),
			ilike(disasterEventTable.responseOperationsDescription, searchIlike),
			ilike(disasterEventTable.humanitarianNeedsDescription, searchIlike),
		) : undefined,
	)

	const count = await dr.$count(disasterEventTable, condition)
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDate: true,
				endDate: true,
				approvalStatus: true
			},
			with: {
				hazardousEvent: {
					with: hazardBasicInfoJoin
				},
			},
			orderBy: [desc(disasterEventTable.updatedAt)],
			where: condition,
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)

	return {
		isPublic,
		filters,
		data: res,
	}

}


