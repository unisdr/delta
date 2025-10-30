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
    // disasterEventTable,
    sectorDisasterRecordsRelationTable,
    damagesTable,
    lossesTable,
    disruptionTable,
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
        HazardId?: string;
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

    if (args.divisionId) {
        baseWhere.push(sql`(
            disaster_records.spatial_footprint->'geojson'->'properties'->'division_ids' @> to_jsonb(ARRAY[${args.divisionId}])
            OR jsonb_path_exists(disaster_records.spatial_footprint, ${`$[*].geojson.properties.division_ids  ? (@ == "${args.divisionId}")`})
        )`);
    }
    if (args.type && 'sectorId' in args.type) {
      baseWhere.push(eq(disasterRecordsTable.disasterEventId, args.type.sectorId));
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