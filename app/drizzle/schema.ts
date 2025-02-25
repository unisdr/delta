import {
	pgTable,
	text,
	timestamp,
	bigint,
	bigserial,
	check,
	unique,
	boolean,
	uuid,
	jsonb,
	index,
	AnyPgColumn,
	numeric,
	integer
} from "drizzle-orm/pg-core";

import {customType} from "drizzle-orm/pg-core/columns";
import {sql, relations} from "drizzle-orm";

import {
	HumanEffectsHidden,
	HumanEffectsCustomConfig,
} from "~/frontend/human_effects/defs";

function zeroTimestamp(name: string) {
	return timestamp(name)
		.notNull()
		.default(sql`'2000-01-01T00:00:00.000Z'`);
}

function zeroText(name: string) {
	return text(name).notNull().default("");
}
function zeroBool(name: string) {
	return boolean(name).notNull().default(false);
}
function zeroStrMap(name: string) {
	return jsonb(name).$type<Record<string, string>>().default({}).notNull();
}
function ourBigint(name: string) {
	return bigint(name, {mode: "number"})
}
function ourSerial(name: string) {
	return bigserial(name, {mode: "number"})
}
function ourMoney(name: string) {
	return numeric(name)
}

const createdUpdatedTimestamps = {
	updatedAt: timestamp("updated_at"),
	createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

const approvalFields = {
	// drizzle has broken postgres enum support
	// using text column instead
	// https://github.com/drizzle-team/drizzle-orm/issues/3485
	approvalStatus: text({enum: ["open", "completed"]})
		.notNull()
		.default("open"),
};

// need function wrapper to avoid unique relation drizzle error
function apiImportIdField() {
	return {
		apiImportId: text("api_import_id").unique(),
	};
}

function hipRelationColumns() {
	return {
		hipHazardId: text("hip_hazard_id")
			.references((): AnyPgColumn => hipHazardTable.id),
		hipClusterId: text("hip_cluster_id")
			.references((): AnyPgColumn => hipClusterTable.id),
		hipClassId: text("hip_class_id")
			.references((): AnyPgColumn => hipClassTable.id)
	}
}

function unitsEnum(name: string) {
	return text(name, {
		enum: [
			"number_count",
			"area_m2",
			"area_km2",
			"area_ha",
			"area_mi2",
			"area_ac",
			"area_ft2",
			"area_yd2",
			"volume_l",
			"volume_m3",
			"volume_ft3",
			"volume_yd3",
			"volume_gal",
			"volume_bbl",
			"duration_days",
			"duration_hours"
		]
	})
}

export const sessionTable = pgTable("session", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: ourBigint("user_id")
		.notNull()
		.references(() => userTable.id),
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
	id: ourSerial("id").primaryKey(),
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
	id: ourSerial("id").primaryKey(),
	secret: text("secret").notNull().unique(),
	name: zeroText("name"),
	managedByUserId: ourBigint("user_id")
		.notNull()
		.references(() => userTable.id),
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
	id: ourSerial("id").primaryKey(),
	// for both required and optional text fields setting it to "" makes sense, it's different for numbers where 0 could be a valid entry
	field1: text("field1").notNull(),
	field2: text("field2").notNull(),
	// required
	field3: ourBigint("field3").notNull(),
	// optional
	field4: ourBigint("field4"),
	field5: timestamp("field5"),
	field6: text({enum: ["one", "two", "three"]})
		.notNull()
		.default("one"),
});

export type DevExample1 = typeof devExample1Table.$inferSelect;
export type DevExample1Insert = typeof devExample1Table.$inferInsert;

export const commonPasswordsTable = pgTable("commonPasswords", {
	password: text("password").primaryKey(),
});

export type CommonPassword = typeof commonPasswordsTable.$inferSelect;
export type CommonPasswordInsert = typeof commonPasswordsTable.$inferInsert;

export const country1Table = pgTable("country1", {
	id: ourSerial("id").primaryKey(),
	name: zeroStrMap("name"),
});

