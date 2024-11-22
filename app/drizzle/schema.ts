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
	AnyPgColumn
} from "drizzle-orm/pg-core";

import {
	sql,
	relations
} from "drizzle-orm";

function zeroTimestamp(name: string){
	return timestamp(name).notNull().default(sql`'2000-01-01T00:00:00.000Z'`)
}
function zeroText(name: string){
	return text(name).notNull().default("")
}
function zeroBool(name: string){
	return boolean(name).notNull().default(false)
}

function zeroStrMap(name: string){
	return jsonb(name).$type<Record<string, string>>().default({}).notNull()
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

export const sessionsRelations = relations(sessionTable, ({ one }) => ({
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
