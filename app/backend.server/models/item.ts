import { Prisma } from "@prisma/client";

import {
	Errors,
	hasErrors,
} from "~/components/form";

import { prisma } from "~/db.server";


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

	let res

	res = await prisma.item.create({
		data: {
			field1: fields.field1,
			field2: fields.field2
		},
	});

	return { ok: true, id: res.id };
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
	let res

	try {
		res = await prisma.item.update({
			where: { id: id },
			data: {
				field1: fields.field1,
				field2: fields.field2
			},
		});
	} catch (e) {
	if (e instanceof Prisma.PrismaClientKnownRequestError) {
		if (e.code === 'P2025') {
			errors.form.push("Item was not found using provided ID.");
			return { ok: false, errors };
		}
	}
		throw e;
	}

	return { ok: true, id: res.id };
}

