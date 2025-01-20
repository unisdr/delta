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
	check,
	uniqueIndex 
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

/*
function zeroInteger(name: string) {
	return integer(name).notNull().default(0)
}*/
const createdUpdatedTimestamps = {
	updatedAt: timestamp("updated_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
}


const approvalFields = {
	// drizzle has broken postgres enum support
	// using text column instead
	// https://github.com/drizzle-team/drizzle-orm/issues/3485
	approvalStatus: text({enum: ["pending", "approved", "rejected"]}).notNull().default("pending"),
}

// need function wrapper to avoid unique relation drizzle error
function apiImportIdField() {
	return {
		apiImportId: text("api_import_id").unique(),
	}
}

export const sessionTable = pgTable("session", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: integer("user_id").notNull().references(() => userTable.id),
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

export const apiKeyTable = pgTable("api_key", {
	...createdUpdatedTimestamps,
	id: serial("id").primaryKey(),
	secret: text("secret").notNull().unique(),
	name: zeroText("name"),
	managedByUserId: integer("user_id").notNull().references(() => userTable.id),
});

export type ApiKey = typeof apiKeyTable.$inferSelect;
export type ApiKeyInsert = typeof apiKeyTable.$inferInsert;

export const apiKeyRelations = relations(apiKeyTable, ({one}) => ({
	managedByUser: one(userTable, {
		fields: [apiKeyTable.managedByUserId],
		references: [userTable.id],
	}),
}));

export const devExample1Table = pgTable("dev_example1", {
	...apiImportIdField(),
	id: serial("id").primaryKey(),
	// for both required and optional text fields setting it to "" makes sense, it's different for numbers where 0 could be a valid entry
	field1: text("field1").notNull(),
	field2: text("field2").notNull(),
	// required
	field3: integer("field3").notNull(),
	// optional
	field4: integer("field4"),
	field5: timestamp("field5"),
	field6: text({enum: ["one", "two", "three"]}).notNull().default("one"),
});

export type DevExample1 = typeof devExample1Table.$inferSelect;
export type DevExample1Insert = typeof devExample1Table.$inferInsert;

export const commonPasswordsTable = pgTable("commonPasswords", {
	password: text("password").primaryKey(),
});

export type CommonPassword = typeof commonPasswordsTable.$inferSelect;
export type CommonPasswordInsert = typeof commonPasswordsTable.$inferInsert;

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

// using 2 letter relationship names, as a workaround for this bug
// https://github.com/drizzle-team/drizzle-orm/issues/2066
export const eventRel = relations(eventTable, ({one, many}) => ({
	// hazard event
	he: one(hazardEventTable, {
		fields: [eventTable.id],
		references: [hazardEventTable.id],
	}),
	// disaster event
	de: one(disasterEventTable, {
		fields: [eventTable.id],
		references: [disasterEventTable.id],
	}),
	// parents
	ps: many(eventRelationshipTable, {relationName: "c"}),
	// children
	cs: many(eventRelationshipTable, {relationName: "p"})
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
	p: one(eventTable, {
		fields: [eventRelationshipTable.parentId],
		references: [eventTable.id],
		relationName: "p",
	}),
	c: one(eventTable, {
		fields: [eventRelationshipTable.childId],
		references: [eventTable.id],
		relationName: "c"
	}),
}));

export type EventRelationship = typeof eventRelationshipTable.$inferSelect;
export type EventRelationshipInsert = typeof eventRelationshipTable.$inferInsert;

export const hazardEventTable = pgTable("hazard_event", {
	...createdUpdatedTimestamps,
	...approvalFields,
	...apiImportIdField(),
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

export const hazardEventTableConstraits = {
	apiImportId: "hazard_event_apiImportId_unique",
	hazardId: "hazard_event_hazard_id_hip_hazard_id_fk"
}

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
	...createdUpdatedTimestamps,
	...approvalFields,
	...apiImportIdField(),
	id: uuid("id").primaryKey().references((): AnyPgColumn => eventTable.id),
	hazardEventId: uuid("hazard_event_id").references((): AnyPgColumn => hazardEventTable.id).notNull(),
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
	durationDays: integer("duration_days"),
	affectedGeographicDivisions: zeroText("affected_geographic_divisions"),
	affectedAdministrativeRegions: zeroText("affected_administrative_regions"),
	disasterDeclaration: zeroBool("disaster_declaration"),
	disasterDeclarationType: zeroBool("disaster_declaration_type"),
	disasterDeclarationEffect: zeroBool("disaster_declaration_effect"),
	disasterDeclarationDate: timestamp("disaster_declaration_date"),
	warningIssuedLevelsSeverity: zeroText("warning_issued_levels_severity"),
	warningIssuedDate: timestamp("warning_issued_date"),
	preliminaryAssessmentDate: timestamp("preliminary_assesment_date"),
	responseOperations: zeroText("response_oprations"),
	postDisasterAssementDate: timestamp("post_disaster_assessment_date"),
	reAssessmentDate: timestamp("re_assessment_date"),
	dataSource: zeroText("data_source"),
	originatorRecorderOfInformation: zeroText("originator_recorder_of_information"),
	effectsTotalLocalCurrency: integer("effects_total_local_currency"),
	effectsTotalUsd: integer("effects_total_usd"),
	subtotaldamageUsd: integer("subtotal_damage_usd"),
	subtotalLossesUsd: integer("subtotal_losses_usd"),
	responseCostTotalUsd: integer("response_cost_total"),
	humanitarianNeedsTotalUsd: integer("humanitarian_needs_total"),
	recoveryNeedsTotalUsd: integer("recovery_needs_total"),
});

export type DisasterEvent = typeof disasterEventTable.$inferSelect;
export type DisasterEventInsert = typeof disasterEventTable.$inferInsert;

export const disasterEventTableConstraits = {
	hazardEventId: "disaster_event_hazard_event_id_hazard_event_id_fk"
}

export const disasterEventRel = relations(disasterEventTable, ({one}) => ({
	event: one(eventTable, {
		fields: [disasterEventTable.id],
		references: [eventTable.id],
	}),
	hazardEvent: one(hazardEventTable, {
		fields: [disasterEventTable.hazardEventId],
		references: [hazardEventTable.id],
	}),
}));

// Common disaggregation data (dsg) for human effects on disaster records
export const humanDsgTable = pgTable("human_dsg", {
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: text("record_id").notNull(),
	sex: text("sex", {enum: ["m", "f"]}),
	age: text("age", {enum: ["0-20", "21-40", "41-60", "60-81", ">80"]}),
	disability: text("disability", {enum: ["dis_group1", "dis_group2", "dis_group3"]}),
	globalPovertyLine: text("global_poverty_line", {enum: ["below", "above"]}),
	nationalPovertyLine: text("national_poverty_line", {enum: ["below", "above"]}),
	custom: jsonb("custom").$type<Record<string, any>>(),
});
export type HumanDsg = typeof humanDsgTable.$inferSelect;
export type HumanDsgInsert = typeof humanDsgTable.$inferInsert;

export const deathsTable = pgTable("deaths", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	deaths: integer("deaths"),
});

export type Deaths = typeof deathsTable.$inferSelect;
export type DeathsInsert = typeof deathsTable.$inferInsert;

export const injuredTable = pgTable("injured", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	injured: integer("injured"),
});

