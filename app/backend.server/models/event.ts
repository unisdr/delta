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
import {eventTable, EventInsert, hazardEventTable, HazardEventInsert, eventRelationshipTable, DisasterEventInsert, disasterEventTable, hazardEventTableConstraits, disasterEventTableConstraits} from "~/drizzle/schema";
import {checkConstraintError} from "./common";

import {dr, Tx} from "~/db.server";

import {
	eq,
	sql
} from "drizzle-orm";
import {isValidUUID} from "~/util/id";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

export interface HazardEventFields extends Omit<EventInsert, 'id'>, Omit<HazardEventInsert, 'id'>, ObjectWithImportId {
	parent: string
}

export function validate(_fields: Partial<HazardEventFields>): Errors<HazardEventFields> {
	let errors: Errors<HazardEventFields> = {};
	errors.fields = {};
	return errors
}

export async function hazardEventCreate(tx: Tx, fields: HazardEventFields): Promise<CreateResult<HazardEventFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({
			example: fields.example,
		})
		.returning({id: eventTable.id});
	eventId = res[0].id

	let values: HazardEventFields = {
		...fields,
	}
	try {

		await tx
			.insert(hazardEventTable)
			.values({
				...values,
				id: eventId,
				createdAt: new Date(),
			})
	} catch (error: any) {
		let res = checkConstraintError(error, hazardEventTableConstraits)
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

export async function hazardEventUpdate(tx: Tx, id: string, fields: Partial<HazardEventFields>): Promise<UpdateResult<HazardEventFields>> {
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
		let res = await tx
			.update(hazardEventTable)
			.set({
				...fields,
				updatedAt: new Date(),
			})
			.where(eq(hazardEventTable.id, id))
			.returning({id: hazardEventTable.id})
		if (res.length === 0) {
			errors.form.push(`Record with id ${id} does not exist`)
			return {ok: false, errors}
		}
	} catch (error: any) {
		let res = checkConstraintError(error, hazardEventTableConstraits)
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
	hazard: {
		with: {
			cluster: {
				with: {
					class: true
				}
			}
		}
	}
} as const


export async function hazardEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: hazardEventTable.id
	}).from(hazardEventTable).where(eq(
		hazardEventTable.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return res[0].id
}


export type HazardEventViewModel = Exclude<Awaited<ReturnType<typeof hazardEventById>>,
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

export async function hazardEventById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardEventTable.findFirst({
		where: eq(hazardEventTable.id, id),
		with: {
			...hazardBasicInfoJoin,
			...hazardParentJoin
		}
	});
	return res
}

export type HazardEventBasicInfoViewModel = Exclude<Awaited<ReturnType<typeof hazardEventBasicInfoById>>,
	undefined
>;

export async function hazardEventBasicInfoById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardEventTable.findFirst({
		where: eq(hazardEventTable.id, id),
		with: {
			...hazardBasicInfoJoin,
		}
	});
	return res
}


export async function hazardEventDelete(id: string): Promise<DeleteResult> {
	try {
		await dr.transaction(async (tx) => {
			await tx
				.delete(hazardEventTable)
				.where(eq(hazardEventTable.id, String(id)));

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
	//hazardEvent: string
}

export async function disasterEventCreate(tx: Tx, fields: DisasterEventFields): Promise<CreateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (!fields.hazardEventId) {
		errors.fields.hazardEventId = ["Select hazardous event"]
	} else if (!isValidUUID(fields.hazardEventId)) {
		errors.fields.hazardEventId = ["Hazardous event invalid id format"]
	}
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}


	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({
			example: fields.example,
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
		await processAndSaveAttachments(tx, eventId, fields.attachments);
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

		await processAndSaveAttachments(tx, id, fields.attachments);	
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
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.disasterEventTable.findFirst({
		where: eq(disasterEventTable.id, id),
		with: {
			hazardEvent: {
				with: hazardBasicInfoJoin
			},
			event: {
				with: {
					ps: true,
					cs: true
				}
			},
		}
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

async function processAndSaveAttachments(tx: Tx, resourceId: string, attachmentsData: string) {
	if (!attachmentsData) return;
  
	const save_path = `/uploads/resource-repo/${resourceId}`;
	const save_path_temp = `/uploads/temp`;
  
	// Process the attachments data
	const processedAttachments = ContentRepeaterUploadFile.save(attachmentsData, save_path_temp, save_path);
  
	// Update the `attachments` field in the database
	await tx.update(disasterEventTable)
	  .set({
		attachments: processedAttachments || "[]", // Ensure it defaults to an empty array if undefined
	  })
	  .where(eq(disasterEventTable.id, resourceId));
}