export const divisionTable = pgTable(
	"division",
	{
		id: ourSerial("id").primaryKey(),
		importId: text("import_id").unique(),
		parentId: ourBigint("parent_id").references(
			(): AnyPgColumn => divisionTable.id
		),
		name: zeroStrMap("name"),
		geojson: jsonb("geojson"),
		level: ourBigint("level"),	// value is parent level + 1 otherwise 1

		// Store geometry as a regular column that will be updated via trigger
		geom: customType({
			dataType: () => "geometry(GEOMETRY, 4326)"
		})(),

		// Store bbox as a regular column that will be updated via trigger
		bbox: customType({
			dataType: () => "geometry(GEOMETRY, 4326)"
		})(),

		// Spatial index will be updated via trigger
		spatial_index: text("spatial_index").notNull()
	},
	(table) => {
		return [
			index("parent_idx").on(table.parentId),
			index("division_level_idx").on(table.level),

			// Create GIST indexes via raw SQL since drizzle doesn't support USING clause directly
			sql`CREATE INDEX IF NOT EXISTS "division_geom_idx" ON "division" USING GIST ("geom")`,
			sql`CREATE INDEX IF NOT EXISTS "division_bbox_idx" ON "division" USING GIST ("bbox")`,

			// Ensure all geometries are valid
			check("valid_geom_check", sql`ST_IsValid(geom)`)
		];
	}
);

export const divisionParent_Rel = relations(divisionTable, ({ one }) => ({
	divisionParent: one(divisionTable, { fields: [divisionTable.parentId], references: [divisionTable.id] }),
}));

export type Division = typeof divisionTable.$inferSelect;
export type DivitionInsert = typeof divisionTable.$inferInsert;

export const eventTable = pgTable("event", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: zeroText("name").notNull(),
	description: zeroText("description").notNull(),
	// parent
});

export type Event = typeof eventTable.$inferSelect;
export type EventInsert = typeof eventTable.$inferInsert;

export const eventRel = relations(eventTable, ({one, many}) => ({
	// hazard event
	he: one(hazardousEventTable, {
		fields: [eventTable.id],
		references: [hazardousEventTable.id],
	}),
	// disaster event
	de: one(disasterEventTable, {
		fields: [eventTable.id],
		references: [disasterEventTable.id],
	}),
	// parents
	ps: many(eventRelationshipTable, {relationName: "c"}),
	// children
	cs: many(eventRelationshipTable, {relationName: "p"}),
}));

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

export const eventRelationshipRel = relations(
	eventRelationshipTable,
	({one}) => ({
		p: one(eventTable, {
			fields: [eventRelationshipTable.parentId],
			references: [eventTable.id],
			relationName: "p",
		}),
		c: one(eventTable, {
			fields: [eventRelationshipTable.childId],
			references: [eventTable.id],
			relationName: "c",
		}),
	})
);

export const hazardousEventTable = pgTable("hazardous_event", {
	...createdUpdatedTimestamps,
	...approvalFields,
	...apiImportIdField(),
	...hipRelationColumns(),
	id: uuid("id")
		.references((): AnyPgColumn => eventTable.id)
		.primaryKey(),
	status: text("status").notNull().default("pending"),
	// otherId1: zeroText("otherId1"),
	//duration: zeroText("duration"),
	nationalSpecification: zeroText("national_specification"),
	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),
	description: zeroText("description"),
	warningIssuedSummary: zeroText("warning_issued_summary"),
	warningIssuedBy: zeroText("warning_issued_by"),
	warningIssuedDate: timestamp("warning_issued_date"),
	warningIssuedCoverage: zeroText("warning_issued_coverage"),
	warningIssuedContent: zeroText("warning_issued_content"),
	chainsExplanation: zeroText("chains_explanation"),
	magnitude: zeroText("magniture"),
	spatialFootprint: jsonb("spatial_footprint"),
	recordOriginator: zeroText("record_originator"),
	hazardousEventStatus: text("hazardous_event_status", {enum: ["forecasted", "ongoing", "passed"]}),
	dataSource: zeroText("data_source"),
});

export const hazardousEventTableConstraits = {
	apiImportId: "hazardous_event_apiImportId_unique",
	hipHazardId: "hazardous_event_hip_hazard_id_hip_hazard_id_fk",
};

export type HazardousEvent = typeof hazardousEventTable.$inferSelect;
export type HazardousEventInsert = typeof hazardousEventTable.$inferInsert;

export const hazardousEventRel = relations(hazardousEventTable, ({one}) => ({
	event: one(eventTable, {
		fields: [hazardousEventTable.id],
		references: [eventTable.id],
	}),
	hipHazard: one(hipHazardTable, {
		fields: [hazardousEventTable.hipHazardId],
		references: [hipHazardTable.id],
	}),
	hipCluster: one(hipClusterTable, {
		fields: [hazardousEventTable.hipClusterId],
		references: [hipClusterTable.id],
	}),
	hipClass: one(hipClassTable, {
		fields: [hazardousEventTable.hipClassId],
		references: [hipClassTable.id],
	}),
}));

