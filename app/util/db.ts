import {Tx} from "~/db.server"

import {
	sql,
	SQLChunk
} from "drizzle-orm"

interface PGError extends Error {
	code: string;
	constraint?: string;
	routine?: string;
}

// Check if the error is a unique constraint violation
export function errorIsNotUnique(e: Error, table: string, column: string): boolean {
	const pgError = e as PGError;
	return (
		pgError.code === '23505' &&
		pgError.constraint === `${table}_${column}_unique`
	);
}

export async function insertRow(
	tx: Tx,
	tbl: any,
	cols: string[],
	vals: any[]
): Promise<string> {
	const query = sql`
		INSERT INTO ${tbl} (${sql.join(cols.map((col) => sql.raw(col)), sql`, `)})
		VALUES (${sql.join(vals, sql`, `)}) RETURNING id
	`
	const res = await tx.execute(query)
	return res.rows[0].id as string
}

export async function updateRow(
	tx: Tx,
	tbl: any,
	cols: string[],
	vals: any[],
	id: any
): Promise<void> {
	if (!id) {
		throw new Error("Update requires a valid id")
	}

	const assignments = cols
		.map((col, i) => (vals[i] !== undefined ? sql`${sql.raw(col)} = ${vals[i]}` : undefined))
		.filter(a => a !== undefined) as SQLChunk[]

	if (!assignments.length) {
		// nothing to do
		return
	}

	const query = sql`
		UPDATE ${tbl}
		SET ${sql.join(assignments, sql`, `)}
		WHERE id = ${id}
		RETURNING id
	`

	const res = await tx.execute(query)
	if (res.rows.length === 0) {
		throw new Error(`No record found with id: ${id}`)
	}
}


export async function deleteRow(tx: Tx, tbl: any, id: any): Promise<void> {
	if (!id) {
		throw new Error("Delete requires a valid id")
	}

	const query = sql`
		DELETE FROM ${tbl}
		WHERE id = ${id}
		RETURNING id
	`

	const res = await tx.execute(query)
	if (res.rows.length === 0) {
		throw new Error(`No record found with id: ${id}`)
	}
}

