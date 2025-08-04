import {
	CreateResult,
	DeleteResult,
	ObjectWithImportId,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, hasErrors } from "~/frontend/form";
import {
	eventTable,
	EventInsert,
	hazardousEventTable,
	InsertHazardousEvent,
	eventRelationshipTable,
	InsertDisasterEvent,
	disasterEventTable,
	hazardousEventTableConstraits,
	disasterEventTableConstrains,
	hipHazardTable,
	hipClusterTable,
	hipTypeTable,
} from "~/drizzle/schema";
import { checkConstraintError } from "./common";

import { dr, Tx } from "~/db.server";

import { eq, sql, and } from "drizzle-orm";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { getRequiredAndSetToNullHipFields } from "./hip_hazard_picker";
import { parseFlexibleDate } from "../utils/dateFilters";

interface TemporalValidationResult {
	isValid: boolean;
	errorMessage?: string;
	parentEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
	childEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
}

export interface HazardousEventFields
	extends Omit<EventInsert, "id">,
		Omit<InsertHazardousEvent, "id">,
		ObjectWithImportId {
	parent: string;
	// countryAccountsId will be auto-assigned from tenant context, not user input
}

export function validate(
	fields: Partial<HazardousEventFields>
): Errors<HazardousEventFields> {
	let errors: Errors<HazardousEventFields> = {};
	errors.fields = {};

	let requiredHip = getRequiredAndSetToNullHipFields(fields);
	if (requiredHip) {
		if (requiredHip == "type") {
			errors.fields.hipHazardId = ["HIP type is required"];
		} else if (requiredHip == "cluster") {
			errors.fields.hipHazardId = ["HIP cluster is required"];
		} else {
			throw new Error("unknown field: " + requiredHip);
		}
	}

	return errors;
}

export async function hazardousEventCreate(
	tx: Tx,
	fields: HazardousEventFields
	// userId?: number
): Promise<CreateResult<HazardousEventFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors: errors };
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({})
		.returning({ id: eventTable.id });
	eventId = res[0].id;

	// Ensure parent belongs to same tenant if specified
	if (fields.parent) {
		const parentEvent = await tx
			.select({ countryAccountsId: hazardousEventTable.countryAccountsId })
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, fields.parent));

		if (parentEvent.length === 0) {
			return {
				ok: false,
				errors: {
					fields: { parent: ["Parent event not found"] },
					form: [],
				},
			};
		}

		if (parentEvent[0].countryAccountsId !== fields.countryAccountsId) {
			return {
				ok: false,
				errors: {
					fields: { parent: ["Cannot reference events from other countries"] },
					form: [],
				},
			};
		}
	}

	let values = {
		...fields,
	};
	try {
		await tx
			.insert(hazardousEventTable)
			.values({
				...values,
				id: eventId,
				createdAt: new Date(),
			})
			.returning();

		if (res.length > 0) {
			await processAndSaveAttachments(
				hazardousEventTable,
				tx,
				eventId,
				Array.isArray(fields?.attachments) ? fields.attachments : [],
				"hazardous-event"
			);
		}
	} catch (error: any) {
		let res = checkConstraintError(error, hazardousEventTableConstraits);
		if (res) {
			return res;
		}
		throw error;
	}

	if (fields.parent) {
		await tx.insert(eventRelationshipTable).values({
			parentId: fields.parent,
			childId: eventId,
			type: "caused_by",
		});
	}
	return { ok: true, id: eventId };
}

/**
 * Creates a user-friendly error message for cycle detection
 */
