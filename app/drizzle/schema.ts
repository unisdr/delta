import {
	pgTable,
	integer,
	text,
	boolean,
	timestamp,
	uuid,
	serial,
	jsonb,
	index,
	AnyPgColumn,
	check
} from "drizzle-orm/pg-core";

import {
	sql,
	relations,
} from "drizzle-orm";

function zeroTimestamp(name: string) {
	return timestamp(name).notNull().default(sql`'2000-01-01T00:00:00.000Z'`)
}
function zeroText(name: string) {
	return text(name).notNull().default("")
}
function zeroBool(name: string) {
	return boolean(name).notNull().default(false)
}
function zeroStrMap(name: string) {
	return jsonb(name).$type<Record<string, string>>().default({}).notNull()
}

function zeroInteger(name: string) {
	return integer(name).notNull().default(0)
}
const timestamps = {
	updatedAt: timestamp("updated_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	deletedAt: timestamp("deleted_at"),
}

export const sessionTable = pgTable("session", {
	...timestamps,
	id: uuid("id").primaryKey().defaultRandom(),
	userId: integer("user_id").notNull(),
	lastActiveAt: zeroTimestamp("last_active_at"),
	totpAuthed: zeroBool("totp_authed"),
});

export type Session = typeof sessionTable.$inferSelect;
export type SessionInsert = typeof sessionTable.$inferInsert;

export const sessionsRelations = relations(sessionTable, ({one}) => ({
	user: one(userTable, {
		fields: [sessionTable.userId],
		references: [userTable.id],
	}),
}));

export const userTable = pgTable("user", {
	...timestamps,
	id: serial("id").primaryKey(),
	role: zeroText("role"),
	firstName: zeroText("first_name"),
	lastName: zeroText("last_name"),
	email: text("email").notNull().unique(),
	password: zeroText("password"),
	emailVerified: zeroBool("email_verified"),
	emailVerificationCode: zeroText("email_verification_code"),
	emailVerificationSentAt: timestamp("email_verification_sent_at"),
	emailVerificationExpiresAt: zeroTimestamp("email_verification_expires_at"),
	inviteCode: zeroText("invite_code"),
	inviteSentAt: timestamp("invite_sent_at"),
	inviteExpiresAt: zeroTimestamp("invite_expires_at"),
	resetPasswordToken: zeroText("reset_password_token"),
	resetPasswordExpiresAt: zeroTimestamp("reset_password_expires_at"),
	totpEnabled: zeroBool("totp_enabled"),
	totpSecret: zeroText("totp_secret"),
	totpSecretUrl: zeroText("totp_secret_url"),
	organization: zeroText("organization"),
	hydrometCheUser: zeroBool("hydromet_che_user"),
	authType: text("auth_type").notNull().default("form"),
});

export type User = typeof userTable.$inferSelect;
export type UserInsert = typeof userTable.$inferInsert;

export const commonPasswordsTable = pgTable("commonPasswords", {
	password: text("password").primaryKey(),
});

export type CommonPassword = typeof commonPasswordsTable.$inferSelect;
export type CommonPasswordInsert = typeof commonPasswordsTable.$inferInsert;

export const itemTable = pgTable("item", {
	...timestamps,
	id: serial("id").primaryKey(),
	field1: text("field1").notNull(),
	field2: text("field2"),
});

export type Item = typeof itemTable.$inferSelect;
export type ItemInsert = typeof itemTable.$inferInsert;

export const country1Table = pgTable("country1", {
	id: serial("id").primaryKey(),
	name: zeroStrMap("name")
});

export const divisionTable = pgTable("division", {
	id: serial("id").primaryKey(),
	importId: text("import_id").unique(),
	//country: integer("country"),
	parentId: integer("parent_id").references((): AnyPgColumn => divisionTable.id),
	name: zeroStrMap("name"),
	geojson: jsonb("geojson"),
}, (table) => [
	index("parent_idx").on(table.parentId),
]);

export type Division = typeof divisionTable.$inferSelect;
export type DivitionInsert = typeof divisionTable.$inferInsert;

export const eventTable = pgTable("event", {
	id: uuid("id").primaryKey().defaultRandom(),
	example: text("example"),
	// parent
});

export const eventRel2 = relations(eventTable, ({many}) => ({
	parents: many(eventRelationshipTable, {relationName: "child"}),
	children: many(eventRelationshipTable, {relationName: "parent"})
}));

export type Event = typeof eventTable.$inferSelect;
export type EventInsert = typeof eventTable.$inferInsert;

export const eventRelationshipTable = pgTable("event_relationship", {
	parentId: uuid("parent_id")
		.references((): AnyPgColumn => eventTable.id)
		.notNull(),
	childId: uuid("child_id")
		.references((): AnyPgColumn => eventTable.id)
		.notNull(),
	// for future extensibility
	// only using caused_by right now
	type: zeroText("type"),
});

export const eventRelationshipRel = relations(eventRelationshipTable, ({one}) => ({
	parent: one(eventTable, {
		fields: [eventRelationshipTable.parentId],
		references: [eventTable.id],
		relationName: "parent",
	}),
	child: one(eventTable, {
		fields: [eventRelationshipTable.childId],
		references: [eventTable.id],
		relationName: "child"
	}),
}));

export type EventRelationship = typeof eventRelationshipTable.$inferSelect;
export type EventRelationshipInsert = typeof eventRelationshipTable.$inferInsert;

export const hazardEventTable = pgTable("hazard_event", {
	id: uuid("id").primaryKey().references((): AnyPgColumn => eventTable.id),
	hazardId: text("hazard_id").references((): AnyPgColumn => hipHazardTable.id).notNull(),
	startDate: timestamp("start_date"),
	endDate: timestamp("end_date"),
	// data fields below not used in queries directly
	// only on form screens
	// should be easier to change if needed
	// otherId1 is id in some other system TODO
	otherId1: zeroText("otherId1"),
	description: zeroText("description"),
	chainsExplanation: zeroText("chains_explanation"),
	duration: zeroText("duration"),
	magnitude: zeroText("magniture"),
	spatialFootprint: zeroText("spatial_footprint"),
	recordOriginator: zeroText("record_originator"),
	dataSource: zeroText("data_source"),
});


export type HazardEvent = typeof hazardEventTable.$inferSelect;
export type HazardEventInsert = typeof hazardEventTable.$inferInsert;

export const hazardEventRel = relations(hazardEventTable, ({one}) => ({
	event: one(eventTable, {
		fields: [hazardEventTable.id],
		references: [eventTable.id],
	}),
	hazard: one(hipHazardTable, {
		fields: [hazardEventTable.hazardId],
		references: [hipHazardTable.id],
	}),
}));


export const disasterEventTable = pgTable("disaster_event", {
	id: uuid("id").primaryKey().references((): AnyPgColumn => eventTable.id),
	// data fields below not used in queries directly
	// only on form screens
	// should be easier to change if needed
	nationalDisasterId: zeroText("national_disaster_id"),
	// otherId1 is id in some other system TODO
	otherId1: zeroText("other_id1"),
	glide: zeroText("glide"),
	nameGlobalOrRegional: zeroText("name_global_or_regional"),
	nameNational: zeroText("name_national"),
	startDateUTC: timestamp("start_date_utc"),
	endDateUTC: timestamp("end_date_utc"),
	startDateLocal: timestamp("start_date_local"),
	endDateLocal: timestamp("end_date_local"),
	durationDays: zeroInteger("duration_days"),
	affectedGeographicDivisions: zeroText("affected_geographic_divisions"),
	affectedAdministrativeRegions: zeroText("affected_administrative_regions"),
	disasterDeclaration: zeroBool("disaster_declaration"),
	disasterDeclarationType: zeroBool("disaster_declaration_type"),
	disasterDeclarationEffect: zeroBool("disaster_declaration_effect"),
	disasterDeclarationDate: zeroTimestamp("disaster_declaration_date"),
	warningIssuedLevelsSeverity: zeroText("warning_issued_levels_severity"),
	warningIssuedDate: zeroTimestamp("warning_issued_date"),
	preliminaryAssessmentDate: zeroTimestamp("preliminary_assesment_date"),
	responseOperations: zeroText("response_oprations"),
	postDisasterAssementDate: zeroTimestamp("post_disaster_assessment_date"),
	reAssementDate: zeroTimestamp("re_assessment_date"),
	dataSource: zeroText("data_source"),
	originatorRecorderOfInformation: zeroText("originator_recorder_of_information"),
	effectsTotalLocalCurrency: zeroInteger("effects_total_local_currency"),
	effectsTotalUsd: zeroInteger("effects_total_usd"),
	subtotaldamageUsd: zeroInteger("subtotal_damage_usd"),
	subtotalLossesUsd: zeroInteger("subtotal_losses_usd"),
	responseCostTotalUsd: zeroInteger("response_cost_total"),
	humanitarianNeedsTotalUsd: zeroInteger("humanitarian_needs_total"),
	recoveryNeedsTotalUsd: zeroInteger("recovery_needs_total"),
});

export type DisasterEvent = typeof disasterEventTable.$inferSelect;
export type DisasterEventInsert = typeof disasterEventTable.$inferInsert;

export const disasterEventRel = relations(disasterEventTable, ({one}) => ({
	event: one(eventTable, {
		fields: [disasterEventTable.id],
		references: [eventTable.id],
	}),
}));


// Hazard Information Profiles (HIPs)
// https://www.preventionweb.net/publication/hazard-information-profiles-hips

// examples:
// Meteorological and Hydrological 
// Extraterrestrial 
// Geohazards 
export const hipClassTable = pgTable("hip_class", {
	id: integer("id").primaryKey(),
	nameEn: zeroText("name_en")
}, (table) => [
	check("name_en_not_empty", sql`${table.nameEn} <> ''`)
]);

// examples:
// Flood
// Temperature-Related 
export const hipClusterTable = pgTable("hip_cluster", {
	id: integer("id").primaryKey(),
	classId: integer("class_id").references((): AnyPgColumn => hipClassTable.id).notNull(),
	nameEn: zeroText("name_en")
}, (table) => [
	check("name_en_not_empty", sql`${table.nameEn} <> ''`)
]);

export const hipClusterRel = relations(hipClusterTable, ({one}) => ({
	class: one(hipClassTable, {
		fields: [hipClusterTable.classId],
		references: [hipClassTable.id],
	}),
}));

// examples:
// MH0004,Flood,Coastal Flood
// GH0001,Seismogenic (Earthquakes),Earthquake
export const hipHazardTable = pgTable("hip_hazard", {
	id: text("id").primaryKey(),
	clusterId: integer("cluster_id").references((): AnyPgColumn => hipClusterTable.id).notNull(),
	nameEn: zeroText("name_en"),
	descriptionEn: zeroText("description_en")
}, (table) => [
	check("name_en_not_empty", sql`${table.nameEn} <> ''`),
	check("description_en_not_empty", sql`${table.descriptionEn} <> ''`)
]);

export const hipHazardRel = relations(hipHazardTable, ({one}) => ({
	cluster: one(hipClusterTable, {
		fields: [hipHazardTable.clusterId],
		references: [hipClusterTable.id],
	}),
}));
