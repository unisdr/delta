import {
	CreateResult,
	UpdateResult
} from "~/backend.server/components/form";
import {
	Errors,
	hasErrors,
} from "~/components/form";
import {eventTable, Event, hazardEventTable, HazardEvent, eventRelationshipTable, DisasterEvent, disasterEventTable} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {
	eq,
} from "drizzle-orm";



export interface HazardEventFields extends Omit<Event, 'id'>, Omit<HazardEvent, 'id'> {
	parent: string
}

export async function hazardEventCreate(fields: HazardEventFields): Promise<CreateResult<HazardEventFields>> {
	let errors: Errors<HazardEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (!fields.hazardId) {
		errors.fields!.hazardId = ["Select a hazard"];
	}
	if (!fields.startDate) {
		errors.fields!.startDate = ["Start date is required"];

	}
	if (!fields.endDate) {
		errors.fields!.endDate = ["End date is required"];

	}
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

export async function hazardEventUpdate(id: string, fields: HazardEventFields): Promise<UpdateResult<HazardEventFields>> {
	let errors: Errors<HazardEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (!fields.hazardId) {
		errors.fields!.hazardId = ["Select a hazard"];
	}
	if (!fields.startDate) {
		errors.fields!.startDate = ["Start date is required"];

	}
	if (!fields.endDate) {
		errors.fields!.endDate = ["End date is required"];

	}
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
		let values: HazardEventFields = {
			...fields,
			startDate: new Date(fields.startDate!),
			endDate: new Date(fields.endDate!),
		}
		console.log("setting values", values)

		await tx
			.update(hazardEventTable)
			.set({
				...values
			})
			.where(eq(hazardEventTable.id, id))
	})

	return {ok: true}
}

export type HazardEventViewModel = Exclude<Awaited<ReturnType<typeof hazardEventById>>,
	undefined
>;

export async function hazardEventById(id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardEventTable.findFirst({
		where: eq(hazardEventTable.id, id),
		with: {
			event: {
				with: {
					parents: true,
					children: true
				}
			},
			hazard: {
				with: {
					cluster: {
						with: {
							class: true
						}
					}
				}
			}
		},
	});
	return res
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
					parents: true,
					children: true
				}
			},
		}
	});
	return res
}