export type Injured = typeof injuredTable.$inferSelect;
export type InjuredInsert = typeof injuredTable.$inferInsert;

export const missingTable = pgTable("missing", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	missing: integer("missing"),
});

export type Missing = typeof missingTable.$inferSelect;
export type MissingInsert = typeof missingTable.$inferInsert;

export const affectedTable = pgTable("affected", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	direct: integer("direct"),
	indirect: integer("indirect"), 
});
export type Affected = typeof affectedTable.$inferSelect;
export type AffectedInsert = typeof affectedTable.$inferInsert;

export const displacedTable = pgTable("displaced", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	shortTerm: integer("short_term"), // First 10 days
	mediumShort: integer("medium_short"), // Days 10-30
	mediumLong: integer("medium_long"), // Days 30-90
	longTerm: integer("long_term"), // More than 90 days
	permanent: integer("permanent"), // Permanently relocated
});
export type Displaced = typeof displacedTable.$inferSelect;
export type DisplacedInsert = typeof displacedTable.$inferInsert;

export const displacementStocksTable = pgTable("displacement_stocks", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id").references((): AnyPgColumn => humanDsgTable.id).notNull(),
	preemptive: integer("preemptive"), // Assisted pre-emptive displacement
	reactive: integer("reactive"), // Assisted reactive displacement
});
export type DisplacementStocks = typeof displacementStocksTable.$inferSelect;
export type DisplacementStocksInsert = typeof displacementStocksTable.$inferInsert;



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


export const resourceRepoTable = pgTable("resource_repo", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	summary: text("summary").notNull(),
	...approvalFields,
	...createdUpdatedTimestamps,
});

export type resourceRepo = typeof resourceRepoTable.$inferSelect;
export type resourceRepoInsert = typeof resourceRepoTable.$inferInsert;

export const resourceRepoRel = relations(resourceRepoTable, ({many}) => ({
	attachments: many(rrAttachmentsTable),
}));

export const rrAttachmentsTable = pgTable("rr_attachments", {
	id: uuid("id").primaryKey().defaultRandom(),
	resourceRepoId: uuid("resource_repo_id").references((): AnyPgColumn => resourceRepoTable.id).notNull(),
	type: text({enum: ["document", "other"]}).notNull().default("document"),
	typeOtherDesc: text("type_other_desc"),
	filename: text("filename"),
	url: text("url"),
	...createdUpdatedTimestamps,
});

export const rrAttachmentsRel = relations(rrAttachmentsTable, ({one}) => ({
	attachment: one(resourceRepoTable, {
		fields: [rrAttachmentsTable.resourceRepoId],
		references: [resourceRepoTable.id],
	}),
}));

export type disasterRecords = typeof disasterRecordsTable.$inferSelect;
export type disasterRecordsInsert = typeof disasterRecordsTable.$inferInsert;

export const disasterRecordsTable = pgTable("disaster_records", {
	id: uuid("id").primaryKey().defaultRandom(),
	disasterEventId: uuid("disaster_event_id").references((): AnyPgColumn => disasterEventTable.id).notNull(),
	...approvalFields,
	...createdUpdatedTimestamps,
}, (table) => ({
	disasterEventIdUniqueIndex: uniqueIndex('disasterEventIdUniqueIndex').on(table.disasterEventId),
}));

