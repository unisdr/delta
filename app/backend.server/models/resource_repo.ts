import {dr, Tx} from "~/db.server";
import {resourceRepoTable, resourceRepo} from "~/drizzle/schema";
import {eq} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

export interface ResourceRepoFields extends Omit<resourceRepo, "id"> {}

// do not change
export function validate(_fields: ResourceRepoFields): Errors<ResourceRepoFields> {
	let errors: Errors<ResourceRepoFields> = {};
	errors.fields = {};

	return errors
}


export async function resourceRepoCreate(tx: Tx, fields: ResourceRepoFields): Promise<CreateResult<ResourceRepoFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await tx.insert(resourceRepoTable)
		.values({
			title: fields.title,
			summary: fields.summary,
		})
		.returning({id: resourceRepoTable.id});

	return {ok: true, id: res[0].id};
}

export async function resourceRepoUpdate(tx: Tx, idStr: string, fields: ResourceRepoFields): Promise<UpdateResult<ResourceRepoFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = idStr;
	await tx.update(resourceRepoTable)
		.set({
			title: fields.title,
			summary: fields.summary,
		})
		.where(eq(resourceRepoTable.id, id));

	return {ok: true};
}

export type ResourceRepoViewModel = Exclude<Awaited<ReturnType<typeof resourceRepoById>>,
	undefined
>;

export async function resourceRepoById(idStr: string) {
	let id = idStr;
	return await dr.query.resourceRepoTable.findFirst({
		where: eq(resourceRepoTable.id, id),
	});
}


export async function resourceRepoDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, resourceRepoTable)
	return {ok: true}
}



