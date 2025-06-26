import { dr } from "~/db.server";

import {
	disasterEventTable,
	disasterRecordsTable,
	sectorDisasterRecordsRelationTable,
	damagesTable,
	lossesTable,
	sectorTable,
	disruptionTable,
	assetTable
} from "~/drizzle/schema";

import {
	eq,
	sql,
	and,
	isNull,
	or,
	inArray
} from "drizzle-orm";

import { getInstanceSystemSettings } from "../instanceSystemSettingDAO";
import { getCurrenciesAsListFromCommaSeparated } from "~/util/currency";

/**
 * Fetch disaster events from the database based on the query parameter.
 * @param query Search query string (optional).
 * @returns an array of disaster events.
 */
export const fetchDisasterEvents = async (query?: string) => {
  try {
    // Add conditions for searching multiple fields
    const queryCondition = query
      ? sql`
        LOWER(name_national) LIKE ${"%" + query.toLowerCase() + "%"} OR 
        LOWER(glide) LIKE ${"%" + query.toLowerCase() + "%"} OR
        LOWER(national_disaster_id) LIKE ${"%" + query.toLowerCase() + "%"} OR
        id::text LIKE ${"%" + query.toLowerCase() + "%"} OR
        LOWER(other_id1) LIKE ${"%" + query.toLowerCase() + "%"}
      `
      : sql`TRUE`;

    // Execute query and return the full result object
    const result = await dr.execute(
      sql`
        SELECT 
          id, 
          name_national AS name, 
          glide, 
          national_disaster_id, 
          other_id1,
          start_date,
          end_date,
          effects_total_usd
        FROM disaster_event
        WHERE ${queryCondition}
        ORDER BY start_date DESC
      `
    );

    return result; // Return the full QueryResult object
  } catch (error) {
    console.error(`[fetchDisasterEvents] Failed with query="${query}":`, error);
    throw new Error("Database query failed. Please try again later.");
  }
};



export async function disasterEventSectorsById(id: any, incAnsestorsDecentants: boolean = false) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	return await dr.selectDistinctOn(
		[sectorTable.sectorname],
		{
			sectorname: sectorTable.sectorname,
			id: sectorTable.id,
			relatedAncestorsDecentants: incAnsestorsDecentants ? 
				sql`(
					dts_get_sector_ancestors_decentants(${sectorTable.id})
				)`.as('relatedAncestorsDecentants')
			 : 
				sql`(
					NULL
				)`.as('relatedAncestorsDecentants')
			,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(sectorTable, eq(sectorTable.id, sectorDisasterRecordsRelationTable.sectorId))
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
			)
		)
		.orderBy(sectorTable.sectorname)
	.execute();
}


export async function disasterEvent_DisasterRecordsCount__ById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const record = await dr.select(
		{
			count: sql<number>`count(*)`
		}).from(disasterRecordsTable)
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
			)
		)
	.execute();

	return record[0].count;
}