function createCycleErrorMessage(
	childId: string,
	potentialParentId: string,
	childDescription?: string | null,
	parentDescription?: string | null,
	hasExistingChain?: boolean
): string {
	// Create user-friendly names from descriptions or fallback to IDs
	const childName = childDescription
		? childDescription.length > 50
			? childDescription.substring(0, 50) + "..."
			: childDescription
		: `Event ${childId.substring(0, 8)}`;

	const parentName = parentDescription
		? parentDescription.length > 50
			? parentDescription.substring(0, 50) + "..."
			: parentDescription
		: `Event ${potentialParentId.substring(0, 8)}`;

	const baseMessage = `Cannot set '${parentName}' as the cause of '${childName}' because it would create a circular relationship.`;

	if (hasExistingChain) {
		// Indirect cycle - there's already a chain from parent to child
		return `${baseMessage} This would create a loop because '${childName}' already leads back to '${parentName}' through existing relationships. Please select a different parent event.`;
	} else {
		// Direct cycle - direct relationship exists
		return `${baseMessage} This would create a loop because '${childName}' already leads back to '${parentName}'. Please select a different parent event.`;
	}
}

export const RelationCycleError = {
	code: "ErrRelationCycle",
	message:
		"Event relation cycle not allowed. This event or one of it's children, is set as the parent.",
};

export async function hazardousEventUpdate(
	tx: Tx,
	id: string,
	fields: Partial<HazardousEventFields>
	// userId?: number
): Promise<UpdateResult<HazardousEventFields>> {
	const validationErrors = validate(fields);
	const errors: Errors<HazardousEventFields> = {
		...validationErrors,
		form: [...(validationErrors.form || [])],
	};

	if (!fields.countryAccountsId) {
		if (!errors.form) errors.form = [];
		errors.form.push("User has no country accounts.");
		return { ok: false, errors };
	}

	// 1. Get old record for validation and audit logging
	const [oldRecord] = await tx
		.select()
		.from(hazardousEventTable)
		.where(
			and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, fields.countryAccountsId)
			)
		);

	if (!oldRecord) {
		if (!errors.form) errors.form = [];
		errors.form.push(`Record with id ${id} does not exist`);
		return { ok: false, errors };
	}

	// 2. Pre-transaction validation
	if (fields.parent !== undefined) {
		// 2.1 Self-reference check
		if (fields.parent === id) {
			errors.fields = errors.fields || {};
			errors.fields.parent = [
				{
					code: "ErrSelfReference",
					message: "Cannot set an event as its own parent",
				},
			];
			return { ok: false, errors };
		}

		// 2.2 Cycle detection check
		if (fields.parent) {
			const cycleCheck = await checkForCycle(tx, id, fields.parent);
			if (cycleCheck.has_cycle) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrRelationCycle",
						message: createCycleErrorMessage(
							id,
							fields.parent,
							cycleCheck.child_description,
							cycleCheck.parent_description,
							cycleCheck.has_existing_chain
						),
					},
				];
				return { ok: false, errors };
			}

			// 2.3 Temporal validation - ensure parent starts before or at same time as child
			const temporalCheck = await validateTemporalCausality(
				tx,
				id,
				fields.parent
			);
			if (!temporalCheck.isValid) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrTemporalCausality",
						message:
							temporalCheck.errorMessage ||
							"Invalid temporal relationship between events",
					},
				];
				return { ok: false, errors };
			}
		}
	}

	// All validations passed, proceed with transaction
	return await tx.transaction(async (tx) => {
		try {
			// 3. Handle parent relationship updates if needed
			if (fields.parent !== undefined) {
				// Delete existing parent relationship if any
				await tx
					.delete(eventRelationshipTable)
					.where(
						and(
							eq(eventRelationshipTable.childId, id),
							eq(eventRelationshipTable.type, "caused_by")
						)
					);

				// Only insert if parent is not null
				if (fields.parent) {
					await tx.insert(eventRelationshipTable).values({
						parentId: fields.parent,
						childId: id,
						type: "caused_by",
					});
				}
			}

			// 3. Update the hazardous event
			await tx
				.update(hazardousEventTable)
				.set({
					...fields,
					updatedAt: new Date(),
				})
				.where(eq(hazardousEventTable.id, id))
				.returning();

			// 5. Process attachments
			if (Array.isArray(fields?.attachments)) {
				await processAndSaveAttachments(
					hazardousEventTable,
					tx,
					id,
					fields.attachments,
					"hazardous-event"
				);
			}

			return { ok: true };
		} catch (error: any) {
			const constraintError = checkConstraintError(
				error,
				hazardousEventTableConstraits
			);
			if (constraintError) {
				return constraintError;
			}
			throw error;
		}
	});
}

