
import {
	disasterEventTable,
	disasterRecordsTable,
	sectorDisasterRecordsRelationTable,
	damagesTable,
	lossesTable,
	sectorTable
} from "~/drizzle/schema";

import {dr, Tx} from "~/db.server";

import {
	eq,
	sql,
	and,
	isNull,
	or
} from "drizzle-orm";

import { configCurrencies } from "~/util/config";

export async function disasterEventSectorsById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	return await dr.selectDistinctOn(
		[sectorTable.sectorname],
		{
			sectorname: sectorTable.sectorname,
			id: sectorTable.id,
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
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
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
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
			)
		)
	.execute();

	return record[0].count;
}

export async function disasterEventTotalLosses_RecordsAssets__ById(disasterEventId: string, disasterRecordId: string, sectorId: number) {
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
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
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
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
			)
		);

	const rawSQL2 = queryDamageTable.toSQL();
	console.log('Recovery:', rawSQL2 );

	// return queryDamageTable;
	return queryDamageTable.execute();
}

export async function disasterEventTotalDamages_RecordsAssets__ById(disasterEventId: string, disasterRecordId: string, sectorId: number) {
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
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
			)
		);

	// const rawSQL2 = queryDamageTable.toSQL();
	// console.log(rawSQL2 );

	// return queryDamageTable;
	return queryDamageTable.execute();
}

export async function disasterEventSectorTotal__ById(disasterEventId: string) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[sectorDisasterRecordsRelationTable.id],
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
		.innerJoin(damagesTable, eq(damagesTable.recordId, disasterRecordsTable.id))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "completed"),
				eq(disasterEventTable.approvalStatus, "completed"),
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
	let recordsAssetDamagesQuery:any = undefined;
	let recordsAssetDamages:any = undefined;
	let recordsAssetlosses:any = undefined;
	let recordsAssetRecoveryIdArray:any[] = [];
	let recordsAssetDamagesIdArray:any[] = [];
	let recordsAssetLossesIdArray:any[] = [];
	// console.log( recordsAssetDamagesIdArray );
	let damageCurrency:string = configCurrencies()[0];

	record.forEach((item, index) => {
		if (item.withDamage) {
			if (item.damageCost) {
				// console.log(index, item);
				totalDamages += Number(item.damageCost); //get the total override from the sector level damage cost
			}
			else {
				// get damage records from damages table
				// console.log(index, item);
				recordsAssetDamagesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
			}

			if (item.damageRecoveryCost) {
				totalRecovery += Number(item.damageRecoveryCost);
			}
			else {
				// get the recovery records from damages table
				// console.log(index, item);
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
			recordsAssetRecovery.forEach((item2, index2) => {
				console.log( 'cccc', index2, item2.totalRecovery );
				totalRecovery += Number( item2.totalRecovery );
				// console.log(item2.totalRepairReplacement);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	console.log( 'IDx', recordsAssetDamagesIdArray );
	// Get damages from Asset level records
	for (const item of recordsAssetDamagesIdArray) {
		try {
			const recordsAssetDamages = await disasterEventTotalDamages_RecordsAssets__ById(disasterEventId, item.record_id, item.sector_id);
			recordsAssetDamages.forEach((item2, index2) => {
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
			const recordsAssetlosses = await disasterEventTotalLosses_RecordsAssets__ById(disasterEventId, item.record_id, item.sector_id);
			recordsAssetlosses.forEach((item2, index2) => {
				// totalLosses += Number( item2.totalRepairReplacement );
				// damageCurrency = String( item2.pdRecoveryCostUnitCurrency );
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

	console.log( totalDamages, totalLosses, totalRecovery );
	return {
		damages: {
			total: totalDamages, currency: damageCurrency
		},
		losses: {
			total: totalLosses, currency: damageCurrency
		},
		recvery: {
			total: totalRecovery, currency: damageCurrency
		}
		
	};
}

	// return {
	// 	{
	// 		total: 200, name: 'Region 1', geo: 'geo1', colorPercentage: 0.5
	// 	},
	// 	{
	// 		total: 1000, name: 'Region 2', geo: 'geo1',
	// 	}
	// };