export const disasterEventTable = pgTable("disaster_event", {
	...createdUpdatedTimestamps,
	...approvalFields,
	...apiImportIdField(),
	id: uuid("id")
		.primaryKey()
		.references((): AnyPgColumn => eventTable.id),
	hazardousEventId: uuid("hazardous_event_id")
		.references((): AnyPgColumn => hazardousEventTable.id)
		.notNull(),
	nationalDisasterId: zeroText("national_disaster_id"),
	otherId1: zeroText("other_id1"),
	otherId2: zeroText("other_id2"),
	otherId3: zeroText("other_id3"),
	glide: zeroText("glide"),
	nameGlobalOrRegional: zeroText("name_global_or_regional"),
	startDate: timestamp("start_date"),
	endDate: timestamp("end_date"),
	startDateLocal: text("start_date_local"),
	endDateLocal: text("end_date_local"),
	durationDays: ourBigint("duration_days"),
	disasterDeclaration: text("disaster_declaration", {enum: ["yes", "no", "unknown"]})
		.notNull()
		.default("unknown"),
	disasterDeclarationTypeAndEffect: zeroText("disaster_declaration_type_and_effect"),
	disasterDeclarationDate: timestamp("disaster_declaration_date"),
	hadOfficialWarningOrWeatherAdvisory: zeroBool("had_official_warning_or_weather_advisory"),
	officialWarningAffectedAreas: zeroText("official_warning_affected_areas"),
	earlyAction: zeroText("early_action"),
	earlyActionDate: timestamp("early_action_date"),
	preliminaryAssessmentDate: timestamp("preliminary_assesment_date"),
	rapidAssessmentDate: timestamp("rapid_assesment_date"),
	responseOperations: zeroText("response_oprations"),
	postDisasterAssementDate: timestamp("post_disaster_assessment_date"),
	reAssessmentDate: timestamp("re_assessment_date"),
	dataSource: zeroText("data_source"),
	recordingInstitution: zeroText("recording_institution"),
	effectsTotalUsd: ourMoney("effects_total_usd"),
	nonEconomicLosses: zeroText("non_economic_losses"),
	damagesSubtotalLocalCurrency: ourMoney("damages_subtotal_local_currency"),
	lossesSubtotalUSD: ourMoney("losses_subtotal_usd"),
	responseOperationsDescription: zeroText("response_operations_description"),
	responseOperationsCostsLocalCurrency: ourMoney("response_operations_costs_local_currency"),
	responseCostTotalLocalCurrency: ourMoney("response_cost_total_local_currency"),
	responseCostTotalUSD: ourMoney("response_cost_total_usd"),
	humanitarianNeedsDescription: zeroText("humanitarian_needs_description"),
	humanitarianNeedsLocalCurrency: ourMoney("humanitarian_needs_local_currency"),
	humanitarianNeedsUSD: ourMoney("humanitarian_needs_usd"),
	rehabilitationCostsLocalCurrency: ourMoney("rehabilitation_costs_local_currency"),
	rehabilitationCostsUSD: ourMoney("rehabilitation_costs_usd"),

	repairCostsLocalCurrency: ourMoney("repair_costs_local_currency"),
	repairCostsUSD: ourMoney("repair_costs_usd"),

	replacementCostsLocalCurrency: ourMoney("replacement_costs_local_currency"),
	replacementCostsUSD: ourMoney("replacement_costs_usd"),

	recoveryNeedsLocalCurrency: ourMoney("recovery_needs_local_currency"),
	recoveryNeedsUSD: ourMoney("recovery_needs_usd"),

	attachments: jsonb("attachments"),
	spatialFootprint: jsonb("spatial_footprint"),
});

export type DisasterEvent = typeof disasterEventTable.$inferSelect;
export type DisasterEventInsert = typeof disasterEventTable.$inferInsert;

export const disasterEventTableConstraits = {
	hazardousEventId: "disaster_event_hazardous_event_id_hazardous_event_id_fk",
};

export const disasterEventRel = relations(disasterEventTable, ({one}) => ({
	event: one(eventTable, {
		fields: [disasterEventTable.id],
		references: [eventTable.id],
	}),
	hazardousEvent: one(hazardousEventTable, {
		fields: [disasterEventTable.hazardousEventId],
		references: [hazardousEventTable.id],
	}),
}));

