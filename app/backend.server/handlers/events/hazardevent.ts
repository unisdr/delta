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
import { getCountryAccountsIdFromSession, sessionCookie } from '~/util/session';

export async function hazardousEventsLoader(args: LoaderFunctionArgs) {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw redirect("/user/select-instance");
	}

	const url = new URL(request.url);
	const extraParams = [
		"hipHazardId", "hipClusterId", "hipTypeId", "search",
		"fromDate", "toDate", "recordingOrganization", 
		"hazardousEventStatus", "recordStatus", 
		"viewMyRecords", "pendingMyAction"
	]

	const filters: {
		hipHazardId: string;
		hipClusterId: string;
		hipTypeId: string;
		approvalStatus?: approvalStatusIds;
		search: string;
		// New filter parameters
		fromDate?: string;
		toDate?: string;
		recordingOrganization?: string;
		hazardousEventStatus?: string;
		recordStatus?: string;
		viewMyRecords?: boolean;
		pendingMyAction?: boolean;
		userId?: string; // For user-specific filters
	} = {
		// Existing filters
		hipHazardId: url.searchParams.get("hipHazardId") || "",
		hipClusterId: url.searchParams.get("hipClusterId") || "",
		hipTypeId: url.searchParams.get("hipTypeId") || "",
		approvalStatus: "published",
		search: url.searchParams.get("search") || "",
		
		// New filters
		fromDate: url.searchParams.get("fromDate") || "",
		toDate: url.searchParams.get("toDate") || "",
		recordingOrganization: url.searchParams.get("recordingOrganization") || "",
		hazardousEventStatus: url.searchParams.get("hazardousEventStatus") || "",
		recordStatus: url.searchParams.get("recordStatus") || "",
		viewMyRecords: url.searchParams.get("viewMyRecords") === "true",
		pendingMyAction: url.searchParams.get("pendingMyAction") === "true",
	};

	const isPublic = authLoaderIsPublic(args)

	if (!isPublic) {
		filters.approvalStatus = undefined
	}
	
	// Get user ID for user-specific filters
	const session = await sessionCookie().getSession(request.headers.get("Cookie"));
	const user = session.get("user");
	filters.userId = user?.id;

	filters.search = filters.search.trim()
	let searchIlike = "%" + filters.search + "%"

	let condition = and(
		// Existing filters
		countryAccountsId ? eq(hazardousEventTable.countryAccountsId, countryAccountsId) : undefined,
		filters.hipHazardId ? eq(hazardousEventTable.hipHazardId, filters.hipHazardId) : undefined,
		filters.hipClusterId ? eq(hazardousEventTable.hipClusterId, filters.hipClusterId) : undefined,
		filters.hipTypeId ? eq(hazardousEventTable.hipTypeId, filters.hipTypeId) : undefined,
		filters.approvalStatus ? eq(hazardousEventTable.approvalStatus, filters.approvalStatus) : undefined,
		
		// Date range filters (for event dates, not record creation)
		filters.fromDate ? sql`${hazardousEventTable.startDate} >= ${filters.fromDate}` : undefined,
		filters.toDate ? sql`${hazardousEventTable.endDate} <= ${filters.toDate}` : undefined,
		
		// Recording organization filter
		filters.recordingOrganization ? eq(hazardousEventTable.recordOriginator, filters.recordingOrganization) : undefined,
		
		// Hazardous event status filter
		filters.hazardousEventStatus ? eq(hazardousEventTable.hazardousEventStatus, filters.hazardousEventStatus as "forecasted" | "ongoing" | "passed") : undefined,
		
		// Record status filter (if not using approvalStatus)
		filters.recordStatus && !filters.approvalStatus ? eq(hazardousEventTable.approvalStatus, filters.recordStatus as any) : undefined,
		
		// User-specific filters - Note: These fields may need to be added to schema
		// For now, commenting out until proper user tracking fields are available
		// filters.viewMyRecords && filters.userId ? 
		// 	or(
		// 		eq(hazardousEventTable.createdBy, filters.userId),
		// 		eq(hazardousEventTable.assignedTo, filters.userId)
		// 	) : undefined,
		
		// Pending action filter - simplified for now
		filters.pendingMyAction ? 
			or(
				eq(hazardousEventTable.approvalStatus, "waiting-for-validation"),
				eq(hazardousEventTable.approvalStatus, "needs-revision")
			) : undefined,
		
		// Text search filter
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

	// Simple organizations list - this should be fetched from settings in the future
	const organizations = [
		{ id: "government", name: "Government Agency" },
		{ id: "ngo", name: "Non-Governmental Organization" },
		{ id: "private", name: "Private Sector" },
		{ id: "academic", name: "Academic Institution" },
		{ id: "international", name: "International Organization" },
		{ id: "other", name: "Other" }
	];

	return {
		isPublic,
		filters,
		hip,
		data: res,
		countryAccountsId,
		organizations,
	}
}
