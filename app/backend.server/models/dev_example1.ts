import { dr, Tx } from "~/db.server";
import { devExample1Table, InsertDevExample1 } from "~/drizzle/schema";
import { and, eq } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForNumberId } from "./common";

export interface DevExample1Fields extends Omit<InsertDevExample1, "id"> {}

function repeatFields(n: number): FormInputDef<DevExample1Fields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;
		res.push(
			{
				key: "repeatableNum" + j,
				label: "Repeatable num " + j,
				type: "number",
				repeatable: { group: "r", index: i },
			},
			{
				key: "repeatableText" + j,
				label: "Repeatable text " + j,
				type: "text",
				repeatable: { group: "r", index: i },
			}
		);
	}
	return res as FormInputDef<DevExample1Fields>[];
}

export async function fieldsDef(): Promise<FormInputDef<DevExample1Fields>[]> {
	return [
		{
			key: "field1",
			label: "Field 1",
			type: "text",
			required: true,
			tooltip: "Field 1 tooltip",
			description: "Field 1 description",
			uiRow: {
				label: "Fields 1,2",
			},
		},
		{ key: "field2", label: "Field 2", type: "text" },
		{
			key: "field3",
			label: "Field 3",
			type: "number",
			required: true,
			uiRow: {
				label: "Fields 3,4",
			},
		},
		{ key: "field4", label: "Field 4", type: "number" },
		{
			key: "field6",
			label: "Field 6",
			type: "enum",
			required: true,
			enumData: [
				{ key: "one", label: "One" },
				{ key: "two", label: "Two" },
				{ key: "three", label: "Three" },
			],
			uiRowNew: true,
		},
		{ key: "field7", label: "Field 7", type: "date", uiRowNew: true },
		{
			key: "field8",
			label: "Field 8",
			type: "date_optional_precision",
			uiRowNew: true,
		},
		...repeatFields(3),
		{ key: "jsonData", label: "Field JSON data", type: "json", uiRowNew: true },
	];
}

export async function fieldsDefApi(): Promise<
	FormInputDef<DevExample1Fields>[]
> {
	return [
		...(await fieldsDef()),
		{ key: "apiImportId", label: "", type: "other" },
	];
}

export async function fieldsDefView(): Promise<
	FormInputDef<DevExample1Fields>[]
> {
	return [
		...(await fieldsDef()),
		{ key: "countryAccountsId", label: "", type: "text" },
	];
}

export function validate(
	fields: Partial<DevExample1Fields>
): Errors<DevExample1Fields> {
	let errors: Errors<DevExample1Fields> = {};
	errors.fields = {};
	if (fields.field3 !== undefined && fields.field3 <= 10) {
		errors.fields.field3 = ["Field3 must be >10"];
	}
	if (typeof fields.field4 == "number" && fields.field4 <= 10) {
		errors.fields.field4 = ["Field4 must be >10"];
	}
	return errors;
}

export async function devExample1Create(
	tx: Tx,
	fields: DevExample1Fields,
	countryAccountsId?: string
): Promise<CreateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	if (countryAccountsId) {
		fields = { ...fields, countryAccountsId };
	}
	const res = await tx
		.insert(devExample1Table)
		.values({
			...fields,
		})
		.returning({ id: devExample1Table.id });

	return { ok: true, id: res[0].id };
}

export async function devExample1UpdateById(
	tx: Tx,
	idStr: string,
	fields: Partial<DevExample1Fields>
): Promise<UpdateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	let id = idStr;
	const result = await tx
		.update(devExample1Table)
		.set({
			...fields,
		})
		.where(
			and(
				eq(devExample1Table.id, id),
			)
		)
		.returning();

	if (result.length >= 0) {
		return { ok: true };
	}
	return {ok: false, errors: {general: ["DevExample1 not updated"]}};
}

export async function devExample1UpdateByIdAndCountryAccountsId(
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DevExample1Fields>
): Promise<UpdateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	const result = await tx
		.update(devExample1Table)
		.set({
			...fields,
		})
		.where(
			and(
				eq(devExample1Table.id, id),
				eq(devExample1Table.countryAccountsId, countryAccountsId),
			)
		)
		.returning();

	if (result.length >= 0) {
		return { ok: true };
	}
	return {ok: false, errors: {general: ["DevExample1 not updated"]}};
}

export type DevExample1ViewModel = Exclude<
	// Awaited<ReturnType<typeof devExample1ByIdAndCountryAccountsId>>,
	Awaited<ReturnType<typeof devExample1ById>>,
	undefined
>;

export async function devExample1IdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: devExample1Table.id,
		})
		.from(devExample1Table)
		.where(eq(devExample1Table.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function devExample1ById(idStr: string) {
	return devExample1ByIdTx(dr, idStr);
}

export async function devExample1ByIdTx(tx: Tx, idStr: string) {
	let id = idStr;
	let res = await tx.query.devExample1Table.findFirst({
		where: eq(devExample1Table.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid or you don't have access");
	}
	return res;
}

export async function devExample1DeleteById(
	idStr: string
): Promise<DeleteResult> {
	await deleteByIdForNumberId(idStr, devExample1Table);
	return { ok: true };
}

export async function devExample1DeleteByIdAndCountryAccounts(
	id: string,
	countryAccountsId: string
): Promise<DeleteResult> {
	await dr.transaction(async (tx) => {
		const existingRecord = tx
			.select({})
			.from(devExample1Table)
			.where(
				and(
					eq(devExample1Table.id, id),
					eq(devExample1Table.countryAccountsId, countryAccountsId)
				)
			);
		if (!existingRecord) {
			throw new Error(`Record with ID ${id} not found`);
		}
		await tx
			.delete(devExample1Table)
			.where(eq(devExample1Table.id, id));
	});
	return { ok: true };
}
