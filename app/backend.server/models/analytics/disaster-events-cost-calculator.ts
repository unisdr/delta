import {Tx} from "~/db.server";
import {
	damagesTable,
	disasterEventTable,
	disasterRecordsTable,
	disruptionTable,
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";
import {and, eq, inArray} from "drizzle-orm";


interface Totals {
	repairCost: string
	replacementCost: string
	rehabilitationCost: string
	recoveryCost: string
}

export async function updateTotals(tx: Tx, disasterEventId: string) {
	let totals = await calculateTotals(tx, disasterEventId)

	await tx
		.update(disasterEventTable)
		.set({
			repairCostsLocalCurrencyCalc: totals.repairCost,
			replacementCostsLocalCurrencyCalc: totals.replacementCost,
			rehabilitationCostsLocalCurrencyCalc: totals.rehabilitationCost,
			recoveryNeedsLocalCurrencyCalc: totals.recoveryCost,
		})
		.where(eq(disasterEventTable.id, disasterEventId))
}

export async function updateTotalsUsingDisasterRecordId(tx: Tx, disasterRecordId: string) {
	let rows = await tx.select({
		disasterEventId: disasterRecordsTable.disasterEventId
	})
		.from(disasterRecordsTable)
		.where(eq(disasterRecordsTable.id, disasterRecordId)).execute()
	if (!rows.length) throw new Error("disaster record not found by id")
	// not all are linked to disaster event
	if (!rows[0].disasterEventId) return
	await updateTotals(tx, rows[0].disasterEventId)
}

export async function calculateTotals(tx: Tx, disasterEventId: string): Promise<Totals> {
	let repairCostNum = await calculateTotalRepairCost(tx, disasterEventId)
	let replacementCostNum = await calculateTotalReplacementCost(tx, disasterEventId)
	let rehabilitationCostNum = await calculateTotalRehabilitationCost(tx, disasterEventId)
	let recoveryCostNum = await calculateTotalRecoveryCost(tx, disasterEventId)

	return {
		repairCost: String(repairCostNum),
		replacementCost: String(replacementCostNum),
		rehabilitationCost: String(rehabilitationCostNum),
		recoveryCost: String(recoveryCostNum),
	}
}

/**
 * Calculates the total repair cost of a disaster event.
 */
export const calculateTotalRepairCost = async (
	tx: Tx,
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {

		// Fetch all disaster records linked to the disaster event
		const disasterRecords = await tx
			.select({id: disasterRecordsTable.id})
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all damages linked to thedisaster records
		const damages = await tx
			.select({pdRepairCostTotal: damagesTable.pdRepairCostTotal})
			.from(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));

		// Calculate total repair cost
		let totalRepairCost = 0;
		for (const damage of damages) {
			totalRepairCost += damage.pdRepairCostTotal
				? Number(damage.pdRepairCostTotal)
				: 0;
		}

		return totalRepairCost;
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		throw new Error("Internal server error");
	}
};

/**
 * Calculates the total replacement cost of a disaster event.
 */
export const calculateTotalReplacementCost = async (
	tx: Tx,
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		// Fetch all disaster records linked to the disaster event
		const disasterRecords = await tx
			.select({id: disasterRecordsTable.id})
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all damages linked to the disaster records
		const damages = await tx
			.select({tdReplacementCostTotal: damagesTable.tdReplacementCostTotal})
			.from(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));

		// Calculate total replacement cost
		let totalReplacementCost = 0;
		for (const damage of damages) {
			totalReplacementCost += damage.tdReplacementCostTotal
				? Number(damage.tdReplacementCostTotal)
				: 0;
		}

		return totalReplacementCost;
	} catch (error) {
		console.error("Error fetching replacement cost:", error);
		throw new Error("Internal server error");
	}
};

export const calculateTotalRehabilitationCost = async (
	tx: Tx,
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		let totalRehabilitationCost = 0;


		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await tx
			.select({id: disasterRecordsTable.id})
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all disruption linked to the disaster records
		const disruptions = await tx
			.select({
				responseCost: disruptionTable.responseCost,
			})
			.from(disruptionTable)
			.where(inArray(disruptionTable.recordId, recordIds));

		// Calculate total response cost
		for (const disruption of disruptions) {
			// Convert values to numbers safely
			const responseCostTotal = disruption.responseCost
				? Number(disruption.responseCost)
				: 0;
			totalRehabilitationCost += responseCostTotal;
		}

		return Number(totalRehabilitationCost);
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		throw new Error("Internal server error");
	}
};

/**
 * Returns the total recovery cost of a disaster_event
 * recovery cost of a disaster event has three levels to get the value from
 * 1. from disaster event table itself
 * 2. If no value in disaster event table, then you get it from sector_disaster_records_relation table
 * 3. If no value exist in sector_disaster_records_relation table, then you get it from damages table.
 */
export const calculateTotalRecoveryCost = async (
	tx: Tx,
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		let totalRecoveryCost = 0;



		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await tx
			.select({id: disasterRecordsTable.id})
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		//Get the recovery cost from sector_disaster_records_relation.damage_recovery_cost if exit
		const sectorDisasterRecordsRelations = await tx
			.select({
				damageRecoveryCost:
					sectorDisasterRecordsRelationTable.damageRecoveryCost,
				sectorId: sectorDisasterRecordsRelationTable.sectorId,
				recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
			})
			.from(sectorDisasterRecordsRelationTable)
			.where(
				inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds)
			);

		for (const sectorDisaster of sectorDisasterRecordsRelations) {
			if (sectorDisaster.damageRecoveryCost) {
				totalRecoveryCost += Number(sectorDisaster.damageRecoveryCost);
			} else {
				// Check in damages.td_recovery_cost_total
				// Fetch all damages linked to the disaster records
				const damages = await tx
					.select({
						totalRecovery: damagesTable.totalRecovery,
					})
					.from(damagesTable)
					.where(
						and(
							eq(damagesTable.recordId, sectorDisaster.recordId),
							eq(damagesTable.sectorId, sectorDisaster.sectorId)
						)
					);

				for (const damage of damages) {
					// Convert values to numbers safely
					const tdReplacementCostTotal = damage.totalRecovery
						? Number(damage.totalRecovery)
						: 0;
					totalRecoveryCost += tdReplacementCostTotal;
				}
				totalRecoveryCost += Number();
			}
		}

		return totalRecoveryCost;
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		throw new Error("Internal server error");
	}
};