interface CycleCheckResult {
	has_cycle: boolean;
	cycle_path?: string[];
	event_names?: Record<string, string>;
	child_description?: string | null;
	parent_description?: string | null;
	has_existing_chain?: boolean;
}

async function checkForCycle(
	tx: Tx,
	childId: string,
	potentialParentId: string
): Promise<CycleCheckResult> {
	// Get event descriptions for better error messages
	const eventDescriptions = await tx
		.select({
			id: hazardousEventTable.id,
			description: hazardousEventTable.description,
		})
		.from(hazardousEventTable)
		.where(
			sql`${hazardousEventTable.id} = ${childId} OR ${hazardousEventTable.id} = ${potentialParentId}`
		);

	const descriptionMap = eventDescriptions.reduce((acc, event) => {
		acc[event.id] = event.description;
		return acc;
	}, {} as Record<string, string | null>);

	// Check for cycles using recursive query
	const result = await tx.execute(sql`
        WITH RECURSIVE cycle_check AS (
            -- Start from the potential parent
            SELECT child_id, parent_id, ARRAY[child_id] as path
            FROM event_relationship
            WHERE child_id = ${potentialParentId}
            
            UNION ALL
            
            -- Recursively find all parents
            SELECT er.child_id, er.parent_id, cc.path || er.parent_id
            FROM event_relationship er
            JOIN cycle_check cc ON er.child_id = cc.parent_id
            WHERE 
                -- Stop if we find the original child (cycle) or if the path gets too long
                NOT er.parent_id = ANY(cc.path) AND 
                array_length(cc.path, 1) < 10
        )
        -- Check if the child appears in any parent's ancestry
        SELECT EXISTS (
            SELECT 1 FROM cycle_check 
            WHERE ${childId} = ANY(path) OR parent_id = ${childId}
            LIMIT 1
        ) as has_cycle;
    `);

	// Return better error information
	if (result.rows[0]?.has_cycle) {
		return {
			has_cycle: true,
			cycle_path: [childId, potentialParentId],
			event_names: {
				[childId]:
					descriptionMap[childId] || `Event ${childId.substring(0, 8)}`,
				[potentialParentId]:
					descriptionMap[potentialParentId] ||
					`Event ${potentialParentId.substring(0, 8)}`,
			},
			child_description: descriptionMap[childId],
			parent_description: descriptionMap[potentialParentId],
			has_existing_chain: true, // Assume existing chain since cycle was detected
		};
	}

	return { has_cycle: false };
}

interface TemporalValidationResult {
	isValid: boolean;
	errorMessage?: string;
	parentEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
	childEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
}

/**
 * Validates that a parent event's start date is not after the child's start date
 * @param tx Database transaction
 * @param childId ID of the child event
 * @param parentId ID of the potential parent event
 * @returns Validation result with status and error message if invalid
 */
