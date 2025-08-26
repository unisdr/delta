import { dr, Tx } from "~/db.server";
import {
	damagesTable,
	DamagesInsert,
	disasterRecordsTable,
} from "~/drizzle/schema";
import { and, eq } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { unitsEnum } from "~/frontend/unit_picker";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";
import { getDisasterRecordsByIdAndCountryAccountsId } from "~/db/queries/disasterRecords";

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}

export function fieldsForPd(
	pre: "pd" | "td",
	currencies?: string[]
): FormInputDef<DamagesFields>[] {
	let repairOrReplacement = pre == "pd" ? "Repair" : "Replacement";
	if (!currencies) {
		currencies = [];
	}
	return [
		{
			key: (pre + "DamageAmount") as keyof DamagesFields,
			label: "Amount of units",
			type: "number",
			uiRow: {},
		},
		{
			key: (pre + repairOrReplacement + "CostUnit") as keyof DamagesFields,
			label: `Unit ${repairOrReplacement.toLowerCase()} cost`,
			type: "money",
			uiRow: {},
		},
		{
			key: (pre +
				repairOrReplacement +
				"CostUnitCurrency") as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: currencies.map((c) => ({ key: c, label: c })),
		},
		{
			key: (pre + repairOrReplacement + "CostTotal") as keyof DamagesFields,
			label: `Total ${repairOrReplacement.toLowerCase()} cost`,
			type: "money",
		},
		{
			key: (pre +
				repairOrReplacement +
				"CostTotalOverride") as keyof DamagesFields,
			label: "Override",
			type: "bool",
		},
		{
			key: (pre + "RecoveryCostUnit") as keyof DamagesFields,
			label: "Unit recovery cost",
			type: "money",
			uiRow: {},
		},
		{
			key: (pre + "RecoveryCostUnitCurrency") as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: currencies.map((c) => ({ key: c, label: c })),
		},
		{
			key: (pre + "RecoveryCostTotal") as keyof DamagesFields,
			label: "Total recovery cost",
			type: "money",
		},
		{
			key: (pre + "RecoveryCostTotalOverride") as keyof DamagesFields,
			label: "Override",
			type: "bool",
		},
		{
			key: (pre + "DisruptionDurationDays") as keyof DamagesFields,
			label: "Duration (days)",
			type: "number",
			uiRow: {},
		},
		{
			key: (pre + "DisruptionDurationHours") as keyof DamagesFields,
			label: "Duration (hours)",
			type: "number",
		},
		{
			key: (pre + "DisruptionUsersAffected") as keyof DamagesFields,
			label: "Number of users affected",
			type: "number",
		},
		{
			key: (pre + "DisruptionPeopleAffected") as keyof DamagesFields,
			label: "Number of people affected",
			type: "number",
		},
		{
			key: (pre + "DisruptionDescription") as keyof DamagesFields,
			label: "Comment",
			type: "textarea",
			uiRowNew: true,
		},
	];
}

export async function fieldsDef(
	currencies?: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	let currency = "";
	if (currencies && currencies.length > 0) {
		currency = currencies[0];
	}

	return [
		{ key: "recordId", label: "", type: "uuid" },
		{ key: "sectorId", label: "", type: "other" },
		{ key: "assetId", label: "Assets", type: "uuid" },

		{ key: "unit", label: "Unit", type: "enum", enumData: unitsEnum },
		{
			key: "totalDamageAmount",
			label:
				"Total number of assets affected (partially damaged + totally destroyed)",
			type: "number",
			uiRow: {},
		},
		{ key: "totalDamageAmountOverride", label: "Override", type: "bool" },
		{
			key: "totalRecovery",
			label: `Total recovery cost (${currency})`,
			type: "money",
		},
		{ key: "totalRecoveryOverride", label: "Override", type: "bool" },
		{
			key: "totalRepairReplacement",
			label: `Total damage in monetary terms (total repair + replacement cost) (${currency})`,
			type: "money",
		},
		{ key: "totalRepairReplacementOverride", label: "Override", type: "bool" },

		// Partially destroyed
		...fieldsForPd("pd", currencies),
		// Totally damaged
		...fieldsForPd("td", currencies),

		{
			key: "spatialFootprint",
			label: "Spatial Footprint",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: "Attachments",
			type: "other",
			psqlType: "jsonb",
		},
	];
}