// Common disaggregation data (dsg) for human effects on disaster records
export const humanDsgTable = pgTable("human_dsg", {
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sex: text("sex", {
		enum: [
			"m",
			"f",
			"o"
		]
	}),
	age: text("age", {
		enum: [
			"0-14",
			"15-64",
			"65+",
		]
	}),
	disability: text("disability", {
		enum: [
			"none",
			"physical_dwarfism",
			"physical_problems_in_body_functioning",
			"physical_problems_in_body_structures",
			"physical_other_physical_disability",
			"sensorial_visual_impairments_blindness",
			"sensorial_visual_impairments_partial_sight_loss",
			"sensorial_visual_impairments_colour_blindness",
			"sensorial_hearing_impairments_deafness_hard_of_hearing",
			"sensorial_hearing_impairments_deafness_other_hearing_disability",
			"sensorial_other_sensory_impairments",
			"psychosocial",
			"intellectual_cognitive",
			"multiple_deaf_blindness",
			"multiple_other_multiple",
			"others"
		],
	}),
	globalPovertyLine: text("global_poverty_line", {enum: ["below", "above"]}),
	nationalPovertyLine: text("national_poverty_line", {
		enum: ["below", "above"],
	}),
	custom: jsonb("custom").$type<Record<string, any>>(),
});

export type HumanDsg = typeof humanDsgTable.$inferSelect;
export type HumanDsgInsert = typeof humanDsgTable.$inferInsert;

export const humanDsgConfigTable = pgTable("human_dsg_config", {
	hidden: jsonb("hidden").$type<HumanEffectsHidden>(),
	custom: jsonb("custom").$type<HumanEffectsCustomConfig>(),
});
export type HumanDsgConfig = typeof humanDsgConfigTable.$inferSelect;
export type HumanDsgConfigInsert = typeof humanDsgConfigTable.$inferInsert;

export const humanCategoryPresenceTable = pgTable("human_category_presence", {
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	deaths: boolean("deaths"),
	injured: boolean("injured"),
	missing: boolean("missing"),
	affectedDirect: boolean("affected_direct"),
	affectedIndirect: boolean("affected_indirect"),
	displacedShort: boolean("displaced_short"),
	displacedMediumShort: boolean("displaced_medium_short"),
	displacedMediumLong: boolean("displaced_medium_long"),
	displacedLong: boolean("displaced_long"),
	displacedPermanent: boolean("displaced_permanent"),
	displacementStocksPreemptive: boolean("displacement_stocks_preemptive"),
	displacementStocksReactive: boolean("displacement_stocks_reactive"),
});

export type HumanCategoryPresence = typeof humanDsgConfigTable.$inferSelect;
export type HumanCategoryPresenceInsert =
	typeof humanDsgConfigTable.$inferInsert;

export const deathsTable = pgTable("deaths", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	deaths: integer("deaths"),
});

export type Deaths = typeof deathsTable.$inferSelect;
export type DeathsInsert = typeof deathsTable.$inferInsert;

export const injuredTable = pgTable("injured", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	injured: integer("injured"),
});

export type Injured = typeof injuredTable.$inferSelect;
export type InjuredInsert = typeof injuredTable.$inferInsert;

export const missingTable = pgTable("missing", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	asOf: timestamp("as_of"),
	missing: integer("missing"),
});

export type Missing = typeof missingTable.$inferSelect;
export type MissingInsert = typeof missingTable.$inferInsert;

export const affectedTable = pgTable("affected", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	direct: integer("direct"),
	indirect: integer("indirect"),
});
export type Affected = typeof affectedTable.$inferSelect;
export type AffectedInsert = typeof affectedTable.$inferInsert;

export const displacedTable = pgTable("displaced", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	short: integer("short"), // First 10 days
	mediumShort: integer("medium_short"), // Days 10-30
	mediumLong: integer("medium_long"), // Days 30-90
	long: integer("long"), // More than 90 days
	permanent: integer("permanent"), // Permanently relocated
});
export type Displaced = typeof displacedTable.$inferSelect;
export type DisplacedInsert = typeof displacedTable.$inferInsert;