async function validateTemporalCausality(
	tx: Tx,
	childId: string,
	parentId: string
): Promise<TemporalValidationResult> {
	// Get event dates and descriptions for both events
	const events = await tx
		.select({
			id: hazardousEventTable.id,
			startDate: hazardousEventTable.startDate,
			endDate: hazardousEventTable.endDate,
			description: hazardousEventTable.description,
		})
		.from(hazardousEventTable)
		.where(
			sql`${hazardousEventTable.id} = ${childId} OR ${hazardousEventTable.id} = ${parentId}`
		);

	const parentEvent = events.find((e) => e.id === parentId);
	const childEvent = events.find((e) => e.id === childId);

	if (!parentEvent || !childEvent) {
		return {
			isValid: false,
			errorMessage: "One or both events could not be found",
		};
	}

	// Parse dates using the existing flexible date parser
	const parentStartDate = parentEvent.startDate
		? parseFlexibleDate(parentEvent.startDate.toString())
		: null;
	const childStartDate = childEvent.startDate
		? parseFlexibleDate(childEvent.startDate.toString())
		: null;

	// If either date is missing, we can't validate temporally
	if (!parentStartDate || !childStartDate) {
		return {
			isValid: true, // Don't block if dates aren't set
			parentEventDates: {
				startDate: parentStartDate,
				endDate: parentEvent.endDate?.toString() || null,
			},
			childEventDates: {
				startDate: childStartDate,
				endDate: childEvent.endDate?.toString() || null,
			},
		};
	}

	// Normalize dates for comparison
	const normalizedParent = normalizeDateForComparison(parentStartDate);
	const normalizedChild = normalizeDateForComparison(childStartDate);

	// Parent must start before or at the same time as child
	const isValid = normalizedParent <= normalizedChild;

	return {
		isValid,
		errorMessage: !isValid
			? createTemporalErrorMessage(
					parentEvent.description || `Event ${parentId.substring(0, 8)}`,
					childEvent.description || `Event ${childId.substring(0, 8)}`,
					parentStartDate,
					childStartDate
			  )
			: undefined,
		parentEventDates: {
			startDate: parentStartDate,
			endDate: parentEvent.endDate?.toString() || null,
		},
		childEventDates: {
			startDate: childStartDate,
			endDate: childEvent.endDate?.toString() || null,
		},
	};
}

/**
 * Normalizes dates to a consistent format for comparison
 * @param dateStr Date string in YYYY, YYYY-MM, or YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format for comparison
 */
function normalizeDateForComparison(dateStr: string): string {
	// If already in YYYY-MM-DD format, return as-is
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr;
	}

	// For YYYY-MM format, add day as 01
	if (/^\d{4}-\d{2}$/.test(dateStr)) {
		return `${dateStr}-01`;
	}

	// For YYYY format, add month and day as 01-01
	if (/^\d{4}$/.test(dateStr)) {
		return `${dateStr}-01-01`;
	}

	// For any other format, try to parse it as a date
	const date = new Date(dateStr);
	if (!isNaN(date.getTime())) {
		return date.toISOString().split("T")[0];
	}

	// If we can't parse it, return as-is (will likely fail comparison)
	return dateStr;
}

/**
 * Creates a user-friendly error message for temporal validation failures
 */