export async function fieldsDefApi(
	currencies: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	return [
		...(await fieldsDef(currencies)),
		{ key: "apiImportId", label: "", type: "other" },
	];
}

export async function fieldsDefView(
	currencies: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	return fieldsDef(currencies);
}

export function validate(
	fields: Partial<DamagesFields>
): Errors<DamagesFields> {
	let errors: Errors<DamagesFields> = { fields: {} };
	let msg = "must be >= 0";
	let check = (k: keyof DamagesFields) => {
		if (fields[k] != null && (fields[k] as number) < 0)
			errors.fields![k] = [msg];
	};
	let keys = [
		"totalDamageAmount",
		"totalRepairReplacementRecovery",
		"pdRepairCostUnit",
		"pdRepairUnits",
		"pdRepairCostTotal",
		"pdRecoveryCostUnit",
		"pdRecoveryUnits",
		"pdRecoveryCostTotal",
		"pdDisruptionDurationDays",
		"pdDisruptionDurationHours",
		"pdDisruptionUsersAffected",
		"pdDisruptionPeopleAffected",
		"tdReplacementCostUnit",
		"tdReplacementUnits",
		"tdReplacementCostTotal",
		"tdRecoveryCostUnit",
		"tdRecoveryUnits",
		"tdRecoveryCostTotal",
		"tdDisruptionDurationDays",
		"tdDisruptionDurationHours",
		"tdDisruptionUsersAffected",
		"tdDisruptionPeopleAffected",
	];
	keys.forEach((k) => check(k as keyof DamagesFields));
	return errors;
}

export async function damagesCreate(
	tx: Tx,
	fields: DamagesFields
): Promise<CreateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

	const res = await tx
		.insert(damagesTable)
		.values({ ...fields })
		.returning({ id: damagesTable.id });

	await updateTotalsUsingDisasterRecordId(tx, fields.recordId);

	return { ok: true, id: res[0].id };
}

export async function damagesUpdate(
	tx: Tx,
	id: string,
	fields: Partial<DamagesFields>
): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

	await tx
		.update(damagesTable)
		.set({ ...fields })
		.where(eq(damagesTable.id, id));

	let recordId = await getRecordId(tx, id);
	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}
export async function damagesUpdateByIdAndCountryAccountsId(
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DamagesFields>
): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

	let recordId = await getRecordId(tx, id);
	const disasterRecords = getDisasterRecordsByIdAndCountryAccountsId(
		recordId,
		countryAccountsId
	);
	if (!disasterRecords) {
		return {
			ok: false,
			errors: {
				general: ["No matching disaster record found or you don't have access"],
			},
		};
	}

	await tx
		.update(damagesTable)
		.set({ ...fields })
		.where(eq(damagesTable.id, id));

	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function getRecordId(tx: Tx, id: string) {
	let rows = await tx
		.select({
			recordId: damagesTable.recordId,
		})
		.from(damagesTable)
		.where(eq(damagesTable.id, id))
		.execute();
	if (!rows.length) throw new Error("not found by id");
	return rows[0].recordId;
}

export type DamagesViewModel = Exclude<
	Awaited<ReturnType<typeof damagesById>>,
	undefined
>;

export async function damagesIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({ id: damagesTable.id })
		.from(damagesTable)
		.where(eq(damagesTable.apiImportId, importId));
	return res.length == 0 ? null : String(res[0].id);
}
export async function damagesIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({ id: damagesTable.id })
		.from(damagesTable)
		.innerJoin(
			disasterRecordsTable,
			eq(damagesTable.sectorId, disasterRecordsTable.id)
		)
		.where(
			and(
				eq(damagesTable.apiImportId, importId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	return res.length == 0 ? null : String(res[0].id);
}

export async function damagesById(idStr: string) {
	return damagesByIdTx(dr, idStr);
}

export async function damagesByIdTx(tx: Tx, id: string) {
	let res = await tx.query.damagesTable.findFirst({
		where: eq(damagesTable.id, id),
		with: {
			asset: true,
		},
	});
	if (!res) throw new Error("Id is invalid");
	return res;
}

export async function damagesDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, damagesTable);
	return { ok: true };
}

export async function damagesDeleteBySectorId(
	id: string
): Promise<DeleteResult> {
	await dr.delete(damagesTable).where(eq(damagesTable.sectorId, id));

	return { ok: true };
}
