import {dr} from "~/db.server";
import {devExample1Table, DevExample1} from "~/drizzle/schema";
import {eq} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForNumberId} from "./common";

export interface DevExample1Fields extends Omit<DevExample1, "id"> {}

export function validate(fields: DevExample1Fields): Errors<DevExample1Fields> {
	let errors: Errors<DevExample1Fields> = {};
	errors.fields = {};
	if (fields.field3 <= 10) {
		errors.fields.field2 = ["Field3 must be >10"];
	}
	if (fields.field4 !== null && fields.field4 <= 10) {
		errors.fields.field4 = ["Field4 must be >10"];
	}
	return errors
}


export async function devExample1Create(fields: DevExample1Fields): Promise<CreateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await dr.insert(devExample1Table)
		.values({
			field1: fields.field1,
			field2: fields.field2,
			field3: fields.field3,
			field4: fields.field4,
		})
		.returning({id: devExample1Table.id});

	return {ok: true, id: res[0].id};
}

export async function devExample1Update(idStr: string, fields: DevExample1Fields): Promise<UpdateResult<DevExample1Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = Number(idStr);
	await dr.update(devExample1Table)
		.set({
			field1: fields.field1,
			field2: fields.field2,
			field3: fields.field3,
			field4: fields.field4,
		})
		.where(eq(devExample1Table.id, id));

	return {ok: true};
}

export type DevExample1ViewModel = Exclude<Awaited<ReturnType<typeof devExample1ById>>,
	undefined
>;

export async function devExample1ById(idStr: string) {
	let id = Number(idStr);
	return await dr.query.devExample1Table.findFirst({
		where: eq(devExample1Table.id, id),
	});
}


export async function devExample1DeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForNumberId(idStr, devExample1Table)
	return {ok: true}
}



