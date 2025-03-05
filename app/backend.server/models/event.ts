import {
	CreateResult,
	DeleteResult,
	ObjectWithImportId,
	UpdateResult
} from "~/backend.server/handlers/form";
import {
	Errors,
	hasErrors,
} from "~/frontend/form";
import {eventTable, EventInsert, hazardousEventTable, HazardousEventInsert, eventRelationshipTable, DisasterEventInsert, disasterEventTable, hazardousEventTableConstraits, disasterEventTableConstraits} from "~/drizzle/schema";
import {checkConstraintError} from "./common";

import {dr, Tx} from "~/db.server";

import {
	eq,
	getTableName,
	sql
} from "drizzle-orm";

import {ContentRepeaterUploadFile} from "~/components/ContentRepeater/UploadFile";
import {logAudit} from "./auditLogs";
import {getRequiredAndSetToNullHipFields} from "./hip_hazard_picker";

export interface HazardousEventFields extends Omit<EventInsert, 'id'>, Omit<HazardousEventInsert, 'id'>, ObjectWithImportId {
	parent: string
}

export function validate(fields: Partial<HazardousEventFields>): Errors<HazardousEventFields> {
	let errors: Errors<HazardousEventFields> = {};
	errors.fields = {};

	let requiredHip = getRequiredAndSetToNullHipFields(fields)
	if (requiredHip) {
		if (requiredHip == "type") {
			errors.fields.hipHazardId = ["HIP type is required"]
		} else if (requiredHip == "cluster") {
			errors.fields.hipHazardId = ["HIP cluster is required"]
		} else {
			throw new Error("unknown field: " + requiredHip)
		}
	}

	return errors
}

export async function hazardousEventCreate(tx: Tx, fields: HazardousEventFields, userId?: number): Promise<CreateResult<HazardousEventFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({
		})
		.returning({id: eventTable.id});
	eventId = res[0].id

	let values: HazardousEventFields = {
		...fields,
	}
	try {

		let newHazardousEventRecord = await tx
			.insert(hazardousEventTable)
			.values({
				...values,
				id: eventId,
				createdAt: new Date(),
			}).returning();

		if (userId) {
			logAudit({
				tableName: getTableName(hazardousEventTable),
				recordId: newHazardousEventRecord[0].id,
				action: "Create hazardous event",
				newValues: JSON.stringify(newHazardousEventRecord[0]),
				oldValues: null,
				userId: userId,
			})
		}

		if (res.length > 0) {
			await processAndSaveAttachments(hazardousEventTable, tx, eventId, Array.isArray(fields?.attachments) ? fields.attachments : [], "hazardous-event");
		}
	} catch (error: any) {
		let res = checkConstraintError(error, hazardousEventTableConstraits)
		if (res) {
			return res
		}
		throw error
	}

	if (fields.parent) {
		await tx
			.insert(eventRelationshipTable)
			.values({
				parentId: fields.parent,
				childId: eventId,
				type: "caused_by"
			})
	}
	return {ok: true, id: eventId}
}



export const RelationCycleError = {code: "ErrRelationCycle", message: "Event relation cycle not allowed. This event or one of it's children, is set as the parent."}