export const displacementStocksTable = pgTable("displacement_stocks", {
	id: uuid("id").primaryKey().defaultRandom(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	preemptive: integer("preemptive"), // Assisted pre-emptive displacement
	reactive: integer("reactive"), // Assisted reactive displacement
});
export type DisplacementStocks = typeof displacementStocksTable.$inferSelect;
export type DisplacementStocksInsert =
	typeof displacementStocksTable.$inferInsert;

export const disruptionTable = pgTable("disruption", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: ourBigint("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	durationDays: ourBigint("duration_days"),
	durationHours: ourBigint("duration_hours"),
	usersAffected: ourBigint("users_affected"),
	peopleAffected: ourBigint("people_affected"),
	comment: text("comment"),
	responseOperation: text("response_operation"),
	responseCost: ourMoney("response_cost"),
	responseCurrency: text("response_currency"),
	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
})

export type Disruption = typeof disruptionTable.$inferSelect
export type DisruptionInsert = typeof disruptionTable.$inferInsert

export const damagesTable = pgTable("damages", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: ourBigint("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	assetId: uuid("asset_id")
		.references((): AnyPgColumn => assetTable.id)
		.notNull(),

	unit: unitsEnum("unit"),

	totalDamageAmount: ourBigint("total_damage_amount"),
	totalDamageAmountOverride: zeroBool("total_damage_amount_override"),
	totalRepairReplacementRecovery: ourMoney("total_repair_replacement_recovery"),
	totalRepairReplacementRecoveryOverride: zeroBool("total_repair_replacement_recovery_override"),

	// Partially damaged
	pdDamageAmount: ourBigint("pd_damage_amount"),
	pdRepairCostUnit: ourMoney("pd_repair_cost_unit"),
	pdRepairCostUnitCurrency: text("pd_repair_cost_unit_currency"),
	pdRepairUnits: ourBigint("pd_repair_units"),
	pdRepairCostTotal: ourMoney("pd_repair_cost_total"),
	pdRepairCostTotalOverride: zeroBool("pd_repair_cost_total_override"),
	pdRecoveryCostUnit: ourMoney("pd_recovery_cost_unit"),
	pdRecoveryCostUnitCurrency: text("pd_recovery_cost_unit_currency"),
	pdRecoveryUnits: ourBigint("pd_recovery_units"),
	pdRecoveryCostTotal: ourMoney("pd_recovery_cost_total"),
	pdRecoveryCostTotalOverride: zeroBool("pd_recovery_cost_total_override"),
	pdDisruptionDurationDays: ourBigint("pd_disruption_duration_days"),
	pdDisruptionDurationHours: ourBigint("pd_disruption_duration_hours"),
	pdDisruptionUsersAffected: ourBigint("pd_disruption_users_affected"),
	pdDisruptionPeopleAffected: ourBigint("pd_disruption_people_affected"),
	pdDisruptionDescription: text("pd_disruption_description"),

	// Totally destroyed
	tdDamageAmount: ourBigint("td_damage_amount"),
	tdReplacementCostUnit: ourMoney("td_replacement_cost_unit"),
	tdReplacementCostUnitCurrency: text("td_replacement_cost_unit_currency"),
	tdReplacementUnits: ourBigint("td_replacement_units"),
	tdReplacementCostTotal: ourMoney("td_replacement_cost_total"),
	tdReplacementCostTotalOverride: zeroBool("td_replacement_cost_total_override"),
	tdRecoveryCostUnit: ourMoney("td_recovery_cost_unit"),
	tdRecoveryCostUnitCurrency: text("td_recovery_cost_unit_currency"),
	tdRecoveryUnits: ourBigint("td_recovery_units"),
	tdRecoveryCostTotal: ourMoney("td_recovery_cost_total"),
	tdRecoveryCostTotalOverride: zeroBool("td_recovery_cost_total_override"),
	tdDisruptionDurationDays: ourBigint("td_disruption_duration_days"),
	tdDisruptionDurationHours: ourBigint("td_disruption_duration_hours"),
	tdDisruptionUsersAffected: ourBigint("td_disruption_users_affected"),
	tdDisruptionPeopleAffected: ourBigint("td_disruption_people_affected"),
	tdDisruptionDescription: text("td_disruption_description"),

	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
})

export const damagesRel = relations(damagesTable, ({one}) => ({
	asset: one(assetTable, {
		fields: [damagesTable.assetId],
		references: [assetTable.id],
	})
}));

export type Damages = typeof damagesTable.$inferSelect
export type DamagesInsert = typeof damagesTable.$inferInsert

export const measureTable = pgTable("measure", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	type: text({enum: ["number", "area", "volume", "duration"]})
		.notNull()
		.default("area"),
	//	unit: text("unit").notNull()
})

export type Measure = typeof measureTable.$inferSelect
export type MeasureInsert = typeof measureTable.$inferInsert

export const unitTable = pgTable("unit", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	type: text({enum: ["number", "area", "volume", "duration"]})
		.notNull()
		.default("area"),
	name: text("name").notNull()
})

export type Unit = typeof unitTable.$inferSelect
export type UnitInsert = typeof unitTable.$inferInsert

