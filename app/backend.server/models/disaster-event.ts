
import {
	eventTable, EventInsert,
	hazardousEventTable, HazardousEventInsert, eventRelationshipTable,
	DisasterEventInsert, disasterEventTable, hazardousEventTableConstraits,
	disasterEventTableConstraits,
	disasterRecordsTable,
	sectorDisasterRecordsRelationTable,
	damagesTable,
	lossesTable,
	sectorTable
} from "~/drizzle/schema";


import {dr, Tx} from "~/db.server";

import {
	eq,
	getTableName,
	sql,
	and,
	isNull
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
		.where(eq(disasterEventTable.id, id))
		// .where(eq(disasterEventTable.approvalStatus, "completed"))
		// .where(eq(disasterRecordsTable.approvalStatus, "completed"))
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
		.where(eq(disasterEventTable.id, id))
		// .where(eq(disasterEventTable.approvalStatus, "completed"))
		// .where(eq(disasterRecordsTable.approvalStatus, "completed"))
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
			eq(sectorDisasterRecordsRelationTable.sectorId, sectorId),
		))
		.where(
			and(
				eq(disasterEventTable.id, disasterEventId),
				eq(sectorDisasterRecordsRelationTable.withLosses, true),
				eq(sectorDisasterRecordsRelationTable.sectorId, sectorId),
				isNull(sectorDisasterRecordsRelationTable.lossesCost),
			)
		);

	// const rawSQL2 = queryLossesTable.toSQL();
	// console.log(rawSQL2 );

	return queryLossesTable.execute();
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
			pdRecoveryCostUnitCurrency: damagesTable.pdRecoveryCostUnitCurrency,
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
				eq(sectorDisasterRecordsRelationTable.sectorId, sectorId),
				isNull(sectorDisasterRecordsRelationTable.damageCost),
			)
		);

	// const rawSQL2 = queryDamageTable.toSQL();
	// console.log(rawSQL2 );

	// return queryDamageTable;
	return queryDamageTable.execute();
}

export async function disasterEventTotalDamages__ById(disasterEventId: string) {
	if (typeof disasterEventId !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const queryRecordSectorTable = dr.selectDistinctOn(
		[sectorDisasterRecordsRelationTable.id],
		{
			recordId: disasterRecordsTable.id,
			recordSectorId: sectorDisasterRecordsRelationTable.id,
			recordSector_SectorId: sectorDisasterRecordsRelationTable.sectorId,
			recordSectorDamageCost: sectorDisasterRecordsRelationTable.damageCost,
			recordSectorDamageCostCurrency: sectorDisasterRecordsRelationTable.damageCostCurrency,
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
				eq(disasterEventTable.id, disasterEventId),
				eq(sectorDisasterRecordsRelationTable.withDamage, true),
			)
		);

	// Execute the query
	const record = await queryRecordSectorTable.execute();
	let totalDamages:number = 0;
	let totalLosses:number = 0;
	let recordsAssetDamagesQuery:any = undefined;
	let recordsAssetDamages:any = undefined;
	let recordsAssetlosses:any = undefined;
	let recordsAssetDamagesIdArray:any[] = [];
	let recordsAssetLossesIdArray:any[] = [];
	// console.log( recordsAssetDamagesIdArray );
	let damageCurrency:string = configCurrencies()[0];

	// type x = {recordId:string, recordSectorId:string, recordSectorDamageCost: number|null, recordSectorDamageCostCurrency:string|null};

	record.forEach((item, index) => {
		if (item.recordSectorDamageCost) {
			// console.log(index, item);
			totalDamages += Number(item.recordSectorDamageCost); //get the total override from the sector level damage cost
		}
		else {
			// get damage records from damages table
			// console.log(index, item);
			recordsAssetDamagesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
		}

		if (item.lossesCost) {
			totalLosses += Number(item.lossesCost);
		}
		else {
			// get the losses records from losses table
			// console.log(index, item);
			recordsAssetLossesIdArray.push({sector_id: item.recordSector_SectorId, record_id: item.recordId});
		}

		// console.log(index, item);
	});

	// Get damages from Asset level records
	for (const item of recordsAssetDamagesIdArray) {
		try {
			const recordsAssetDamages = await disasterEventTotalDamages_RecordsAssets__ById(disasterEventId, item.record_id, item.sector_id);
			recordsAssetDamages.forEach((item2, index2) => {
				totalDamages += Number( item2.totalRepairReplacement );
				damageCurrency = String( item2.pdRecoveryCostUnitCurrency );
				// console.log(item2.totalRepairReplacement);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	console.log( 'ID: ', recordsAssetLossesIdArray );
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
				console.log(item2);
			});
		} catch (error) {
			console.error(`Error processing item ${item}:`, error);
		}
	}

	console.log( totalDamages, totalLosses );
	return {
		damages: {
			total: totalDamages, currency: damageCurrency
		},
		losses: {
			total: totalLosses, currency: damageCurrency
		}
		
	};
}