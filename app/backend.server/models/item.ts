import {
	Errors,
	hasErrors,
} from "~/components/form";

import { dr } from "~/db.server";

import {
	itemTable,
} from '~/drizzle/schema';

import {
	eq,
} from "drizzle-orm";

export interface DataFields {
	field1: string
	field2: string | null
}

type DataValidateResult = 
	| { ok: true;}
	| { ok: false; errors: Errors<DataFields> };

export function dataValidate(fields: DataFields): DataValidateResult {
	let errors: Errors<DataFields> = {}
	errors.form = []
	errors.fields = {}
	if (fields.field1	== "") {
		errors.fields.field1 = ["Field 1 is empty"]
	}
	if (fields.field2	== "") {
		errors.fields.field2 = ["Field 2 is empty"]
	}

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	return { ok: true }
}

type DataCreateResult = 
	| { ok: true; id: number}
	| { ok: false; errors: Errors<DataFields> };

export async function dataCreate(fields: DataFields): Promise<DataCreateResult> {
	let validationRes = dataValidate(fields)
	if (!validationRes.ok){
		return validationRes
	}

	const res = await dr
		.insert(itemTable)
		.values({
			field1: fields.field1,
			field2: fields.field2,
		})
		.returning({ id: itemTable.id });

	return { ok: true, id: res[0].id };
}

type DataUpdateResult = DataCreateResult;

export async function dataUpdate(id: number, fields: DataFields): Promise<DataUpdateResult> {
	let validationRes = dataValidate(fields)
	if (!validationRes.ok){
		return validationRes
	}

	let errors: Errors<DataFields> = {}
	errors.form = []
	errors.fields = {}

	try {
		const res = await dr
			.update(itemTable)
			.set({
			field1: fields.field1,
			field2: fields.field2,
			})
			.where(eq(itemTable.id, id))
			.returning({ id: itemTable.id });

		if (!res || res.length === 0) {
		errors.form.push("Item was not found using provided ID.");
		return { ok: false, errors };
		}
		return { ok: true, id: res[0].id };
	} catch (e: any) {
		throw e;
	}
}

