import { dr } from "~/db.server";
import {
	damagesTable,
	disasterEventTable,
	disasterRecordsTable,
	disruptionTable,
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Calculates the total repair cost of a disaster event.
 */
export const calculateTotalRepairCost = async (
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		// Fetch disaster event repair cost if available
		const disasterEvent = await dr
			.select({ repairCost: disasterEventTable.repairCostsLocalCurrency })
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, disaster_event_id));

		if (disasterEvent.length > 0 && disasterEvent[0].repairCost) {
			return Number(disasterEvent[0].repairCost);
		}

		// Fetch all disaster records linked to the disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all damages linked to the disaster records
		const damages = await dr
			.select({ pdRepairCostTotal: damagesTable.pdRepairCostTotal })
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
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		// Fetch disaster event replacement cost if available
		const disasterEvent = await dr
			.select({
				replacementCost: disasterEventTable.replacementCostsLocalCurrency,
			})
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, disaster_event_id));

		if (disasterEvent.length > 0 && disasterEvent[0].replacementCost) {
			return Number(disasterEvent[0].replacementCost);
		}

		// Fetch all disaster records linked to the disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all damages linked to the disaster records
		const damages = await dr
			.select({ tdReplacementCostTotal: damagesTable.tdReplacementCostTotal })
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
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		const disasterEvent = await dr
			.select({
				rehabilitationCost: disasterEventTable.rehabilitationCostsLocalCurrency,
			})
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, disaster_event_id));

		let totalRehabilitationCost = 0;

		//Get the recovery cost from disaster event table if exist
		if (disasterEvent.length > 0 && disasterEvent[0].rehabilitationCost) {
			totalRehabilitationCost = Number(disasterEvent[0].rehabilitationCost);
			return Number(disasterEvent[0].rehabilitationCost);
		}

		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		// Fetch all disruption linked to the disaster records
		const disruptions = await dr
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
	disaster_event_id: string
): Promise<number> => {
	if (!disaster_event_id) {
		throw new Error("Missing disaster_event_id");
	}

	try {
		//Fetch disaster event
		const disasterEvent = await dr
			.select({ recoveryCost: disasterEventTable.recoveryNeedsLocalCurrency })
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, disaster_event_id));

		let totalRecoveryCost = 0;

		//Get the recovery cost from disaster event table if exist
		if (disasterEvent.length > 0 && disasterEvent[0].recoveryCost) {
			totalRecoveryCost = Number(disasterEvent[0].recoveryCost);
			return totalRecoveryCost;
		}

		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return 0;
		}

		//Get the recovery cost from sector_disaster_records_relation.damage_recovery_cost if exit
		const sectorDisasterRecordsRelations = await dr
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
				const damages = await dr
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