export async function hazardousEventUpdate(tx: Tx, id: string, fields: Partial<HazardousEventFields>, userId?: number): Promise<UpdateResult<HazardousEventFields>> {
	let errors = validate(fields);
	errors.form = errors.form || [];

	if (hasErrors(errors)) {
		return {ok: false, errors}
	}


	/*
	console.log("updating eventTable")
	await tx
		.update(eventTable)
		.set({
			example: fields.example,
		})
		.where(eq(eventTable.id, id))
*/

	try {
		let oldRecord = await tx.select().from(hazardousEventTable).where(eq(hazardousEventTable.id, id));
		let res = await tx
			.update(hazardousEventTable)
			.set({
				...fields,
				updatedAt: new Date(),
			})
			.where(eq(hazardousEventTable.id, id))
			// .returning({id: hazardousEventTable.id})
			.returning()
		if (res.length === 0) {
			errors.form.push(`Record with id ${id} does not exist`)
			return {ok: false, errors}
		}

		if (userId) {
			logAudit({
				tableName: getTableName(hazardousEventTable),
				recordId: res[0].id,
				action: "Update hazardous event",
				newValues: res[0],
				oldValues: oldRecord[0],
				userId: userId,
			})
		}

		await processAndSaveAttachments(hazardousEventTable, tx, id, Array.isArray(fields?.attachments) ? fields.attachments : [], "hazardous-event");
	} catch (error: any) {
		let res = checkConstraintError(error, hazardousEventTableConstraits)
		if (res) {
			return res
		}
		throw error
	}

	if (fields.parent === undefined) {
		console.log("parent field was not provided in partial, not updating parent relation")
	} else {
		console.log("updating parent relation");

		await tx
			.delete(eventRelationshipTable)
			.where(eq(eventRelationshipTable.childId, String(id)));


		if (fields.parent !== "") {

			await tx
				.insert(eventRelationshipTable)
				.values({
					parentId: fields.parent,
					childId: id,
					type: "caused_by"
				});

			// check for cycles using new value
			const er = eventRelationshipTable

			const parentPathRows = await tx.execute(sql`
WITH RECURSIVE pp AS (
	SELECT
		er1.parent_id,
		er1.child_id,
		ARRAY[er1.child_id] AS path
	FROM ${er} er1
	WHERE er1.child_id = ${fields.parent}
	UNION ALL
	SELECT
		er2.parent_id,
		er2.child_id,
		pp.path || er2.child_id
	FROM ${er} er2
	INNER JOIN pp ON pp.child_id = er2.parent_id
	WHERE er2.child_id != ALL(pp.path) -- Prevent cycles
)
SELECT pp.parent_id FROM pp
`);

			const parentPath = parentPathRows.rows.map((r) => r.parent_id)

			console.log("parentPath", parentPath, id)

			if (parentPath.includes(id)) {
				console.log("Parent path includes this event, aborting")
				errors.fields = errors.fields || {};
				errors.fields!.parent = [RelationCycleError]
				return {ok: false, errors: errors}
			}
		}
	}


	return {ok: true}
}

export const hazardBasicInfoJoin = {
	hipHazard: {
		/*
		We set class and cluster directly assigned to the hazard, top levels can be set without selecting lower ones. also the links between class, cluster and hazard could have been changed in hips 
		with: {
			cluster: {
				with: {
					class: true
				}
			}
		}*/
	},
	hipCluster: true,
	hipType: true,
} as const


export async function hazardousEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: hazardousEventTable.id
	}).from(hazardousEventTable).where(eq(
		hazardousEventTable.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return res[0].id
}


export type HazardousEventViewModel = Exclude<Awaited<ReturnType<typeof hazardousEventById>>,
	undefined
>;

const hazardParentJoin = {
	event: {
		with: {
			ps: {
				with: {
					p: {
						with: {
							he: {
								with: {
									...hazardBasicInfoJoin
								}
							}
						}
					}
				}
			},
			cs: {
				with: {
					c: {
						with: {
							he: {
								with: {
									...hazardBasicInfoJoin
								}
							}
						}
					}
				}
			},
		},
	}
} as const

export async function hazardousEventById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardousEventTable.findFirst({
		where: eq(hazardousEventTable.id, id),
		with: {
			...hazardBasicInfoJoin,
			...hazardParentJoin
		}
	});
	return res
}

export type HazardousEventBasicInfoViewModel = Exclude<Awaited<ReturnType<typeof hazardousEventBasicInfoById>>,
	undefined
>;

export async function hazardousEventBasicInfoById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardousEventTable.findFirst({
		where: eq(hazardousEventTable.id, id),
		with: {
			...hazardBasicInfoJoin,
		}
	});
	return res
}


export async function hazardousEventDelete(id: string): Promise<DeleteResult> {
	try {
		await dr.transaction(async (tx) => {
			await tx
				.delete(hazardousEventTable)
				.where(eq(hazardousEventTable.id, String(id)));

			await tx
				.delete(eventRelationshipTable)
				.where(eq(eventRelationshipTable.childId, String(id)));

			await tx
				.delete(eventTable)
				.where(eq(eventTable.id, String(id)));

		})
	} catch (error: any) {
		if (
			error?.code === "23503" &&
			error?.message.includes("event_relationship_parent_id_event_id_fk")
		) {
			return {ok: false, "error": "Delete events that are caused by this event first"}
		} else {
			throw error;
		}
	}
	return {ok: true}
}

