import {asc, eq, sql, isNull} from 'drizzle-orm';

import {
	sectorTable
} from '~/drizzle/schema';

import {dr, Tx} from '~/db.server';

export type SectorType = {
	id?: number;
	sectorname: string;
	parentId?: number;
	description?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export async function getSectors(sectorParent_id: number | null): Promise<{id: number, sectorname: string, parent_id: number | null}[]> {
	let select: {
		id: typeof sectorTable.id,
		sectorname: typeof sectorTable.sectorname,
		parent_id: typeof sectorTable.parentId
	} = {
		id: sectorTable.id,
		sectorname: sectorTable.sectorname,
		parent_id: sectorTable.parentId
	};

	if (sectorParent_id) {
		let res = await dr
			.select(select)
			.from(sectorTable)
			.where(eq(sectorTable.parentId, sectorParent_id))
			.orderBy(asc(sectorTable.sectorname));

		return res;
	}
	else {
		let res = await dr
			.select(select)
			.from(sectorTable)
			.where(isNull(sectorTable.parentId))
			.orderBy(asc(sectorTable.sectorname));

		return res;
	}
}

export async function upsertRecord(record: SectorType): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(sectorTable)
		.values(record)
		.onConflictDoUpdate({
			target: sectorTable.id,
			set: {
				id: record.id,
				sectorname: record.sectorname,
				description: record.description || null,
				parentId: record.parentId,
				level: record.level,
				updatedAt: sql`NOW()`,
			},
		});
}

export async function allSectors(tx: Tx) {
	let res = await tx.query.sectorTable.findMany()
	return res
}

let agricultureSectorId = 1201

export async function sectorIsAgriculture(tx: Tx, id: number, depth: number = 0): Promise<boolean> {
	let maxDepth = 100
  if (depth > maxDepth){
		throw new Error("sector parent loop detected")
	}
  let row = await tx.query.sectorTable.findFirst({
		where: eq(sectorTable.id, id)
	})
  if (!row) {
		throw new Error("sector not found by id")
	}
  if (row.id == agricultureSectorId){
		return true
	}
  if (row.parentId == null){
		return false
	}
  return await sectorIsAgriculture(tx, row.parentId, depth + 1)
}
