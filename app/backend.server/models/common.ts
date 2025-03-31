import {dr} from "~/db.server";
import {SQL, sql, Column, eq} from 'drizzle-orm';

import {
	CreateResult,
	UpdateResult,
	ErrorResult,
} from "~/backend.server/handlers/form/form";

import {
	FormError
} from "~/frontend/form";
import {errorForField} from "../handlers/form/form_utils";

export function selectTranslated<T extends string>(field: Column, fieldName: T, langs: string[]) {
	const name: SQL[] = [];
	name.push(sql`COALESCE(`);

	{
		const cond = langs.map((lang) => {
			return sql`${field}->>${lang}`
		})
		cond.push(sql`(SELECT value FROM jsonb_each_text(${field}) LIMIT 1)`)
		name.push(sql.join(cond, sql.raw(", ")))
	}
	name.push(sql`)`);

	const nameLang: SQL[] = [];
	nameLang.push(sql`COALESCE( CASE `);


	{
		const cond = langs.map((lang) => {
			return sql`WHEN ${field}->>${lang} IS NOT NULL THEN ${lang}`
		})
		cond.push(sql`ELSE (SELECT key FROM jsonb_each_text(${field}) LIMIT 1)`)
		nameLang.push(sql.join(cond, sql.raw(" ")))
	}
	nameLang.push(sql`END )`)

	let res: Record<T | `${T}Lang`, SQL<string>> = {} as Record<T | `${T}Lang`, SQL<string>>;
	res[fieldName] = sql.join(name) as SQL<string>
	res[`${fieldName}Lang`] = sql.join(nameLang) as SQL<string>
	return res
}

export async function deleteById(idStr: string, table: any, isNumberId: boolean) {
	if (isNumberId) {
		await deleteByIdForNumberId(idStr, table)
		return
	}
	await deleteByIdForStringId(idStr, table)
}


export async function deleteByIdForNumberId(
	idStr: string,
	table: any,
) {
	const id = Number(idStr);

	await dr.transaction(async (tx) => {
		const existingRecord = tx.select({}).from(table).where(eq(table.id, id))
		if (!existingRecord) {
			throw new Error(`Record with ID ${id} not found`);
		}
		await tx.delete(table).where(eq(table.id, id));
	});
}

export async function deleteByIdForStringId(
	idStr: string,
	table: any
) {
	let id = idStr;
	await dr.transaction(async (tx) => {
		const existingRecord = tx.select({}).from(table).where(eq(table.id, id))
		if (!existingRecord) {
			throw new Error(`Record with ID ${id} not found`);
		}
		await tx.delete(table).where(eq(table.id, id));
	});
}

export const TransactionAbortError = "TransactionAbortError"

async function handleTransaction(
	txFn: (tx: any) => Promise<{ok: boolean}>
): Promise<{ok: boolean}> {
	let result: {ok: boolean}
	try {
		await dr.transaction(async (tx) => {
			const res = await txFn(tx)
			result = res
			if (!res.ok) {
				throw TransactionAbortError
			}
		})
	} catch (error) {
		if (error !== TransactionAbortError) {
			throw error
		}
	}
	return result!
}

export async function handleCreateTransaction<T>(
	txFn: (tx: any) => Promise<CreateResult<T>>
): Promise<CreateResult<T>> {
	return handleTransaction(txFn) as Promise<CreateResult<T>>
}

export async function handleUpdateTransaction<T>(
	txFn: (tx: any) => Promise<UpdateResult<T>>
): Promise<UpdateResult<T>> {
	return handleTransaction(txFn) as Promise<UpdateResult<T>>
}

type ConstraitErrorType = "unique" | "reference" | "other"

export function constraintError<T extends Record<string, any>>(
	constraint: keyof T,
	type: ConstraitErrorType
): FormError {
	let message = ''

	switch (type) {
		case "unique":
			message = `The field '${String(constraint)}' must be unique`
			break
		case "reference":
			message = `Invalid reference for field '${String(constraint)}'. Please check if the referenced value exists`
			break
		case "other":
		default:
			message = `An error occurred with field '${String(constraint)}'`
			break
	}

	return {
		code: "constraint",
		data: type,
		message
	}
}


export function constraintPGCodeToType(code: string): ConstraitErrorType {
	if (code === "23503") {
		return "reference";
	}
	if (code === "23505") {
		return "unique";
	}
	return "other";
}

export function checkConstraintError<T extends Record<string, any>, C extends Record<string, string>>(
	err: any,
	constraints: C,
): ErrorResult<T> | null {
	if (!err.constraint) {
		return null;
	}

	const type = constraintPGCodeToType(err.code);

	for (const key in constraints) {
		if (err.constraint === constraints[key]) {
			const e = constraintError(key as keyof C, type);
			return errorForField<T>(key as unknown as keyof T, e);
		}
	}

	const e = `Database constraint failed: ${err.constraint}`;
	return {
		ok: false,
		errors: {
			form: [e],
		},
	};
}