export interface DisasterEventFields extends Omit<EventInsert, 'id'>, Omit<DisasterEventInsert, 'id'> {
	//hazardousEvent: string
}

export async function disasterEventCreate(tx: Tx, fields: DisasterEventFields): Promise<CreateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	/*
	if (!fields.hazardousEventId && !fields.hipTypeId) {
		errors.fields.hazardousEventId = ["Select hazardous event or HIP class"]
	} else {
		if (fields.hazardousEventId && !isValidUUID(fields.hazardousEventId)) {
			errors.fields.hazardousEventId = ["Hazardous event invalid id format"]
		}
	}
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}
 */


	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({
		})
		.returning({id: eventTable.id});
	eventId = res[0].id

	let values: DisasterEventFields = {
		...fields,
	}
	try {
		await tx
			.insert(disasterEventTable)
			.values({
				...values,
				id: eventId,
			})
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstraits)
		if (res) {
			return res
		}
		throw error
	}

	if (res.length > 0) {
		await processAndSaveAttachments(disasterEventTable, tx, eventId, Array.isArray(fields?.attachments) ? fields.attachments : [], "disaster-event");
	}

	/*
if (fields.parent) {
	await tx
		.insert(eventRelationshipTable)
		.values({
			parentId: fields.parent,
			childId: eventId,
			type: "caused_by"
		})
}*/
	return {ok: true, id: eventId}
}

export async function disasterEventUpdate(tx: Tx, id: string, fields: Partial<DisasterEventFields>): Promise<UpdateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

//	console.log("disaster event update", "fields", fields)

	/*
	console.log("updating eventTable")
	await tx
		.update(eventTable)
		.set({
			example: fields.example,
		})
		.where(eq(eventTable.id, id))
*/

	try {
		await tx
			.update(disasterEventTable)
			.set({
				...fields
			})
			.where(eq(disasterEventTable.id, id))

		await processAndSaveAttachments(disasterEventTable, tx, id, Array.isArray(fields?.attachments) ? fields.attachments : [], "disaster-event");
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstraits)
		if (res) {
			return res
		}
		throw error
	}

	return {ok: true}
}

export type DisasterEventViewModel = Exclude<Awaited<ReturnType<typeof disasterEventById>>,
	undefined
>;

export async function disasterEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: disasterEventTable.id
	}).from(disasterEventTable).where(eq(
		disasterEventTable.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return res[0].id
}

export async function disasterEventById(id: any) {
	return disasterEventByIdTx(dr, id);
}

export async function disasterEventByIdTx(tx: Tx, id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await tx.query.disasterEventTable.findFirst({
		where: eq(disasterEventTable.id, id),
		with: {
			hazardousEvent: {
				with: hazardBasicInfoJoin
			},
			disasterEvent: true,
			hipHazard: true,
			hipCluster: true,
			hipType: true,
			event: {
				with: {
					ps: true,
					cs: true
				}
			},
		}
	});

	if (!res) {
		throw new Error("Id is invalid");
	}

	return res
}

export type DisasterEventBasicInfoViewModel = Exclude<Awaited<ReturnType<typeof disasterEventBasicInfoById>>,
	undefined
>;

export async function disasterEventBasicInfoById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.disasterEventTable.findFirst({
		where: eq(disasterEventTable.id, id),
	});
	return res
}


export async function disasterEventDelete(id: string): Promise<DeleteResult> {
	await dr.transaction(async (tx) => {
		await tx
			.delete(disasterEventTable)
			.where(eq(disasterEventTable.id, id));

		/*
	await tx
		.delete(eventRelationshipTable)
		.where(eq(eventRelationshipTable.childId, String(id)));
*/
		await tx
			.delete(eventTable)
			.where(eq(eventTable.id, id));
	})
	return {ok: true}
}

async function processAndSaveAttachments(tableObj: any, tx: Tx, resourceId: string, attachmentsData: any[], directory: string) {
	if (!attachmentsData) return;

	const save_path = `/uploads/${directory}/${resourceId}`;
	const save_path_temp = `/uploads/temp`;

	// Process the attachments data
	const processedAttachments = ContentRepeaterUploadFile.save(attachmentsData, save_path_temp, save_path);

	// Update the `attachments` field in the database
	await tx.update(tableObj)
		.set({
			attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
		})
		.where(eq(tableObj.id, resourceId));
}
