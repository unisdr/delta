import {
	disasterEventTable,
	disasterRecordsTable,
	sectorDisasterRecordsRelationTable,
} from '~/drizzle/schema';

import { authLoaderIsPublic } from '~/util/auth';

import { dr } from '~/db.server';

import { executeQueryForPagination3, OffsetLimit } from '~/frontend/pagination/api.server';

import { and, eq, desc, sql, ilike } from 'drizzle-orm';

import { LoaderFunctionArgs } from '@remix-run/node';
import { approvalStatusIds } from '~/frontend/approval';
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from '~/util/session';
import { getSectorByLevel } from '~/db/queries/sector';

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ['disasterEventUUID', 'disasterRecordUUID', 'recordStatus'];
	const filters: {
		approvalStatus?: approvalStatusIds;
		disasterEventName: string;
		disasterRecordUUID: string;
		recordStatus: string;
		fromDate: string;
		toDate: string;
		sectorId: string;
	} = {
		approvalStatus: 'published',
		disasterEventName: url.searchParams.get('disasterEventName') || '',
		disasterRecordUUID: url.searchParams.get('disasterRecordUUID') || '',
		recordStatus: url.searchParams.get('recordStatus') || '',
		fromDate: url.searchParams.get('fromDate') || '',
		toDate: url.searchParams.get('toDate') || '',
		sectorId: url.searchParams.get('sectorId') || '',
	};
	const isPublic = authLoaderIsPublic(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = 'DELTA Resilience';
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	const sectors = await getSectorByLevel(2);

	if (!isPublic) {
		filters.approvalStatus = undefined;
	}

	filters.disasterEventName = filters.disasterEventName.trim();

	let searchDisasterEventName = '%' + filters.disasterEventName + '%';
	let searchDisasterRecordUIID = '%' + filters.disasterRecordUUID + '%';
	let searchRecordStatus = '%' + filters.recordStatus + '%';

	// build base condition
	let baseCondition = and(
		countryAccountsId ? eq(disasterRecordsTable.countryAccountsId, countryAccountsId) : undefined,
		filters.approvalStatus
			? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.disasterRecordUUID !== ''
			? sql`${disasterRecordsTable.id}::text ILIKE ${searchDisasterRecordUIID}`
			: undefined,
		filters.recordStatus !== ''
			? sql`${disasterRecordsTable.approvalStatus}::text ILIKE ${searchRecordStatus}`
			: undefined,
		filters.fromDate
			? and(
					sql`${disasterRecordsTable.startDate} != ''`,
					sql`
					CASE
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY') >= TO_DATE(${filters.fromDate}, 'YYYY')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM') >= TO_DATE(${filters.fromDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM') >= TO_DATE(${filters.fromDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
					ELSE 
						${disasterRecordsTable.startDate} >= ${filters.fromDate}
					END
				`
			  )
			: undefined,
		filters.toDate
			? and(
					sql`${disasterRecordsTable.endDate} != ''`,
					sql`
					CASE
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY') <= TO_DATE(${filters.toDate}, 'YYYY')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM') <= TO_DATE(${filters.toDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM') <= TO_DATE(${filters.toDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
					ELSE 
						${disasterRecordsTable.endDate} <= ${filters.toDate}
					END
				`
			  )
			: undefined,
		filters.sectorId
			? sql`${sectorDisasterRecordsRelationTable.sectorId} = ANY(
    			ARRAY[${filters.sectorId}]::uuid[]
				||
				(
				SELECT ARRAY(
					SELECT (elem->>'id')::uuid
					FROM jsonb_array_elements(dts_get_sector_decendants(${filters.sectorId})::jsonb) AS elem
				)
				)
  			)`
			: undefined
	);

	// count and select must now join the disasterEventTable
	const countResult = await dr
		.select({ count: sql<number>`COUNT(DISTINCT ${disasterRecordsTable.id})` })
		.from(disasterRecordsTable)
		.leftJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
		)
		.where(
			and(
				baseCondition,
				filters.disasterEventName !== ''
					? ilike(disasterEventTable.nameNational, searchDisasterEventName)
					: undefined
			)
		);

	// extract numeric count
	const count = countResult[0]?.count ?? 0;

	// query with the same condition
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr
			.selectDistinct({
				id: disasterRecordsTable.id,
				disasterEventId: disasterRecordsTable.disasterEventId,
				approvalStatus: disasterRecordsTable.approvalStatus,
				startDate: disasterRecordsTable.startDate,
				endDate: disasterRecordsTable.endDate,
				createdAt: disasterRecordsTable.createdAt,
				updatedAt: disasterRecordsTable.updatedAt,
				nameNational: disasterEventTable.nameNational,
			})
			.from(disasterRecordsTable)
			.leftJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
			.leftJoin(
				sectorDisasterRecordsRelationTable,
				eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
			)
			.where(
				and(
					baseCondition,
					filters.disasterEventName !== ''
						? ilike(disasterEventTable.nameNational, searchDisasterEventName)
						: undefined
				)
			)
			.orderBy(desc(disasterRecordsTable.updatedAt))
			.limit(offsetLimit.limit)
			.offset(offsetLimit.offset);
	};

	const res = await executeQueryForPagination3(request, count, events, extraParams);

	return {
		isPublic,
		filters,
		data: res,
		instanceName,
		sectors,
	};
}
