import { fetchSectorImpactData } from "~/backend.server/models/analytics/ImpactonSectors";

import {
    eq,
    and,
    sql,
    SQL,
} from "drizzle-orm";

import { dr } from "~/db.server";
import {
    disasterRecordsTable,
    disasterEventTable,
    sectorDisasterRecordsRelationTable,
    damagesTable,
    lossesTable,
    disruptionTable,
    hipTypeTable,
    hipClusterTable,
    hipHazardTable,
} from "~/drizzle/schema";


interface SectorImpactResponse {
  success: boolean;
  data?: {
    eventCount: number;
    totalDamage: string | null;
    totalLoss: string | null;
    eventsOverTime: { [key: string]: string };
    damageOverTime: { [key: string]: string };
    lossOverTime: { [key: string]: string };
    dataAvailability?: {
      damage: string;
      loss: string;
    };
  };
  error?: string;
}

interface Filters {
  startDate?: string | null;
  endDate?: string | null;
  hazardType?: string | null;
  hazardCluster?: string | null;
  specificHazard?: string | null;
  geographicLevel?: string | null;
  disasterEvent?: string | null;
}

export const getImpactOnSector = async (countryAccountsId: string, sectorId: string, filters?: Filters, currency?: any): Promise<SectorImpactResponse> => {
  try {
    // Input validation
    if (!sectorId) {
      return {
        success: false,
        error: "Invalid sector ID provided",
      };
    }

    // Validate tenant context
    if (!countryAccountsId) {
      console.error("Invalid tenant context provided to getImpactOnSector:", countryAccountsId);
      return {
        success: false,
        error: "Invalid tenant context. Please ensure you are logged in with a valid country account.",
      };
    }

    // Fetch data from the model with tenant context for isolation
    const data = await fetchSectorImpactData(countryAccountsId, sectorId, filters, currency);

    // Return successful response
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error in getImpactOnSector:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
};

/**
 * Retrieves the total impact of a specified type on a sector by using the provided arguments.
 * This function can calculate impacts based on damages, losses, or disruptions 
 * for a particular country account and may involve additional  SQL conditions.
 * 
 * @param {Object} args - The arguments required to fetch the sector impact total.
 * @param {string} args.countryAccountsId - The unique identifier for the country account 
 *                                           from which the impact data is to be retrieved.
 * @param {'damages' | 'losses' | 'disruption'} args.impact - Specifies the type of impact 
 *                                                            to be retrieved. It can be either 
 *                                                            'damages', 'losses', or 'disruption'.
 * @param {Object} [args.type] - An object representing additional filtering criteria:
 *                                - { sectorId: string } - Filters by specific sector.
 *                                - { disasterEventId: string } - Filters by specific disaster event.
 *                                - { hazardTypeId?: string, hazardClusterId?: string, hazardId?: string } - 
 *                                  Filters based on hazard categories, optionally providing data for hazard type,
 *                                  cluster, and general hazard ID.
 * @param {string | null} [args.divisionId] - An optional identifier for a division 
 *                                             that further narrows down the results. This can be null if no division 
 *                                             filtering is needed.
 * @param {SQL[] | null} [extraConditions] - Optional parameter for additional SQL conditions 
 *                                            that can be applied to the query. Can be null if no extra conditions 
 *                                            are required.
 *
 * @example
 * // Get damages for a specific sector
 * await getSectorImpactTotal({
 *   countryAccountsId: "UUID",
 *   impact: "damages",
  * });
 * 
 * @example
 * // Get losses for a specific disaster with extra conditions
 * await getSectorImpactTotal({
 *   countryAccountsId: "UUID",
 *   impact: "losses",
 *   type: { disasterEventId: "UUID" },
 *   divisionId: "UUID"
 * }, [sql`${disasterRecordsTable.startDate} > '2024-01-01'`]); 
 * 
 * @returns {Promise<Object>} - A promise that resolves to an object containing the total impact values based on the type of impact requested:
 *  - If `args.impact` is 'damages':
 *      - { damagesTotal: number, recoveryTotal: number } 
 *  - If `args.impact` is 'losses':
 *      - { lossesTotal: number } 
 *  - If `args.impact` is 'disruption':
 *      - { disruptionTotal: number } 
 */
export async function getSectorImpactTotal(
    args: {
      countryAccountsId: string;
      impact: 'damages' | 'losses' | 'disruption';
      type?: {
        sectorId: string;
      } | {
        disasterEventId: string;
      } | {
        hazardTypeId?: string;
        hazardClusterId?: string;
        hazardId?: string;
      },
      divisionId?: string | null,
    },
    extraConditions?: SQL[] | null
) {
    // select base columns to include
    const selects: any = {
        recordId: disasterRecordsTable.id,
        recordSectorId: sectorDisasterRecordsRelationTable.id,
        recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
        // flags that live on the sector relation
        withDamage: sectorDisasterRecordsRelationTable.withDamage,
        withLosses: sectorDisasterRecordsRelationTable.withLosses,
        withDisruption: sectorDisasterRecordsRelationTable.withDisruption,
    };

    // base where conditions
    const baseWhere: SQL[] = [
        eq(disasterRecordsTable.countryAccountsId, args.countryAccountsId),
        eq(disasterRecordsTable.approvalStatus, 'published'),
    ];

    const distinctOnCols = [disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id];

    if (args.impact === 'damages') {
        selects.damageCost = sectorDisasterRecordsRelationTable.damageCost;
        selects.damageCostCurrency = sectorDisasterRecordsRelationTable.damageCostCurrency;
        selects.damageRecoveryCost = sectorDisasterRecordsRelationTable.damageRecoveryCost;
        selects.damageRecoveryCostCurrency = sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency;
        selects.damageCostComputed = sql`
        (
            COALESCE(
            ${sectorDisasterRecordsRelationTable.damageCost},
            COALESCE(SUM(${damagesTable.totalRepairReplacement}), 0)
            )
        )
        `.as('damageCostComputed');
        selects.damageCostRecoveryComputed = sql`
        (
            COALESCE(
            ${sectorDisasterRecordsRelationTable.damageRecoveryCost},
            COALESCE(SUM(${damagesTable.totalRecovery}), 0)
            )
        )
        `.as('damageCostRecoveryComputed');
    }
    else if (args.impact === 'losses') {
        selects.lossesCost = sectorDisasterRecordsRelationTable.lossesCost;
        selects.lossesCostCurrency = sectorDisasterRecordsRelationTable.lossesCostCurrency;
        selects.lossesCostComputed = sql`
        (
            COALESCE(
            ${sectorDisasterRecordsRelationTable.lossesCost},
            COALESCE(SUM(${lossesTable.privateCostTotal} + ${lossesTable.publicCostTotal}), 0)
            )
        )
        `.as('lossesCostComputed');
    }
    else if (args.impact === 'disruption') {
        selects.disruptionCostComputed = sql`
        (
            COALESCE(
              SUM(${disruptionTable.responseCost}),
              0
            )
        )
        `.as('disruptionCostComputed');
    }

    let q: any = dr
        .selectDistinctOn(distinctOnCols, selects)
        .from(sectorDisasterRecordsRelationTable)
        .innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId));

    // conditional joins
    if (args.impact === 'damages') {
        q = q.leftJoin(
          damagesTable,
          and(
              eq(sectorDisasterRecordsRelationTable.withDamage, true),
              eq(damagesTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
              eq(damagesTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
          )
        );

        baseWhere.push(eq(sectorDisasterRecordsRelationTable.withDamage, true));
    }
    else if (args.impact === 'losses') {
        q = q.leftJoin(
          lossesTable,
          and(
              eq(sectorDisasterRecordsRelationTable.withLosses, true),
              eq(lossesTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
              eq(lossesTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
          )
        );

        baseWhere.push(eq(sectorDisasterRecordsRelationTable.withLosses, true));
    }
    else if (args.impact === 'disruption') {
        q = q.innerJoin(
          disruptionTable,
          and(
              eq(sectorDisasterRecordsRelationTable.withDisruption, true),
              eq(disruptionTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
              eq(disruptionTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
          )
        );

        baseWhere.push(eq(sectorDisasterRecordsRelationTable.withDisruption, true));
    }

    // Condition for division
    if (args.divisionId) {
        baseWhere.push(sql`(
            disaster_records.spatial_footprint->'geojson'->'properties'->'division_ids' @> to_jsonb(ARRAY[${args.divisionId}])
            OR jsonb_path_exists(disaster_records.spatial_footprint, ${`$[*].geojson.properties.division_ids  ? (@ == "${args.divisionId}")`})
        )`);
    }

    // Condition for Type = sector (sectorId)
    if (args.type && 'sectorId' in args.type) {
        q = q.innerJoin(
          sql`unnest(dts_get_sector_children_idonly(${args.type.sectorId})) AS func_sectors`,
          sql`func_sectors = ${sectorDisasterRecordsRelationTable.sectorId}`
        );
    }

    // Condition for Type = disaster event (disasterEventId)
    if (args.type && 'disasterEventId' in args.type) {
        q = q.innerJoin(
          disasterEventTable,
          eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
        );

        baseWhere.push(eq(disasterEventTable.id, args.type.disasterEventId));
    }

    // Condition for Type = HIPs (disasterEventId)
    if (args.type && 'hazardTypeId' in args.type || args.type && 'hazardClusterId' in args.type || args.type && 'hazardId' in args.type) {
        if (args.type && 'hazardTypeId' in args.type) {
          q = q.innerJoin(
            hipTypeTable,
            eq(hipTypeTable.id, disasterRecordsTable.hipTypeId)
          );

          if (args.type.hazardTypeId) {
            baseWhere.push(eq(hipTypeTable.id, args.type.hazardTypeId));
          }
        }
        if (args.type && 'hazardClusterId' in args.type) {
          q = q.innerJoin(
            hipClusterTable,
            eq(hipClusterTable.id, disasterRecordsTable.hipClusterId)
          );

          if (args.type.hazardClusterId) {
            baseWhere.push(eq(hipClusterTable.id, args.type.hazardClusterId));
          }
        }
        if (args.type && 'hazardId' in args.type) {
          q = q.innerJoin(
            hipHazardTable,
            eq(hipHazardTable.id, disasterRecordsTable.hipHazardId)
          );

          if (args.type.hazardId) {
            baseWhere.push(eq(hipHazardTable.id, args.type.hazardId));
          }
        }
    }

    if (extraConditions && extraConditions.length) baseWhere.push(...extraConditions);

    q = q.where(and(...baseWhere)).groupBy(
        disasterRecordsTable.id,
        sectorDisasterRecordsRelationTable.sectorId,
        sectorDisasterRecordsRelationTable.id
    );


    if (args.impact === 'damages') {
        // create a CTE from the damages query, then sum the computed fields across all rows
        const cteDamages = dr.$with('cteDamages').as(q);
        const totalRowDamages = await dr.with(cteDamages).select({
          total: sql`COALESCE(SUM(${cteDamages.damageCostComputed}), 0)`.mapWith(Number),
        }).from(cteDamages);

        const totalRowRecovery = await dr.with(cteDamages).select({
          total: sql`COALESCE(SUM(${cteDamages.damageCostRecoveryComputed}), 0)`.mapWith(Number),
        }).from(cteDamages);

        const damagesTotal = totalRowDamages.length ? Number(totalRowDamages[0].total) : 0;
        const recoveryTotal = totalRowRecovery.length ? Number(totalRowRecovery[0].total) : 0;

        return {
          'damagesTotal': damagesTotal, 
          'recoveryTotal': recoveryTotal
        };
    }
    else if (args.impact === 'losses') {
        // create a CTE named 'cteLosses' from the losses query
        const cteLosses = dr.$with("cteLosses").as(q);

        // run a SELECT SUM(...) from the CTE
        const totalRowLosses = await dr.with(cteLosses).select({
        total: sql`COALESCE(SUM(${cteLosses.lossesCostComputed}), 0)`.mapWith(Number),
        }).from(cteLosses);

        // extract numeric total
        const lossesTotal = totalRowLosses.length ? Number(totalRowLosses[0].total) : 0;

        return {
          'lossesTotal': lossesTotal, 
        };
    }
    else if (args.impact === 'disruption') {
        // create a CTE named 'cteDisruption' from the disruption query
        const cteDisruption = dr.$with("cteDisruption").as(q);

        // run a SELECT SUM(...) from the CTE
        const totalRow = await dr.with(cteDisruption).select({
        total: sql`COALESCE(SUM(${cteDisruption.disruptionCostComputed}), 0)`.mapWith(Number),
        }).from(cteDisruption);

        // extract numeric total
        const disruptionTotal = totalRow.length ? Number(totalRow[0].total) : 0;
        return {
          'disruptionTotal': disruptionTotal,
        };
    }

    return null;
}