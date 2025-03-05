import { eq, sql, and } from 'drizzle-orm';
import { dr } from "~/db.server";
import {
  disasterRecordsTable,
  humanDsgTable,
  missingTable,
  injuredTable,
  deathsTable,
  affectedTable,
  displacedTable
} from '~/drizzle/schema';

type FilterValues = {
  hazardTypeId?: string | null;
  hazardClusterId?: string | null;
  specificHazardId?: string | null;
  geographicLevelId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

export async function getTotalAffectedPeople(filters: FilterValues = {}): Promise<number> {
  try {
    console.log("function called")
    // Build the query with all filters in a single where clause
    const humanDsgRecords = await dr
      .select()
      .from(humanDsgTable)
      .innerJoin(disasterRecordsTable, eq(humanDsgTable.recordId, disasterRecordsTable.id))
      .where(
        and(
          filters.hazardTypeId ? eq(disasterRecordsTable.hipTypeId, filters.hazardTypeId) : undefined,
          filters.hazardClusterId ? eq(disasterRecordsTable.hipClusterId, filters.hazardClusterId) : undefined,
          filters.specificHazardId ? eq(disasterRecordsTable.hipHazardId, filters.specificHazardId) : undefined,
          filters.fromDate ? sql`${disasterRecordsTable.startDate} >= ${filters.fromDate}` : undefined,
          filters.toDate ? sql`${disasterRecordsTable.endDate} <= ${filters.toDate}` : undefined,
          eq(disasterRecordsTable.approvalStatus,'completed')
        )
      );

    if (humanDsgRecords.length === 0) {
      return 0;
    }

    // Get all dsgIds to query related tables
    const dsgIds = humanDsgRecords.map(record => record.human_dsg.id);

    // Query all related tables with the dsgIds
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
        .where(sql`${displacedTable.dsgId} IN ${dsgIds}`)  // Fixed this line
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

    console.log("total affected = ", totalAffected)
    return totalAffected;
  } catch (error) {
    console.error('Error calculating total affected people:', error);
    throw new Error('Failed to calculate total affected people');
  }
}