export async function disasterEventTotalLosses_RecordsAssets__ById(disasterEventId: string, sectorId: number) {
	const queryLossesTable = dr.selectDistinctOn(
		[lossesTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			recordSectorLossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			recordSectorLossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			lossesId: lossesTable.id,
			privateCostTotal: lossesTable.privateCostTotal,
			privateCostTotalOverride: lossesTable.privateCostTotalOverride,
			privateUnits: lossesTable.privateUnits,
			privateCostUnit: lossesTable.privateCostUnit,
			publicCostTotal: lossesTable.publicCostTotal,
			publicCostTotalOverride: lossesTable.publicCostTotalOverride,
			publicUnits: lossesTable.publicUnits,
			publicCostUnit: lossesTable.publicCostUnit,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(lossesTable, and(
			eq(lossesTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
			eq(lossesTable.sectorId, sectorId),
		))
		.where(
			and(
				eq(disasterEventTable.id, disasterEventId),
				eq(sectorDisasterRecordsRelationTable.withLosses, true),
				eq(lossesTable.sectorId, sectorId),
				isNull(sectorDisasterRecordsRelationTable.lossesCost),
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
			)
		);

	// const rawSQL2 = queryLossesTable.toSQL();
	// console.log(rawSQL2 );

	return queryLossesTable.execute();
}

export async function disasterEventTotalRecovery_RecordsAssets__ById(disasterEventId: string, disasterRecordId: string, sectorId: number) {
	const queryDamageTable = dr.selectDistinctOn(
		[damagesTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			damageId: damagesTable.id,
			totalRecovery: damagesTable.totalRecovery,
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(damagesTable, and(
			eq(damagesTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
			eq(damagesTable.sectorId, sectorId),
		))
		.where(
			and(
				eq(disasterEventTable.id, disasterEventId),
				eq(sectorDisasterRecordsRelationTable.withDamage, true),
				eq(damagesTable.sectorId, sectorId),
				eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordId),
				eq(damagesTable.recordId, disasterRecordId),
				isNull(sectorDisasterRecordsRelationTable.damageRecoveryCost),
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
			)
		);

	// const rawSQL2 = queryDamageTable.toSQL();
	// console.log('Recovery:', rawSQL2 );

	// return queryDamageTable;
	return queryDamageTable.execute();
}

export async function disasterEventTotalDamages_RecordsAssets__ById(disasterEventId: string, sectorId: number) {
	const queryDamageTable = dr.selectDistinctOn(
		[damagesTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			recordSectorDamageCost: sectorDisasterRecordsRelationTable.damageCost,
			recordSectorDamageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			damageId: damagesTable.id,
			totalDamageAmountOverride: damagesTable.totalDamageAmountOverride,
			totalDamageAmount: damagesTable.totalDamageAmount,
			totalRepairReplacementOverride: damagesTable.totalRepairReplacementOverride,
			totalRepairReplacement: damagesTable.totalRepairReplacement,
			pdRepairCostTotalOverride: damagesTable.pdRepairCostTotalOverride,
			pdRepairCostTotal: damagesTable.pdRepairCostTotal,
			tdReplacementCostTotalOverride: damagesTable.tdReplacementCostTotalOverride,
			tdReplacementCostTotal: damagesTable.tdReplacementCostTotal,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(damagesTable, and(
			eq(damagesTable.recordId, sectorDisasterRecordsRelationTable.disasterRecordId),
			eq(sectorDisasterRecordsRelationTable.sectorId, sectorId),
		))
		.where(
			and(
				eq(disasterEventTable.id, disasterEventId),
				eq(sectorDisasterRecordsRelationTable.withDamage, true),
				eq(damagesTable.sectorId, sectorId),
				isNull(sectorDisasterRecordsRelationTable.damageCost),
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
			)
		);

	// const rawSQL2 = queryDamageTable.toSQL();
	// console.log(rawSQL2 );

	// return queryDamageTable;
	return queryDamageTable.execute();
}

export async function disasterEventSectorTotal__ByDivisionId(disasterEventId: string, divisionId: number[]) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	let division_ids:string = '';
	divisionId.forEach((item, index) => {
		if (index === 0) {
			division_ids = `@ == "${String(item)}"`;
		}
		else {
			division_ids += ` || @ == "${item}"`;
		}
	});

	const queryRecordSectorTable = dr.selectDistinctOn(
		[disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			withDamage: sectorDisasterRecordsRelationTable.withDamage,
			damageCost: sectorDisasterRecordsRelationTable.damageCost,
			damageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			damageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			damageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			withLosses: sectorDisasterRecordsRelationTable.withLosses,
			lossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			lossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		// .innerJoin(damagesTable, eq(damagesTable.recordId, disasterRecordsTable.id))
		.where(
			and(
				sql`(
					jsonb_path_exists(disaster_records.spatial_footprint, ${`$[*].geojson.properties.division_ids  ? (${division_ids})`})
				)`,
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
				eq(disasterEventTable.id, disasterEventId),
				or(
					eq(sectorDisasterRecordsRelationTable.withDamage, true),
					eq(sectorDisasterRecordsRelationTable.withLosses, true),
				)
			),
		);

	// Execute the query
	const record = await queryRecordSectorTable.execute();
	let totalDamages:number = 0;
	let totalLosses:number = 0;
	let totalRecovery:number = 0;
	let recordsAssetRecoveryIdArray:any[] = [];
	let recordsAssetDamagesIdArray:any[] = [];
	let recordsAssetLossesIdArray:any[] = [];

	const settings=await getInstanceSystemSettings();
	var currenyCodes ='';
	if(settings){
		currenyCodes = settings.currencyCodes;
	}
	const currenyCodesAsList = getCurrenciesAsListFromCommaSeparated(currenyCodes);

	let damageCurrency:string = currenyCodesAsList[0];

	record.forEach((item) => {
		if (item.withDamage) {
			if (item.damageCost) {
				totalDamages += Number(item.damageCost); //get the total override from the sector level damage cost
			}
			else {
				// get damage records from damages table
				recordsAssetDamagesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}

			if (item.damageRecoveryCost) {
				totalRecovery += Number(item.damageRecoveryCost);
			}
			else {
				// get the recovery records from damages table
				recordsAssetRecoveryIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}
		}


		if (item.withLosses) {
			if (item.lossesCost) {
				totalLosses += Number(item.lossesCost);
			}
			else {
				// get the losses records from losses table
				// console.log(index, item);
				recordsAssetLossesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}
		}
		// console.log(index, item);
	});

	// Get recpvery from Asset level records
	for (const item of recordsAssetRecoveryIdArray) {
		try {
			const recordsAssetRecovery = await disasterEventTotalRecovery_RecordsAssets__ById(disasterEventId, item.record_id, item.sector_id);
			recordsAssetRecovery.forEach((item2) => {
				// console.log( 'cccc', index2, item2.totalRecovery );
				totalRecovery += Number( item2.totalRecovery );
				// console.log(item2.totalRepairReplacement);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	// console.log( 'IDx', recordsAssetDamagesIdArray );
	// Get damages from Asset level records
	for (const item of recordsAssetDamagesIdArray) {
		try {
			const recordsAssetDamages = await disasterEventTotalDamages_RecordsAssets__ById(disasterEventId, item.record_ids);
			recordsAssetDamages.forEach((item2) => {
				totalDamages += Number( item2.totalRepairReplacement );
				// console.log(item2.totalRepairReplacement);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	// console.log( 'ID: ', recordsAssetLossesIdArray );
	// Get losses from Asset level records
	for (const item of recordsAssetLossesIdArray) {
		
		try {
			const recordsAssetlosses = await disasterEventTotalLosses_RecordsAssets__ById(disasterEventId, item.record_id);
			recordsAssetlosses.forEach((item2) => {
				if (item2.publicCostTotalOverride) {
					totalLosses += Number( item2.publicCostTotal );
				}
				else {
					totalLosses += (Number( item2.publicUnits ) * Number( item2.publicCostUnit ));
				}
				if (item2.privateCostTotalOverride) {
					totalLosses += Number( item2.privateCostTotal );
				}
				else {
					totalLosses += (Number( item2.privateUnits ) * Number( item2.privateCostUnit ));
				}
				// console.log('Losses:', item2);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	// console.log( totalDamages, totalLosses, totalRecovery );
	return {
		damages: {
			total: totalDamages, currency: damageCurrency
		},
		losses: {
			total: totalLosses, currency: damageCurrency
		},
		recovery: {
			total: totalRecovery, currency: damageCurrency
		}
		
	};

}

export async function disasterEventSectorTotal__ById(disasterEventId: string, isInSectorIds: number[] = []) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			withDamage: sectorDisasterRecordsRelationTable.withDamage,
			damageCost: sectorDisasterRecordsRelationTable.damageCost,
			damageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			damageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			damageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			withLosses: sectorDisasterRecordsRelationTable.withLosses,
			lossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			lossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId))
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		// .innerJoin(damagesTable, eq(damagesTable.recordId, disasterRecordsTable.id))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
				eq(disasterEventTable.id, disasterEventId),
				or(
					eq(sectorDisasterRecordsRelationTable.withDamage, true),
					eq(sectorDisasterRecordsRelationTable.withLosses, true),
				),
				isInSectorIds.length > 0 ? inArray(sectorDisasterRecordsRelationTable.sectorId, isInSectorIds) : undefined
			),
		);

	// Execute the query
	const record = await queryRecordSectorTable.execute();
	let totalDamages:number = 0;
	let totalLosses:number = 0;
	let totalRecovery:number = 0;
	let recordsAssetRecoveryIdArray:any[] = [];
	let recordsAssetDamagesIdArray:any[] = [];
	let recordsAssetLossesIdArray:any[] = [];

	const settings=await getInstanceSystemSettings();
	var currenyCodes ='';
	if(settings){
		currenyCodes = settings.currencyCodes;
	}
	const currenyCodesAsList = getCurrenciesAsListFromCommaSeparated(currenyCodes);

	let damageCurrency:string = currenyCodesAsList[0];

	record.forEach((item) => {
		if (item.withDamage) {
			if (item.damageCost) {
				totalDamages += Number(item.damageCost); //get the total override from the sector level damage cost
			}
			else {
				// get damage records from damages table
				recordsAssetDamagesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}

			if (item.damageRecoveryCost) {
				totalRecovery += Number(item.damageRecoveryCost);
			}
			else {
				// get the recovery records from damages table
				recordsAssetRecoveryIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}
		}


		if (item.withLosses) {
			if (item.lossesCost) {
				totalLosses += Number(item.lossesCost);
			}
			else {
				// get the losses records from losses table
				recordsAssetLossesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}
		}
		// console.log(index, item);
	});

	// Get recpvery from Asset level records
	for (const item of recordsAssetRecoveryIdArray) {
		try {
			const recordsAssetRecovery = await disasterEventTotalRecovery_RecordsAssets__ById(disasterEventId, item.record_id, item.sector_id);
			recordsAssetRecovery.forEach((item2) => {
				totalRecovery += Number( item2.totalRecovery );
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	// Get damages from Asset level records
	for (const item of recordsAssetDamagesIdArray) {
		try {
			const recordsAssetDamages = await disasterEventTotalDamages_RecordsAssets__ById(disasterEventId, item.record_id);
			recordsAssetDamages.forEach((item2) => {
				totalDamages += Number( item2.totalRepairReplacement );
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	// Get losses from Asset level records
	for (const item of recordsAssetLossesIdArray) {
		
		try {
			const recordsAssetlosses = await disasterEventTotalLosses_RecordsAssets__ById(disasterEventId, item.record_id);
			recordsAssetlosses.forEach((item2) => {
				if (item2.publicCostTotalOverride) {
					totalLosses += Number( item2.publicCostTotal );
				}
				else {
					totalLosses += (Number( item2.publicUnits ) * Number( item2.publicCostUnit ));
				}
				if (item2.privateCostTotalOverride) {
					totalLosses += Number( item2.privateCostTotal );
				}
				else {
					totalLosses += (Number( item2.privateUnits ) * Number( item2.privateCostUnit ));
				}
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	return {
		damages: {
			total: totalDamages, currency: damageCurrency
		},
		losses: {
			total: totalLosses, currency: damageCurrency
		},
		recovery: {
			total: totalRecovery, currency: damageCurrency
		}
		
	};
}



export async function disasterEventSectorDamageDetails__ById(disasterEventId: string, isInSectorIds: number[] = []) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[disasterEventTable.id, disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id, damagesTable.id],
		{
			recordId: disasterRecordsTable.id,
			// relDisrecordSector_Id: sectorDisasterRecordsRelationTable.id,
			// relDisrecordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			// relDisrecordSector_WithDamage: sectorDisasterRecordsRelationTable.withDamage,
			// relDisrecordSector_DamageCost: sectorDisasterRecordsRelationTable.damageCost,
			// relDisrecordSector_DamageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			// relDisrecordSector_DamageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			// relDisrecordSector_DamageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			// relDisrecordSector_WithLosses: sectorDisasterRecordsRelationTable.withLosses,
			// relDisrecordSector_LossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			// relDisrecordSector_LossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			// eventDisasterEventId: disasterEventTable.id,
			damageId: damagesTable.id,
			// damageSectorId: damagesTable.sectorId,
			damageTotalRepairReplacementCost: damagesTable.totalRepairReplacement,
			damageTotalRecoveryCost: damagesTable.totalRecovery,
			damageTotalNumberAssetAffected: damagesTable.totalDamageAmount,
			damageUnit: damagesTable.unit,
			// assetId: assetTable.id,
			assetName: assetTable.name,
			sectorName: sectorTable.sectorname,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable, 
			and(
				eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId),
				eq(sectorDisasterRecordsRelationTable.withDamage, true),
			)
		)
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(damagesTable, 
			and(
				eq(damagesTable.recordId, disasterRecordsTable.id),
				eq(damagesTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
			)
		)
		.innerJoin(assetTable, eq(assetTable.id, damagesTable.assetId))
		.innerJoin(sectorTable, eq(sectorTable.id, sectorDisasterRecordsRelationTable.sectorId))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
				eq(disasterEventTable.id, disasterEventId),
				// or(
				// 	eq(sectorDisasterRecordsRelationTable.withDamage, true),
				// 	// eq(sectorDisasterRecordsRelationTable.withLosses, true),
				// ),
				isInSectorIds.length > 0 ? inArray(damagesTable.sectorId, isInSectorIds) : undefined
			),
		);

	// const rawSQL2 = queryRecordSectorTable.toSQL();
	// console.log(rawSQL2 );
	

	// Execute the query
	const record = await queryRecordSectorTable.execute();

	return record;
}


export async function disasterEventSectorLossesDetails__ById(disasterEventId: string, isInSectorIds: number[] = []) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[disasterEventTable.id, disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id, lossesTable.id],
		{
			recordId: disasterRecordsTable.id,
			// relDisrecordSector_Id: sectorDisasterRecordsRelationTable.id,
			// relDisrecordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			// relDisrecordSector_WithDamage: sectorDisasterRecordsRelationTable.withDamage,
			// relDisrecordSector_DamageCost: sectorDisasterRecordsRelationTable.damageCost,
			// relDisrecordSector_DamageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			// relDisrecordSector_DamageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			// relDisrecordSector_DamageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			// relDisrecordSector_WithLosses: sectorDisasterRecordsRelationTable.withLosses,
			// relDisrecordSector_LossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			// relDisrecordSector_LossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			// eventDisasterEventId: disasterEventTable.id,
			lossesId: lossesTable.id,
			lossesDesc: lossesTable.description,
			lossesTotalPrivateCost: lossesTable.privateCostTotal,
			lossesTotalPrivateUnit: lossesTable.privateUnit,
			lossesTotalPrivateCostCurrency: lossesTable.privateCostUnitCurrency,
			lossesTotalPublicCost: lossesTable.publicCostTotal,
			lossesTotalPublicUnit: lossesTable.publicUnit,
			lossesTotalPublicCostCurrency: lossesTable.publicCostUnitCurrency,
			lossesSectorIsAgriculture: lossesTable.sectorIsAgriculture,
			lossesType: lossesTable.sectorIsAgriculture ? lossesTable.typeAgriculture : lossesTable.typeNotAgriculture,
			lossesRelatedTo: lossesTable.sectorIsAgriculture ? lossesTable.relatedToAgriculture : lossesTable.relatedToNotAgriculture,
			// lossesSectorId: lossesTable.sectorId,
			sectorName: sectorTable.sectorname,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable,
			and(
				eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId),
				eq(sectorDisasterRecordsRelationTable.withLosses, true),
			)
		)
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(lossesTable, 
			and(
				eq(lossesTable.recordId, disasterRecordsTable.id),
				eq(lossesTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
			)
		)
		.innerJoin(sectorTable, eq(sectorTable.id, sectorDisasterRecordsRelationTable.sectorId))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
				eq(disasterEventTable.id, disasterEventId),
				isInSectorIds.length > 0 ? inArray(lossesTable.sectorId, isInSectorIds) : undefined
			),
		);

	// const rawSQL2 = queryRecordSectorTable.toSQL();
	// console.log(rawSQL2 );
	

	// Execute the query
	const record = await queryRecordSectorTable.execute();


	return record;
}


export async function disasterEventSectorDisruptionDetails__ById(disasterEventId: string, isInSectorIds: number[] = []) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[disasterEventTable.id, disasterRecordsTable.id, sectorDisasterRecordsRelationTable.id, disruptionTable.id],
		{
			recordId: disasterRecordsTable.id,
			// relDisrecordSector_Id: sectorDisasterRecordsRelationTable.id,
			// relDisrecordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			// relDisrecordSector_WithDamage: sectorDisasterRecordsRelationTable.withDamage,
			// relDisrecordSector_DamageCost: sectorDisasterRecordsRelationTable.damageCost,
			// relDisrecordSector_DamageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
			// relDisrecordSector_DamageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			// relDisrecordSector_DamageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			// relDisrecordSector_WithLosses: sectorDisasterRecordsRelationTable.withLosses,
			// relDisrecordSector_LossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			// relDisrecordSector_LossesCostCurrency: sectorDisasterRecordsRelationTable.lossesCostCurrency,
			// eventDisasterEventId: disasterEventTable.id,
			disruptionId: disruptionTable.id,
			disruptionDurationDays: disruptionTable.durationDays,
			disruptionDurationHours: disruptionTable.durationHours,
			disruptionUsersAffected: disruptionTable.usersAffected,
			disruptionPeopleAffected: disruptionTable.peopleAffected,
			disruptionResponseCost: disruptionTable.responseCost,
			disruptionResponseCurrency: disruptionTable.responseCurrency,
			sectorName: sectorTable.sectorname,
			// name: sql`(
			// 	1
			// )`.as('name'),
		}).from(sectorDisasterRecordsRelationTable)
		.innerJoin(disasterRecordsTable,
			and(
				eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId),
				eq(sectorDisasterRecordsRelationTable.withDisruption, true),
			)
		)
		.innerJoin(disasterEventTable, eq(disasterEventTable.id, disasterRecordsTable.disasterEventId))
		.innerJoin(disruptionTable, 
			and(
				eq(disruptionTable.recordId, disasterRecordsTable.id),
				eq(disruptionTable.sectorId, sectorDisasterRecordsRelationTable.sectorId)
			)
		)
		.innerJoin(sectorTable, eq(sectorTable.id, sectorDisasterRecordsRelationTable.sectorId))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				eq(disasterEventTable.approvalStatus, "published"),
				eq(disasterEventTable.id, disasterEventId),
				isInSectorIds.length > 0 ? inArray(disruptionTable.sectorId, isInSectorIds) : undefined
			),
		);

	// const rawSQL2 = queryRecordSectorTable.toSQL();
	// console.log(rawSQL2 );
	

	// Execute the query
	const record = await queryRecordSectorTable.execute();


	return record;
}