export const assetTable = pgTable("asset", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	//sectorId: ourBigint("sector_id")
	//	.references((): AnyPgColumn => sectorTable.id)
	//	.notNull(),
	sectorIds: text("sector_ids").notNull(),
	//	sectorIds: ourBigint("sector_ids")
	//	.array()
	//	.notNull()
	//  .$type<number[]>(),
	// measureId: uuid("measure_id")
	// 	.references((): AnyPgColumn => measureTable.id)
	// 	.notNull(),
	isBuiltIn: boolean("is_built_in").notNull(),
	name: text("name").notNull(),
	category: text("category"),
	nationalId: text("national_id"),
	notes: text("notes"),
});

/*
export const assetRel = relations(assetTable, ({one}) => ({
	// measure: one(measureTable, {
	// 	fields: [assetTable.measureId],
	// 	references: [measureTable.id],
	// }),
//	sector: one(sectorTable, {
	//	fields: [assetTable.sectorId],
		//references: [sectorTable.id],
	//}),
}));
*/

export type Asset = typeof assetTable.$inferSelect;
export type AssetInsert = typeof assetTable.$inferInsert;

export const lossesTable = pgTable("losses", {
	...apiImportIdField(),
	id: uuid("id").primaryKey().defaultRandom(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: ourBigint("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	sectorIsAgriculture: boolean("sector_is_agriculture").notNull(),
	type: text("type", {
		enum: ["increased_expenditure", "loss_revenue_forecasted", "non_economic_losses"]
	}).notNull(),
	relatedToNotAgriculture: text("related_to_not_agriculture", {
		enum: [
			"infrastructure_equipment",
			"production_delivery_access",
			"governance",
			"risk_vulnerability_drr",
			"other"
		]
	}),
	relatedToAgriculture: text("related_to_agriculture", {
		enum: [
			"value1",
			"value2",
		]
	}),
	description: text("description"),
	publicUnit: unitsEnum("public_value_unit"),
	publicUnits: ourBigint("public_units"),
	publicCostUnit: ourMoney("public_cost_unit"),
	publicCostUnitCurrency: text("public_cost_unit_currency"),
	publicCostTotal: ourMoney("public_cost_total"),
	publicCostTotalOverride: zeroBool("public_cost_total_override"),
	//publicTotalCostCurrency: text("public_total_cost_currency"),
	privateUnit: unitsEnum("private_value_unit"),
	privateUnits: ourBigint("private_units"),
	privateCostUnit: ourMoney("private_cost_unit"),
	privateCostUnitCurrency: text("private_cost_unit_currency"),
	privateCostTotal: ourMoney("private_cost_total"),
	privateCostTotalOverride: zeroBool("private_cost_total_override"),
	//privateTotalCostCurrency: text("private_total_cost_currency")
	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
})

export type Losses = typeof lossesTable.$inferSelect
export type LossesInsert = typeof lossesTable.$inferInsert

// Hazard Information Profiles (HIPs)
// https://www.preventionweb.net/publication/hazard-information-profiles-hips

// examples:
// Meteorological and Hydrological
// Extraterrestrial
// Geohazards
export const hipClassTable = pgTable(
	"hip_class",
	{
		id: text("id").primaryKey(),
		nameEn: zeroText("name_en"),
	},
	(table) => [check("name_en_not_empty", sql`${table.nameEn} <> ''`)]
);

// examples:
// Flood
// Temperature-Related
export const hipClusterTable = pgTable(
	"hip_cluster",
	{
		id: text("id").primaryKey(),
		classId: text("class_id")
			.references((): AnyPgColumn => hipClassTable.id)
			.notNull(),
		nameEn: zeroText("name_en"),
	},
	(table) => [check("name_en_not_empty", sql`${table.nameEn} <> ''`)]
);

export const hipClusterRel = relations(hipClusterTable, ({one}) => ({
	class: one(hipClassTable, {
		fields: [hipClusterTable.classId],
		references: [hipClassTable.id],
	}),
}));

// examples:
// MH0004,Flood,Coastal Flood
// GH0001,Seismogenic (Earthquakes),Earthquake
export const hipHazardTable = pgTable(
	"hip_hazard",
	{
		id: text("id").primaryKey(),
		code: zeroText("code"),
		clusterId: text("cluster_id")
			.references((): AnyPgColumn => hipClusterTable.id)
			.notNull(),
		nameEn: zeroText("name_en"),
		descriptionEn: zeroText("description_en"),
	},
	(table) => [
		check("name_en_not_empty", sql`${table.nameEn} <> ''`),
		check("description_en_not_empty", sql`${table.descriptionEn} <> ''`),
	]
);

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
	attachments: jsonb("attachments"),
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
	resourceRepoId: uuid("resource_repo_id")
		.references((): AnyPgColumn => resourceRepoTable.id)
		.notNull(),
	type: text({enum: ["document", "other"]})
		.notNull()
		.default("document"),
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

/**
 * Pending final design confirmation from @sindicatoesp, this table's structure, especially its sector linkage,
 * may be revised to align with new requirements and ensure data integrity.
 */
export type disasterRecords = typeof disasterRecordsTable.$inferSelect;
export type disasterRecordsInsert = typeof disasterRecordsTable.$inferInsert;

export const disasterRecordsTable = pgTable("disaster_records", {
	id: uuid("id").primaryKey().defaultRandom(),
	disasterEventId: uuid("disaster_event_id")
		.references((): AnyPgColumn => disasterEventTable.id),
	locationDesc: text("location_desc"),
	startDate: text("start_date"),
	endDate: text("end_date"),
	localWarnInst: text("local_warn_inst"),
	primaryDataSource: text("primary_data_source"),
	otherDataSource: text("other_data_source"),
	fieldAssessDate: timestamp("field_assess_date"),
	assessmentModes: text("assessment_modes"),
	originatorRecorderInst: text("originator_recorder_inst")
		.notNull()
		.default(""),
	validatedBy: text("validated_by")
		.notNull()
		.default(""),
	checkedBy: text("checked_by"),
	dataCollector: text("data_collector"),
	sectorId: ourBigint("sector_id") // Link to the sector involved
		.references((): AnyPgColumn => sectorTable.id),
	sectorName: text("sector_name"), // Direct name of the sector involved
	subSector: text("sub_sector"), // Sub-sector detail
	spatialFootprint: jsonb("spatial_footprint"),
	...approvalFields,
	...createdUpdatedTimestamps,
});

export const disasterRecordsRel = relations(
	disasterRecordsTable,
	({one, many}) => ({
		//Relationship: Links each disaster record to a disaster event
		disasterEvent: one(disasterEventTable, {
			fields: [disasterRecordsTable.disasterEventId],
			references: [disasterEventTable.id],
		}),

		//Relationship: Links disaster record to a sector (optional)
		sector: one(sectorTable, {
			fields: [disasterRecordsTable.sectorId],
			references: [sectorTable.id],
		}),
		// Relationship: Enhances query efficiency by directly incorporating sector names
		// without the need for joining tables during retrieval
		relatedSectors: many(sectorDisasterRecordsRelationTable, {
			relationName: "sector_disaster_records_relation",
		}),
	})
);

// Table to log all audit actions across the system
export const auditLogsTable = pgTable("audit_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	tableName: text("table_name").notNull(),
	recordId: text("record_id").notNull(),
	userId: ourBigint("user_id")
		.notNull()
		.references(() => userTable.id, {onDelete: "cascade"}),
	action: text("action").notNull(), // INSERT, UPDATE, DELETE
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	timestamp: timestamp("timestamp", {withTimezone: true})
		.defaultNow()
		.notNull(),
});

export type categoriesType = typeof categoriesTable.$inferSelect;

// Table for generic classification categories
export const categoriesTable = pgTable("categories", {
	id: ourSerial("id").primaryKey(), // Unique identifier for each category
	name: text("name").notNull(), // Title or description of the category
	parentId: ourBigint("parent_id").references(
		(): AnyPgColumn => categoriesTable.id
	), // Foreign key referencing another category's ID; null if it's a root category
	level: ourBigint("level").notNull().default(1),
	...createdUpdatedTimestamps,
});

export const categoryCategoryParent_Rel = relations(categoriesTable, ({one}) => ({
	categoryParent: one(categoriesTable, {fields: [categoriesTable.parentId], references: [categoriesTable.id]}),
}));

export type nonecoLosses = typeof nonecoLossesTable.$inferSelect;
export type nonecoLossesInsert = typeof nonecoLossesTable.$inferInsert;

// Table for Non-economic losses
export const nonecoLossesTable = pgTable(
	"noneco_losses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		disasterRecordId: uuid("disaster_record_id")
			.references((): AnyPgColumn => disasterRecordsTable.id)
			.notNull(),
		categortyId: ourBigint("category_id")
			.references((): AnyPgColumn => categoriesTable.id)
			.notNull(),
		description: text("description").notNull(),
		...createdUpdatedTimestamps,
	},
	(table) => {
		return [
			unique("nonecolosses_sectorIdx").on(table.disasterRecordId, table.categortyId),
		];
	}
);

