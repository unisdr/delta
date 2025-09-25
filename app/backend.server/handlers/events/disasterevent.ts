import { disasterEventTable } from "~/drizzle/schema";

import { authLoaderIsPublic } from "~/util/auth";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { hazardBasicInfoJoin } from "~/backend.server/models/event";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { approvalStatusIds } from "~/frontend/approval";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";

interface disasterEventLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterEventsLoader(args: disasterEventLoaderArgs) {
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

	if (!isPublic) {
		filters.approvalStatus = undefined;
	}

	filters.search = filters.search.trim();

	let searchIlike = "%" + filters.search + "%";

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "Disaster Tracking System";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	let condition = and(
		countryAccountsId
			? eq(disasterEventTable.countryAccountsId, countryAccountsId)
			: undefined,
		filters.approvalStatus
			? eq(disasterEventTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.search !== ""
			? or(
					filters.search
						? or(
								sql`${disasterEventTable.id}::text ILIKE ${searchIlike}`,
								sql`${disasterEventTable.hazardousEventId}::text ILIKE ${searchIlike}`,
								sql`${disasterEventTable.disasterEventId}::text ILIKE ${searchIlike}`,
								eq(disasterEventTable.nationalDisasterId, searchIlike),
								eq(disasterEventTable.otherId1, searchIlike),
								eq(disasterEventTable.otherId2, searchIlike),
								eq(disasterEventTable.otherId3, searchIlike),
								eq(disasterEventTable.glide, searchIlike),
								ilike(disasterEventTable.nameNational, searchIlike),
								ilike(disasterEventTable.nameGlobalOrRegional, searchIlike),
								ilike(disasterEventTable.startDate, searchIlike),
								ilike(disasterEventTable.endDate, searchIlike),
								ilike(disasterEventTable.startDateLocal, searchIlike),
								ilike(disasterEventTable.endDateLocal, searchIlike),
								ilike(
									disasterEventTable.disasterDeclarationTypeAndEffect1,
									searchIlike
								),
								ilike(
									disasterEventTable.disasterDeclarationTypeAndEffect2,
									searchIlike
								),
								ilike(
									disasterEventTable.disasterDeclarationTypeAndEffect3,
									searchIlike
								),
								ilike(
									disasterEventTable.disasterDeclarationTypeAndEffect4,
									searchIlike
								),
								ilike(
									disasterEventTable.disasterDeclarationTypeAndEffect5,
									searchIlike
								),
								ilike(
									disasterEventTable.officialWarningAffectedAreas,
									searchIlike
								),
								ilike(disasterEventTable.earlyActionDescription1, searchIlike),
								ilike(disasterEventTable.earlyActionDescription2, searchIlike),
								ilike(disasterEventTable.earlyActionDescription3, searchIlike),
								ilike(disasterEventTable.earlyActionDescription4, searchIlike),
								ilike(disasterEventTable.earlyActionDescription5, searchIlike),
								ilike(
									disasterEventTable.rapidOrPreliminaryAssessmentDescription1,
									searchIlike
								),
								ilike(
									disasterEventTable.rapidOrPreliminaryAssessmentDescription2,
									searchIlike
								),
								ilike(
									disasterEventTable.rapidOrPreliminaryAssessmentDescription3,
									searchIlike
								),
								ilike(
									disasterEventTable.rapidOrPreliminaryAssessmentDescription4,
									searchIlike
								),
								ilike(
									disasterEventTable.rapidOrPreliminaryAssessmentDescription5,
									searchIlike
								),
								ilike(disasterEventTable.responseOperations, searchIlike),
								ilike(
									disasterEventTable.postDisasterAssessmentDescription1,
									searchIlike
								),
								ilike(
									disasterEventTable.postDisasterAssessmentDescription2,
									searchIlike
								),
								ilike(
									disasterEventTable.postDisasterAssessmentDescription3,
									searchIlike
								),
								ilike(
									disasterEventTable.postDisasterAssessmentDescription4,
									searchIlike
								),
								ilike(
									disasterEventTable.postDisasterAssessmentDescription5,
									searchIlike
								),
								ilike(
									disasterEventTable.otherAssessmentDescription1,
									searchIlike
								),
								ilike(
									disasterEventTable.otherAssessmentDescription2,
									searchIlike
								),
								ilike(
									disasterEventTable.otherAssessmentDescription3,
									searchIlike
								),
								ilike(
									disasterEventTable.otherAssessmentDescription4,
									searchIlike
								),
								ilike(
									disasterEventTable.otherAssessmentDescription5,
									searchIlike
								),
								ilike(disasterEventTable.dataSource, searchIlike),
								ilike(disasterEventTable.recordingInstitution, searchIlike),
								ilike(disasterEventTable.nonEconomicLosses, searchIlike),
								ilike(
									disasterEventTable.responseOperationsDescription,
									searchIlike
								),
								ilike(
									disasterEventTable.humanitarianNeedsDescription,
									searchIlike
								)
						  )
						: undefined
			  )
			: undefined
	);

	const count = await dr.$count(disasterEventTable, condition);
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDate: true,
				endDate: true,
				approvalStatus: true,
			},
			with: {
				hazardousEvent: {
					with: hazardBasicInfoJoin,
				},
			},
			orderBy: [desc(disasterEventTable.updatedAt)],
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
