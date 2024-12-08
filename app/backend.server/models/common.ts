import { dr } from "~/db.server";
import {SQL, sql, Column, eq} from 'drizzle-orm';



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

export async function deleteById(idStr: string, table: any, isNumberId: boolean){
	if (isNumberId){
		await deleteByIdForNumberId(idStr, table)
		return
	}
		await deleteByIdForStringId(idStr, table)
}


export async function deleteByIdForNumberId(
	idStr: string,
	table: any,
){
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