export const nonecoLossesCategory_Rel = relations(nonecoLossesTable, ({one}) => ({
	category: one(categoriesTable, {fields: [nonecoLossesTable.categortyId], references: [categoriesTable.id]}),
}));

/**
 * This sector table is configured to support hierarchical relationships and sector-specific details.
 * Changes may occur based on further project requirements.
 */

// examples:
// id: 39,
// parent_id: 19,
// sectorname": Agriculture,
// subsector: Crops
// description: The cultivation and harvesting of plants for food, fiber, and other products.
export const sectorTable = pgTable(
	"sector",
	{
		id: ourSerial("id").primaryKey(), // Unique sector ID
		parentId: ourBigint("parent_id").references(
			(): AnyPgColumn => sectorTable.id
		), // Reference to parent sector
		sectorname: text("sectorname").notNull(), // High-level category | Descriptive name of the sector
		description: text("description"), // Optional description for the sector | Additional details about the sector
		// pdnaGrouping: text("pdna_grouping"), // PDNA grouping: Social, Infrastructure, Productive, or Cross-cutting
		level: ourBigint("level").notNull().default(1),	// value is parent level + 1 otherwise 1
		...createdUpdatedTimestamps,
	},
	// (table) => [
	// 	// // Constraint: subsector cannot be empty
	// 	// check("subsector_not_empty", sql`${table.subsector} <> ''`),
	// 	// // Ensure the PDNA grouping is one of the specified categories
	// 	// check(
	// 	// 	"pdna_grouping_valid",
	// 	// 	sql`${table.pdnaGrouping} IN ('Cross-cutting Sectors ', 'Infrastructure Sectors', 'Productive Sectors', 'Social Sectors')`
	// 	// ),
	// ]
);

