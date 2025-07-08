import { dr, Tx } from "~/db.server";
import { disasterRecordsTable, disasterRecords, humanCategoryPresenceTable, disasterEventTable } from "~/drizzle/schema";
import { eq, sql, and } from "drizzle-orm";
import type { TenantContext } from "~/util/tenant";

import { CreateResult, DeleteResult, UpdateResult } from "~/backend.server/handlers/form/form";
import { Errors, hasErrors } from "~/frontend/form";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";

export interface DisasterRecordsFields extends Omit<disasterRecords, "id"> { }

// do not change
export function validate(_fields: DisasterRecordsFields): Errors<DisasterRecordsFields> {
	let errors: Errors<DisasterRecordsFields> = {};
	errors.fields = {};

	return errors
}


export async function disasterRecordsCreate(tx: Tx, fields: DisasterRecordsFields, tenantContext: TenantContext): Promise<CreateResult<DisasterRecordsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	// Enforce tenant isolation for disaster event references
	if (fields.disasterEventId) {
		// Check if the referenced disaster event belongs to the same tenant
		const disasterEventCheck = await tx.query.disasterEventTable.findFirst({
			where: and(
				eq(disasterEventTable.id, fields.disasterEventId),
				eq(disasterEventTable.countryAccountsId, tenantContext.countryAccountId)
			)
		});

		if (!disasterEventCheck) {
			return {
				ok: false,
				errors: {
					fields: {},
					form: ["Cannot create disaster record with disaster event from another tenant"]
				}
			};
		}
	}

	const res = await tx.insert(disasterRecordsTable)
		.values({
			...fields,
			countryAccountsId: tenantContext.countryAccountId, // Set tenant context
			updatedAt: sql`NOW()`,
		})
		.returning({ id: disasterRecordsTable.id });

	return { ok: true, id: res[0].id };
}

export async function disasterRecordsUpdate(tx: Tx, idStr: string, fields: Partial<DisasterRecordsFields>, tenantContext: TenantContext): Promise<UpdateResult<DisasterRecordsFields>> {
	let errors: Errors<DisasterRecordsFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return { ok: false, errors: errors }
	}

	// First check if the record exists and belongs to the tenant
	const existingRecord = await tx.select()
		.from(disasterRecordsTable)
		.where(and(
			eq(disasterRecordsTable.id, idStr),
			eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId)
		))
		.limit(1);

	if (existingRecord.length === 0) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: ["Record not found or you don't have permission to update it"]
			}
		};
	}

	// Enforce tenant isolation for disaster event references
	if (fields.disasterEventId && fields.disasterEventId !== "") {
		// Check if the referenced disaster event belongs to the same tenant
		const disasterEventCheck = await tx.query.disasterEventTable.findFirst({
			where: and(
				eq(disasterEventTable.id, fields.disasterEventId),
				eq(disasterEventTable.countryAccountsId, tenantContext.countryAccountId)
			)
		});

		if (!disasterEventCheck) {
			return {
				ok: false,
				errors: {
					fields: {},
					form: ["Cannot update disaster record with disaster event from another tenant"]
				}
			};
		}
	}

	if (fields.disasterEventId === "") {
		fields.disasterEventId = null;
	}

	let id = idStr;
	await tx.update(disasterRecordsTable)
		.set({
			...fields,
			updatedAt: sql`NOW()`
		})
		.where(and(
			eq(disasterRecordsTable.id, id),
			eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId) // Tenant isolation
		));

	await updateTotalsUsingDisasterRecordId(tx, idStr)

	return { ok: true };
}

export type DisasterRecordsViewModel = Exclude<Awaited<ReturnType<typeof disasterRecordsById>>,
	undefined
>;

export async function disasterRecordsIdByImportId(tx: Tx, importId: string, tenantContext: TenantContext) {
	const res = await tx.select({
		id: disasterRecordsTable.id
	}).from(disasterRecordsTable).where(and(
		eq(disasterRecordsTable.apiImportId, importId),
		eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId) // Tenant isolation
	))
	if (res.length == 0) {
		return null
	}
	return res[0].id
}

export async function disasterRecordsBasicInfoById(idStr: string) {
	// For public access, only fetch published records without tenant context
	let id = idStr;

	// Query just the disaster record with approval status check
	let record = await dr.select()
		.from(disasterRecordsTable)
		.where(and(
			eq(disasterRecordsTable.id, id),
			eq(disasterRecordsTable.approvalStatus, "published") // Only published records are accessible
		))
		.limit(1);

	if (record.length === 0) {
		return null; // Return null if not found or not published
	}

	return record[0];
}

export async function disasterRecordsById(idStr: string, tenantContext: TenantContext) {
	return disasterRecordsByIdTx(dr, idStr, tenantContext);
}

export async function disasterRecordsByIdTx(tx: Tx, idStr: string, tenantContext: TenantContext) {
	let id = idStr;

	// First query just the disaster record with tenant isolation
	let record = await tx.select()
		.from(disasterRecordsTable)
		.where(and(
			eq(disasterRecordsTable.id, id),
			eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId) // Tenant isolation
		))
		.limit(1);

	if (record.length === 0) {
		return null; // Return null instead of throwing error for better test handling
	}

	// Then fetch related data separately to avoid query argument limit
	const disasterRecord = record[0];

	// Add related data as needed with separate queries
	// This approach avoids the "too many arguments" error by not using the complex "with" clause

	return disasterRecord;
}


export async function disasterRecordsDeleteById(idStr: string, tenantContext: TenantContext): Promise<DeleteResult> {
	// First verify the record belongs to the tenant
	const record = await disasterRecordsById(idStr, tenantContext);
	if (!record) {
		return { ok: false, error: "Record not found or you don't have permission to delete it" };
	}

	// Delete with tenant isolation
	await dr.delete(disasterRecordsTable)
		.where(and(
			eq(disasterRecordsTable.id, idStr),
			eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId) // Tenant isolation
		))
	return { ok: true }
}

export async function getHumanEffectRecordsById(disasterRecordidStr: string, tenantContext: TenantContext) {
	return _getHumanEffectRecordsByIdTx(dr, disasterRecordidStr, tenantContext);
}

async function _getHumanEffectRecordsByIdTx(tx: Tx, disasterRecordidStr: string, tenantContext: TenantContext) {
	// First verify the disaster record belongs to the tenant
	const record = await disasterRecordsByIdTx(tx, disasterRecordidStr, tenantContext);
	if (!record) {
		throw new Error("Record not found or you don't have permission to access it");
	}
	let id = disasterRecordidStr;
	let res = await tx.query.humanCategoryPresenceTable.findFirst({
		where: eq(humanCategoryPresenceTable.recordId, id),
	});

	return res;
}
