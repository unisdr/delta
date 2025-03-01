import {dr, Tx} from "~/db.server";
import {disasterRecordsTable, disasterRecords, humanCategoryPresenceTable} from "~/drizzle/schema";
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
			disasterEventId: fields.disasterEventId == "" ? null : fields.disasterEventId,
			locationDesc: fields.locationDesc,
			startDate: fields.startDate,
			endDate: fields.endDate,
			localWarnInst: fields.localWarnInst,
			primaryDataSource: fields.primaryDataSource,
			otherDataSource: fields.otherDataSource,
			fieldAssessDate: fields.fieldAssessDate,
			assessmentModes: fields.assessmentModes,
			originatorRecorderInst: fields.originatorRecorderInst,
			validatedBy: fields.validatedBy,
			checkedBy: fields.checkedBy,
			dataCollector: fields.dataCollector,
			approvalStatus: fields.approvalStatus,
			spatialFootprint: fields.spatialFootprint,
			updatedAt: sql`NOW()`,
		})
		.returning({id: disasterRecordsTable.id});

	return {ok: true, id: res[0].id};
}

export async function disasterRecordsUpdate(tx: Tx, idStr: string, fields: Partial<DisasterRecordsFields>): Promise<UpdateResult<DisasterRecordsFields>> {
	let errors: Errors<DisasterRecordsFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	if (fields.disasterEventId == "") {
		fields.disasterEventId = null;
	}

	let id = idStr;
	await tx.update(disasterRecordsTable)
		.set({
			...fields
		})
		.where(eq(disasterRecordsTable.id, id));

	return {ok: true};
}

export type DisasterRecordsViewModel = Exclude<Awaited<ReturnType<typeof disasterRecordsById>>,
	undefined
>;

export async function disasterRecordsIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: disasterRecordsTable.id
	}).from(disasterRecordsTable).where(eq(
		disasterRecordsTable.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return res[0].id
}

export async function disasterRecordsById(idStr: string) {
	return disasterRecordsByIdTx(dr, idStr);
}

export async function disasterRecordsByIdTx(tx: Tx, idStr: string) {
	let id = idStr;
	let res= await tx.query.disasterRecordsTable.findFirst({
		where: eq(disasterRecordsTable.id, id),
		with: {
			disasterEvent: true,
			hipHazard: true,
			hipCluster: true,
			hipType: true,
		}
	});
	if(!res){
		throw new Error("Id is invalid");
	}
	return res;
}


export async function disasterRecordsDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, disasterRecordsTable)
	return {ok: true}
}

export async function getHumanEffectRecordsById(disasterRecordidStr: string) {
	return _getHumanEffectRecordsByIdTx(dr, disasterRecordidStr);
}

async function _getHumanEffectRecordsByIdTx(tx: Tx, disasterRecordidStr: string) {
	let id = disasterRecordidStr;
	let res= await tx.query.humanCategoryPresenceTable.findFirst({
		where: eq(humanCategoryPresenceTable.recordId, id),
	});
	
	return res;
}