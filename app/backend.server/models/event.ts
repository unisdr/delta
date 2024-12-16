import {
	CreateResult,
	DeleteResult,
	UpdateResult
} from "~/backend.server/handlers/form";
import {
	Errors,
	hasErrors,
} from "~/frontend/form";
import {eventTable, Event, hazardEventTable, HazardEvent, eventRelationshipTable, DisasterEvent, disasterEventTable} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {
	eq,
	sql
} from "drizzle-orm";

export interface HazardEventFields extends Omit<Event, 'id'>, Omit<HazardEvent, 'id'> {
	parent: string
}

export function validate(_fields: HazardEventFields): Errors<HazardEventFields> {
	let errors: Errors<HazardEventFields> = {};
	errors.fields = {};
	return errors
}

export async function hazardEventCreate(fields: HazardEventFields): Promise<CreateResult<HazardEventFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	let eventId = "";
	await dr.transaction(async (tx) => {

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
		await tx
			.insert(hazardEventTable)
			.values({
				...values,
				id: eventId,
				createdAt: new Date(),
			})

		if (fields.parent) {
			await tx
				.insert(eventRelationshipTable)
				.values({
					parentId: fields.parent,
					childId: eventId,
					type: "caused_by"
				})
		}
	})
	return {ok: true, id: eventId}
}

class ParentPathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ParentPathError";
	}
}

export async function hazardEventUpdate(id: string, fields: HazardEventFields): Promise<UpdateResult<HazardEventFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	console.log("hazard event update", "parent", fields.parent)

	try {

		await dr.transaction(async (tx) => {

			/*
			console.log("updating eventTable")
			await tx
				.update(eventTable)
				.set({
					example: fields.example,
				})
				.where(eq(eventTable.id, id))
	*/

			let values: HazardEventFields = {
				...fields,
				startDate: new Date(fields.startDate!),
				endDate: new Date(fields.endDate!),
			}
			await tx
				.update(hazardEventTable)
				.set({
					...values,
					updatedAt: new Date(),
				})
				.where(eq(hazardEventTable.id, id))

			console.log("updating parent relation");

			await tx
				.delete(eventRelationshipTable)
				.where(eq(eventRelationshipTable.childId, String(id)));

			console.log("fields.parent", fields.parent)
			if (fields.parent) {

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
					throw new ParentPathError("Parent path already includes this event");
				}
			}

		})
	} catch (error) {
		if (error instanceof ParentPathError) {
			errors.fields = errors.fields || {};
			errors.fields!.parent = ["Event relation cycle not allowed. This event or one of it's chilren, is set as the parent."]
			return {ok: false, errors: errors}
		} else {
			throw error;
		}
	}

	return {ok: true}
}

export type HazardEventViewModel = Exclude<Awaited<ReturnType<typeof hazardEventById>>,
	undefined
>;

const hazardBasicInfoJoin = {
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


export interface DisasterEventFields extends Omit<Event, 'id'>, Omit<DisasterEvent, 'id'> {
	//parent: string
}

export async function disasterEventCreate(fields: DisasterEventFields): Promise<CreateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	let eventId = "";
	await dr.transaction(async (tx) => {

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
		await tx
			.insert(disasterEventTable)
			.values({
				...values,
				id: eventId,
			})

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
	})
	return {ok: true, id: eventId}
}

export async function disasterEventUpdate(id: string, fields: DisasterEventFields): Promise<UpdateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return {ok: false, errors: errors}
	}

	await dr.transaction(async (tx) => {

		/*
		console.log("updating eventTable")
		await tx
			.update(eventTable)
			.set({
				example: fields.example,
			})
			.where(eq(eventTable.id, id))
*/
		let values: DisasterEventFields = {
			...fields,
		}
		console.log("setting values", values)

		await tx
			.update(disasterEventTable)
			.set({
				...values
			})
			.where(eq(disasterEventTable.id, id))
	})

	return {ok: true}
}

export type DisasterEventViewModel = Exclude<Awaited<ReturnType<typeof disasterEventById>>,
	undefined
>;

export async function disasterEventById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.disasterEventTable.findFirst({
		where: eq(disasterEventTable.id, id),
		with: {
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