function createTemporalErrorMessage(
	parentName: string,
	childName: string,
	parentStartDate: string,
	childStartDate: string
): string {
	const formatDateForDisplay = (dateStr: string): string => {
		if (/^\d{4}$/.test(dateStr)) return `the year ${dateStr}`;
		if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}`;
		return new Date(dateStr).toLocaleDateString();
	};

	const parentDisplay = formatDateForDisplay(parentStartDate);
	const childDisplay = formatDateForDisplay(childStartDate);

	return `Timeline conflict: '${parentName}' started in ${parentDisplay}, but '${childName}' started in ${childDisplay}. A parent event must occur before or at the same time as the event it causes. Please select a parent event that starts earlier or on the same date.`;
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
} as const;

export async function hazardousEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: hazardousEventTable.id,
		})
		.from(hazardousEventTable)
		.where(eq(hazardousEventTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}

export type HazardousEventViewModel = Exclude<
	Awaited<ReturnType<typeof hazardousEventById>>,
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
									...hazardBasicInfoJoin,
								},
							},
						},
					},
				},
			},
			cs: {
				with: {
					c: {
						with: {
							he: {
								with: {
									...hazardBasicInfoJoin,
								},
							},
						},
					},
				},
			},
		},
	},
} as const;

export async function hazardousEventById(id: string) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.hazardousEventTable.findFirst({
		where: eq(hazardousEventTable.id, id),
		with: {
			...hazardBasicInfoJoin,
			...hazardParentJoin,
			countryAccount: {
				with: {
					country: true,
				},
			},
		},
	});
	return res;
}

export type HazardousEventBasicInfoViewModel = Exclude<
	Awaited<ReturnType<typeof hazardousEventBasicInfoById>>,
	undefined
>;

// Includes tenant filtering
export async function hazardousEventBasicInfoById(
	id: string,
	countryAccountsId?: string
) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const whereClause = countryAccountsId
		? and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, countryAccountsId)
		  )
		: eq(hazardousEventTable.id, id); // For public/system access

	const res = await dr.query.hazardousEventTable.findFirst({
		where: whereClause,
		with: {
			...hazardBasicInfoJoin,
		},
	});
	return res;
}

export async function hazardousEventDelete(id: string): Promise<DeleteResult> {
	try {
		// First check if there are any disaster events linked to this hazard event
		const linkedDisasterEvents = await dr
			.select()
			.from(disasterEventTable)
			.where(and(eq(disasterEventTable.hazardousEventId, id)));

		if (linkedDisasterEvents.length > 0) {
			return {
				ok: false,
				error:
					"Cannot delete hazard event because it is linked to one or more disaster events. Please delete the associated disaster events first.",
			};
		}

		await dr.transaction(async (tx) => {
			await tx
				.delete(hazardousEventTable)
				.where(and(eq(hazardousEventTable.id, id)));

			await tx
				.delete(eventRelationshipTable)
				.where(eq(eventRelationshipTable.childId, String(id)));

			await tx.delete(eventTable).where(eq(eventTable.id, String(id)));
		});
	} catch (error: any) {
		if (
			error?.code === "23503" &&
			error?.message.includes("event_relationship_parent_id_event_id_fk")
		) {
			return {
				ok: false,
				error: "Delete events that are caused by this event first",
			};
		} else {
			throw error;
		}
	}
	return { ok: true };
}

export interface DisasterEventFields
	extends Omit<EventInsert, "id">,
		Omit<InsertDisasterEvent, "id" /*| "countryAccountsId"*/> {}

export async function disasterEventCreate(
	tx: Tx,
	fields: DisasterEventFields
	//countryAccountsId: string
): Promise<CreateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];

	// Ensure hazardous event belongs to the same tenant if specified
	if (fields.hazardousEventId) {
		const hazardousEvent = await tx
			.select({ countryAccountsId: hazardousEventTable.countryAccountsId })
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, fields.hazardousEventId));

		if (hazardousEvent.length === 0) {
			return {
				ok: false,
				errors: {
					fields: { hazardousEventId: ["Hazardous event not found"] },
					form: [],
				},
			};
		}

		if (hazardousEvent[0].countryAccountsId !== fields.countryAccountsId) {
			return {
				ok: false,
				errors: {
					fields: {
						hazardousEventId: [
							"Cannot reference hazardous events from other tenants",
						],
					},
					form: [],
				},
			};
		}
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({})
		.returning({ id: eventTable.id });
	eventId = res[0].id;

	let values: DisasterEventFields = {
		...fields,
	};
	try {
		await tx.insert(disasterEventTable).values({
			...values,
			id: eventId,
			// countryAccountsId: fields.countryAccountsId,
		});
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstrains);
		if (res) {
			return res;
		}
		throw error;
	}

	if (res.length > 0) {
		await processAndSaveAttachments(
			disasterEventTable,
			tx,
			eventId,
			Array.isArray(fields?.attachments) ? fields.attachments : [],
			"disaster-event"
		);
	}

	return { ok: true, id: eventId };
}

export async function disasterEventUpdate(
	tx: Tx,
	id: string,
	fields: Partial<DisasterEventFields>
): Promise<UpdateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return { ok: false, errors: errors };
	}
	fields.countryAccountsId;
	if (!fields.countryAccountsId) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: ["User has no instance assigned to."],
			},
		};
	}

	const event = await tx
		.select({ id: disasterEventTable.id })
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, fields.countryAccountsId)
			)
		);

	if (event.length === 0) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: ["You don't have permission to update this disaster event"],
			},
		};
	}

	try {
		await tx
			.update(disasterEventTable)
			.set({
				...fields,
			})
			.where(
				and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, fields.countryAccountsId)
				)
			);

		await processAndSaveAttachments(
			disasterEventTable,
			tx,
			id,
			Array.isArray(fields?.attachments) ? fields.attachments : [],
			"disaster-event"
		);
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstrains);
		if (res) {
			return res;
		}
		throw error;
	}

	return { ok: true };
}

export type DisasterEventViewModel = Exclude<
	Awaited<ReturnType<typeof disasterEventById>>,
	undefined
>;

export async function disasterEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: disasterEventTable.id,
		})
		.from(disasterEventTable)
		.where(and(eq(disasterEventTable.apiImportId, importId)));
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}

export async function disasterEventById(id: any) {
	return disasterEventByIdTx(dr, id);
}

export async function disasterEventByIdTx(tx: Tx, id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const disasterEvent = await tx.query.disasterEventTable.findFirst({
		where: and(eq(disasterEventTable.id, id)),
	});

	if (!disasterEvent) {
		throw new Error("Id is invalid");
	}

	// Then load related data in separate queries to avoid argument limit
	const [hazardousEvent, hipHazard, hipCluster, hipType, event] =
		await Promise.all([
			disasterEvent.hazardousEventId
				? tx.query.hazardousEventTable.findFirst({
						where: eq(hazardousEventTable.id, disasterEvent.hazardousEventId),
				  })
				: Promise.resolve(null),
			disasterEvent.hipHazardId
				? tx.query.hipHazardTable.findFirst({
						where: eq(hipHazardTable.id, disasterEvent.hipHazardId),
				  })
				: Promise.resolve(null),
			disasterEvent.hipClusterId
				? tx.query.hipClusterTable.findFirst({
						where: eq(hipClusterTable.id, disasterEvent.hipClusterId),
				  })
				: Promise.resolve(null),
			disasterEvent.hipTypeId
				? tx.query.hipTypeTable.findFirst({
						where: eq(hipTypeTable.id, disasterEvent.hipTypeId),
				  })
				: Promise.resolve(null),
			tx.query.eventTable.findFirst({
				where: eq(eventTable.id, id),
			}),
		]);

	return {
		...disasterEvent,
		hazardousEvent: hazardousEvent || undefined,
		hipHazard: hipHazard || undefined,
		hipCluster: hipCluster || undefined,
		hipType: hipType || undefined,
		event: event || undefined,
		disasterEvent: disasterEvent, // Self-reference for backward compatibility
	};
}

export type DisasterEventBasicInfoViewModel = Exclude<
	Awaited<ReturnType<typeof disasterEventBasicInfoById>>,
	undefined
>;

export async function disasterEventBasicInfoById(
	id: any,
	countryAccountsId?: string
) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.disasterEventTable.findFirst({
		where: countryAccountsId
			? and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, countryAccountsId)
			  )
			: eq(disasterEventTable.id, id),
	});
	return res;
}

export async function disasterEventDelete(
	id: string,
	countryAccountsId: string
): Promise<DeleteResult> {
	// Verify the event belongs to the tenant before deleting
	const event = await dr
		.select({ id: disasterEventTable.id })
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, countryAccountsId)
			)
		);

	if (event.length === 0) {
		return {
			ok: false,
			error: "You don't have permission to delete this disaster event",
		};
	}

	await dr.transaction(async (tx) => {
		await tx
			.delete(disasterEventTable)
			.where(
				and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, countryAccountsId)
				)
			);

		await tx.delete(eventTable).where(eq(eventTable.id, id));
	});
	return { ok: true };
}

async function processAndSaveAttachments(
	tableObj: any,
	tx: Tx,
	resourceId: string,
	attachmentsData: any[],
	directory: string
) {
	if (!attachmentsData) return;

	const save_path = `/uploads/${directory}/${resourceId}`;
	const save_path_temp = `/uploads/temp`;

	// Process the attachments data
	const processedAttachments = ContentRepeaterUploadFile.save(
		attachmentsData,
		save_path_temp,
		save_path
	);

	// Update the `attachments` field in the database
	await tx
		.update(tableObj)
		.set({
			attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
		})
		.where(eq(tableObj.id, resourceId));
}
