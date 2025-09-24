import {
	hazardousEventTable,
} from '~/drizzle/schema';

import {
	authLoaderIsPublic
} from "~/util/auth";

import { dr } from "~/db.server";

import { executeQueryForPagination3, OffsetLimit } from "~/frontend/pagination/api.server";

import { sql, and, eq, desc, ilike, or } from 'drizzle-orm';

import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import {
	LoaderFunctionArgs,
	redirect,
} from "@remix-run/node";
import { approvalStatusIds } from '~/frontend/approval';
import { getCountryAccountsIdFromSession } from '~/util/session';

export async function hazardousEventsLoader(args: LoaderFunctionArgs) {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw redirect("/user/select-instance");
	}

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

	const isPublic = authLoaderIsPublic(args)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}

	filters.search = filters.search.trim()
	let searchIlike = "%" + filters.search + "%"

	let condition = and(
		countryAccountsId ? eq(hazardousEventTable.countryAccountsId, countryAccountsId) : undefined,
		filters.hipHazardId ? eq(hazardousEventTable.hipHazardId, filters.hipHazardId) : undefined,
		filters.hipClusterId ? eq(hazardousEventTable.hipClusterId, filters.hipClusterId) : undefined,
		filters.hipTypeId ? eq(hazardousEventTable.hipTypeId, filters.hipTypeId) : undefined,
		filters.approvalStatus ? eq(hazardousEventTable.approvalStatus, filters.approvalStatus) : undefined,
		filters.search ? or(
			sql`${hazardousEventTable.id}::text ILIKE ${searchIlike}`,
			ilike(hazardousEventTable.status, searchIlike),
			ilike(hazardousEventTable.nationalSpecification, searchIlike),
			ilike(hazardousEventTable.startDate, searchIlike),
			ilike(hazardousEventTable.endDate, searchIlike),
			ilike(hazardousEventTable.description, searchIlike),
			ilike(hazardousEventTable.chainsExplanation, searchIlike),
			ilike(hazardousEventTable.magnitude, searchIlike),
			ilike(hazardousEventTable.recordOriginator, searchIlike),
			ilike(hazardousEventTable.dataSource, searchIlike)
		) : undefined,
	)

	const count = await dr.$count(hazardousEventTable, condition)

	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hipHazardId: true,
				hipClusterId: true,
				hipTypeId: true,
				startDate: true,
				endDate: true,
				description: true,
				approvalStatus: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: [desc(hazardousEventTable.updatedAt)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				},
				hipCluster: {
					columns: {
						nameEn: true,
					},
				},
				hipType: {
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
		countryAccountsId,
	}
}
