import {dr, Tx} from "~/db.server";
import {disasterRecordsTable, disasterRecords} from "~/drizzle/schema";
import {eq,sql} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

export interface DisasterRecordsFields extends Omit<disasterRecords, "id"> {}

// do not change
export function validate(_fields: DisasterRecordsFields): Errors<DisasterRecordsFields> {
	let errors: Errors<DisasterRecordsFields> = {};
	errors.fields = {};

	return errors
}


export async function disasterRecordsCreate(tx: Tx, fields: DisasterRecordsFields): Promise<CreateResult<DisasterRecordsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await tx.insert(disasterRecordsTable)
		.values({
			disasterEventId: fields.disasterEventId,
			approvalStatus: fields.approvalStatus,
			updatedAt: sql`NOW()`,
		})
		.returning({id: disasterRecordsTable.id});

	return {ok: true, id: res[0].id};
}

export async function disasterRecordsUpdate(tx: Tx, idStr: string, fields: DisasterRecordsFields): Promise<UpdateResult<DisasterRecordsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = idStr;
	await tx.update(disasterRecordsTable)
		.set({
			disasterEventId: fields.disasterEventId,
			approvalStatus: fields.approvalStatus,
			updatedAt: sql`NOW()`,
		})
		.where(eq(disasterRecordsTable.id, id));

	return {ok: true};
}

export type DisasterRecordsViewModel = Exclude<Awaited<ReturnType<typeof disasterRecordsById>>,
	undefined
>;

export async function disasterRecordsById(idStr: string) {
	let id = idStr;
	return await dr.query.disasterRecordsTable.findFirst({
		where: eq(disasterRecordsTable.id, id),
	});
}


export async function disasterRecordsDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, disasterRecordsTable)
	return {ok: true}
}



