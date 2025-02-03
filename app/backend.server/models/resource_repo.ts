import {dr, Tx} from "~/db.server";
import {resourceRepoTable, resourceRepo} from "~/drizzle/schema";
import {eq,sql} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export interface ResourceRepoFields extends Omit<resourceRepo, "id"> {}

// do not change
export function validate(_fields: ResourceRepoFields): Errors<ResourceRepoFields> {
	let errors: Errors<ResourceRepoFields> = {};
	errors.fields = {};

	return errors
}

async function processAndSaveAttachments(tx: Tx, resourceId: string, attachmentsData: string) {
	if (!attachmentsData) return;
  
	const save_path = `/uploads/resource-repo/${resourceId}`;
	const save_path_temp = `/uploads/temp`;
  
	// Process the attachments data
	const processedAttachments = ContentRepeaterUploadFile.save(attachmentsData, save_path_temp, save_path);
  
	// Update the `attachments` field in the database
	await tx.update(resourceRepoTable)
	  .set({
		attachments: processedAttachments || "[]", // Ensure it defaults to an empty array if undefined
	  })
	  .where(eq(resourceRepoTable.id, resourceId));
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
			attachments: fields.attachments,
			approvalStatus: fields.approvalStatus,
			updatedAt: sql`NOW()`,
		})
		.returning({id: resourceRepoTable.id});

	if (res.length > 0) {
		const resourceId = res[0].id;
		await processAndSaveAttachments(tx, resourceId, fields.attachments);
	}

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
			attachments: fields.attachments,
			approvalStatus: fields.approvalStatus,
			updatedAt: sql`NOW()`,
		})
		.where(eq(resourceRepoTable.id, id));

	await processAndSaveAttachments(tx, idStr, fields.attachments);

	return {ok: true};
}

export type ResourceRepoViewModel = Exclude<Awaited<ReturnType<typeof resourceRepoById>>,
	undefined
>;

export async function resourceRepoById(idStr: string) {
	return resourceRepoByIdTx(dr, idStr);
}

export async function resourceRepoByIdTx(tx: Tx, idStr: string) {
	let id = idStr;
	let res= await tx.query.resourceRepoTable.findFirst({
		where: eq(resourceRepoTable.id, id),
	});
	if(!res){
		throw new Error("No resourceRepo found");
	}
	return res;
}


export async function resourceRepoDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, resourceRepoTable)
	return {ok: true}
}



