import {dr, Tx} from "~/db.server";
import {devExample1Table, DevExample1Insert} from "~/drizzle/schema";
import {eq} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForNumberId} from "./common";


export interface DevExample1Fields extends Omit<DevExample1Insert, "id"> {}

export function validate(fields: Partial<DevExample1Fields>): Errors<DevExample1Fields> {
	let errors: Errors<DevExample1Fields> = {};
	errors.fields = {};
	if (fields.field3 !== undefined && fields.field3 <= 10) {
		errors.fields.field3 = ["Field3 must be >10"];
	}
	if (typeof fields.field4 == "number"  && fields.field4 <= 10) {
		errors.fields.field4 = ["Field4 must be >10"];
	}
	return errors
}

export async function devExample1Create(tx: Tx, fields: DevExample1Fields): Promise<CreateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await tx.insert(devExample1Table)
		.values({
			...fields
		})
		.returning({id: devExample1Table.id});

	return {ok: true, id: res[0].id};
}

export async function devExample1Update(tx: Tx, idStr: string, fields: Partial<DevExample1Fields>): Promise<UpdateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = Number(idStr);
	await tx.update(devExample1Table)
		.set({
			...fields
		})
		.where(eq(devExample1Table.id, id));

	return {ok: true};
}

export type DevExample1ViewModel = Exclude<Awaited<ReturnType<typeof devExample1ById>>,
	undefined
>;

export async function devExample1IdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: devExample1Table.id
	}).from(devExample1Table).where(eq(
		devExample1Table.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return String(res[0].id)
}

export async function devExample1ById(idStr: string) {
	return devExample1ByIdTx(dr, idStr);
}

export async function devExample1ByIdTx(tx: Tx, idStr: string): Promise<DevExample1Fields>{
	let id = Number(idStr);
	let res= await tx.query.devExample1Table.findFirst({
		where: eq(devExample1Table.id, id),
	});
	if(!res){
		throw new Error("Id is invalid");
	}
	return res;
}


export async function devExample1DeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForNumberId(idStr, devExample1Table)
	return {ok: true}
}



