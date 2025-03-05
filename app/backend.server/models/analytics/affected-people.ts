import { eq, sql, and } from 'drizzle-orm';
import { dr } from "~/db.server";
import {
  disasterRecordsTable,
  humanDsgTable,
  missingTable,
  injuredTable,
  deathsTable,
  affectedTable,
  displacedTable,
  disasterEventTable,
  hazardousEventTable,
} from '~/drizzle/schema';

type FilterValues = {
  hazardTypeId?: string | null | undefined;
  hazardClusterId?: string | null | undefined;
  specificHazardId?: string | null | undefined;
  fromDate?: string | null | undefined;
  toDate?: string | null | undefined;
};

export async function getTotalAffectedPeople(filters: FilterValues = {}): Promise<number> {
  try {
    console.log("function called");

    // Step 1: Get all human_dsg.record_id values
    const humanDsgRecordIds = await dr
      .select({ recordId: humanDsgTable.recordId })
      .from(humanDsgTable)
      .then(results => results.map(r => r.recordId));

    if (humanDsgRecordIds.length === 0) {
      return 0;
    }

    // Step 2: Fetch all disaster_records where id is in human_dsg.record_id
    const disasterRecords = await dr
      .select({
        id: disasterRecordsTable.id,
        hipTypeId: disasterRecordsTable.hipTypeId,
        disasterEventId: disasterRecordsTable.disasterEventId,
        approvalStatus: disasterRecordsTable.approvalStatus,
      })
      .from(disasterRecordsTable)
      .where(sql`${disasterRecordsTable.id} IN ${humanDsgRecordIds}`);

    if (disasterRecords.length === 0) {
      return 0;
    }

    // Filter conditions for disaster_records
    const recordConditions = (recordId: string) => and(
      eq(disasterRecordsTable.id, recordId),
      filters.hazardTypeId ? eq(disasterRecordsTable.hipTypeId, filters.hazardTypeId) : undefined,
      filters.hazardClusterId ? eq(disasterRecordsTable.hipClusterId, filters.hazardClusterId) : undefined,
      filters.specificHazardId ? eq(disasterRecordsTable.hipHazardId, filters.specificHazardId) : undefined,
      filters.fromDate ? sql`${disasterRecordsTable.startDate} >= ${filters.fromDate}` : undefined,
      filters.toDate ? sql`${disasterRecordsTable.endDate} <= ${filters.toDate}` : undefined,
      eq(disasterRecordsTable.approvalStatus, 'published')
    );

    // Filter conditions for disaster_event
    const eventConditions = (eventId: string) => and(
      eq(disasterEventTable.id, eventId),
      filters.hazardTypeId ? eq(disasterEventTable.hipTypeId, filters.hazardTypeId) : undefined,
      filters.hazardClusterId ? eq(disasterEventTable.hipClusterId, filters.hazardClusterId) : undefined,
      filters.specificHazardId ? eq(disasterEventTable.hipHazardId, filters.specificHazardId) : undefined,
      filters.fromDate ? sql`${disasterEventTable.startDate} >= ${filters.fromDate}` : undefined,
      filters.toDate ? sql`${disasterEventTable.endDate} <= ${filters.toDate}` : undefined,
      eq(disasterEventTable.approvalStatus, 'published')
    );

    // Filter conditions for hazardous_event
    const hazardConditions = (hazardId: string) => and(
      eq(hazardousEventTable.id, hazardId),
      filters.hazardTypeId ? eq(hazardousEventTable.hipTypeId, filters.hazardTypeId) : undefined,
      filters.hazardClusterId ? eq(hazardousEventTable.hipClusterId, filters.hazardClusterId) : undefined,
      filters.specificHazardId ? eq(hazardousEventTable.hipHazardId, filters.specificHazardId) : undefined,
      filters.fromDate ? sql`${hazardousEventTable.startDate} >= ${filters.fromDate}` : undefined,
      filters.toDate ? sql`${hazardousEventTable.endDate} <= ${filters.toDate}` : undefined,
      eq(hazardousEventTable.approvalStatus, 'published')
    );

    // Step 3: Check each disaster_records and filter accordingly
    const validRecordIds: string[] = [];

    for (const record of disasterRecords) {
      if (record.hipTypeId !== null) {
        // Apply WHERE clause on disaster_records
        const matches = await dr
          .select({ count: sql<number>`COUNT(*)`.as('count') })
          .from(disasterRecordsTable)
          .where(recordConditions(record.id))
          .then(result => result[0].count > 0);

        if (matches) {
          validRecordIds.push(record.id);
        }
      } else if (record.disasterEventId !== null) {
        // Fetch the linked disaster_event to check hipTypeId
        const disasterEvent = await dr
          .select({
            id: disasterEventTable.id,
            hipTypeId: disasterEventTable.hipTypeId,
            hazardousEventId: disasterEventTable.hazardousEventId,
            approvalStatus: disasterEventTable.approvalStatus,
          })
          .from(disasterEventTable)
          .where(eq(disasterEventTable.id, record.disasterEventId))
          .then(results => results[0]);

        if (!disasterEvent) {
          continue; // Skip if no matching disaster_event
        }

        if (disasterEvent.hipTypeId !== null) {
          // Apply WHERE clause on disaster_event
          const eventMatches = await dr
            .select({ count: sql<number>`COUNT(*)`.as('count') })
            .from(disasterEventTable)
            .where(eventConditions(disasterEvent.id))
            .then(async result => {
              const count = result[0].count > 0;
              if (count) {
                // Fetch approvalStatus separately for debugging
                const eventDebug = await dr
                  .select({ approvalStatus: disasterEventTable.approvalStatus })
                  .from(disasterEventTable)
                  .where(eq(disasterEventTable.id, disasterEvent.id))
                  .then(r => r[0].approvalStatus);
                console.log(`Event ID: ${disasterEvent.id}, Approval Status: ${eventDebug}, Matches: ${count}`);
              }
              return count;
            });

          if (eventMatches) {
            validRecordIds.push(record.id);
          }
        } else if (disasterEvent.hazardousEventId !== null) {
          // Apply WHERE clause on hazardous_event
          const hazardMatches = await dr
            .select({ count: sql<number>`COUNT(*)`.as('count') })
            .from(hazardousEventTable)
            .where(hazardConditions(disasterEvent.hazardousEventId))
            .then(async result => {
              const count = result[0].count > 0;
              return count;
            });

          if (hazardMatches) {
            validRecordIds.push(record.id);
          }
        }
      }
    }

    console.log("Valid Record IDs:", validRecordIds);

    if (validRecordIds.length === 0) {
      return 0;
    }

    // Fetch human_dsg records for valid disaster_records
    const humanDsgRecords = await dr
      .select({ id: humanDsgTable.id })
      .from(humanDsgTable)
      .where(sql`${humanDsgTable.recordId} IN ${validRecordIds}`);

    const dsgIds = humanDsgRecords.map(record => record.id);
    console.log("dsgIds:", dsgIds);

    if (dsgIds.length === 0) {
      return 0;
    }

    // Step 4: Sum up values for matching records
    const [missingResults, injuredResults, deathsResults, affectedResults, displacedResults] = await Promise.all([
      dr
        .select({
          total: sql<number>`COALESCE(SUM(${missingTable.missing}), 0)`.as('missing_total')
        })
        .from(missingTable)
        .where(sql`${missingTable.dsgId} IN ${dsgIds}`),
      
      dr
        .select({
          total: sql<number>`COALESCE(SUM(${injuredTable.injured}), 0)`.as('injured_total')
        })
        .from(injuredTable)
        .where(sql`${injuredTable.dsgId} IN ${dsgIds}`),
      
      dr
        .select({
          total: sql<number>`COALESCE(SUM(${deathsTable.deaths}), 0)`.as('deaths_total')
        })
        .from(deathsTable)
        .where(sql`${deathsTable.dsgId} IN ${dsgIds}`),
      
      dr
        .select({
          direct: sql<number>`COALESCE(SUM(${affectedTable.direct}), 0)`.as('direct_total'),
          // indirect: sql<number>`COALESCE(SUM(${affectedTable.indirect}), 0)`.as('indirect_total')
        })
        .from(affectedTable)
        .where(sql`${affectedTable.dsgId} IN ${dsgIds}`),
      
      dr
        .select({
          total: sql<number>`COALESCE(SUM(${displacedTable.displaced}), 0)`.as('displaced_total')
        })
        .from(displacedTable)
        .where(sql`${displacedTable.dsgId} IN ${dsgIds}`)
    ]);

    // Extract totals and convert to numbers explicitly
    const missingTotal = Number(missingResults[0]?.total ?? 0);
    const injuredTotal = Number(injuredResults[0]?.total ?? 0);
    const deathsTotal = Number(deathsResults[0]?.total ?? 0);
    const directTotal = Number(affectedResults[0]?.direct ?? 0);
    // const indirectTotal = Number(affectedResults[0]?.indirect ?? 0);
    const displacedTotal = Number(displacedResults[0]?.total ?? 0);

    // Calculate total affected people
    const totalAffected = 
      missingTotal + 
      injuredTotal + 
      deathsTotal + 
      directTotal + 
      // indirectTotal + 
      displacedTotal;

    console.log("total affected = ", totalAffected);
    return totalAffected;
  } catch (error) {
    console.error('Error calculating total affected people:', error);
    throw new Error('Failed to calculate total affected people');
  }
}