export const sectoryParent_Rel = relations(sectorTable, ({one}) => ({
	sectorParent: one(sectorTable, {fields: [sectorTable.parentId], references: [sectorTable.id]}),
}));

/** [SectorDisasterRecordsRelation] table links `sector` to `disaster_records` */
export const sectorDisasterRecordsRelationTable = pgTable(
	"sector_disaster_records_relation",
	{
		id: uuid("id").primaryKey().defaultRandom(), // Unique ID for the relation
		sectorId: ourBigint("sector_id")
			.notNull()
			.references((): AnyPgColumn => sectorTable.id),
		disasterRecordId: uuid("disaster_record_id")
			.notNull()
			.references((): AnyPgColumn => disasterRecordsTable.id),
		withDamage: boolean("with_damage"),
		damageCost: ourMoney("damage_cost"),
		damageCostCurrency: text("damage_cost_currency"),
		damageRecoveryCost: ourMoney("damage_recovery_cost"),
		damageRecoveryCostCurrency: text("damage_recovery_cost_currency"),
		withDisruption: boolean("with_disruption"),
		withLosses: boolean("with_losses"),
		lossesCost: ourMoney("losses_cost"),
		lossesCostCurrency: text("losses_cost_currency"),
	},
	(table) => {
		return [
			unique("disRecSectorsUniqueIdx").on(table.disasterRecordId, table.sectorId),
			index("sector_disaster_records_relation_sector_id_idx").on(table.sectorId),
			index("sector_disaster_records_relation_disaster_record_id_idx").on(
				table.disasterRecordId
			),
		];
	}
);

/** Relationships for `sectorTable` */
export const sectorRel = relations(sectorTable, ({one, many}) => ({
	// A self-referencing relationship for hierarchical sectors
	parentSector: one(sectorTable, {
		fields: [sectorTable.parentId],
		references: [sectorTable.id],
	}),

	// Linking `sector` to `sector_disaster_records_relation`
	relatedDisasterRecords: many(sectorDisasterRecordsRelationTable, {
		relationName: "sector_disaster_records_relation",
	}),
}));

/** Relationships for `sectorDisasterRecordsRelationTable` */
export const sectorDisasterRecordsRel = relations(
	sectorDisasterRecordsRelationTable,
	({one}) => ({
		// Linking each `sector_disaster_records_relation` to a sector
		sector: one(sectorTable, {
			fields: [sectorDisasterRecordsRelationTable.sectorId],
			references: [sectorTable.id],
		}),

		// Linking each `sector_disaster_records_relation` to a disaster record
		disasterRecord: one(disasterRecordsTable, {
			fields: [sectorDisasterRecordsRelationTable.disasterRecordId],
			references: [disasterRecordsTable.id],
		}),
	})
);

// Types for TypeScript
export type Sector = typeof sectorTable.$inferSelect;
export type SectorInsert = typeof sectorTable.$inferInsert;

export type SectorDisasterRecordsRelation =
	typeof sectorDisasterRecordsRelationTable.$inferSelect;
export type SectorDisasterRecordsRelationInsert =
	typeof sectorDisasterRecordsRelationTable.$inferInsert;
