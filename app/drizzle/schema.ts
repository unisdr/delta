import {
	pgTable,
	integer,
	text,
	boolean,
	timestamp,
	uuid,
	serial
} from "drizzle-orm/pg-core";

import {
	sql,
	relations
} from "drizzle-orm";

function zeroTimestamp(){
	return timestamp().notNull().default(sql`'2000-01-01T00:00:00.000Z'`)
}
function zeroText(){
	return text().notNull().default("")
}
function zeroBool(){
	return boolean().notNull().default(false)
}

const timestamps = {
	updatedAt: timestamp(),
	createdAt: timestamp().notNull().defaultNow(),
	deletedAt: timestamp(),
}

export const sessionTable = pgTable("session", {
	...timestamps,
	id: uuid().primaryKey().defaultRandom(),
	userId: integer().notNull(),
	lastActiveAt: zeroTimestamp(),
	totpAuthed: zeroBool(),
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
	id: serial().primaryKey(),
	role: zeroText(),
	firstName: zeroText(),
	lastName: zeroText(),
	email: text().notNull().unique(),
	password: zeroText(),
	emailVerified: zeroBool(),
	emailVerificationCode: zeroText(),
	emailVerificationSentAt: timestamp(),
	emailVerificationExpiresAt: zeroTimestamp(),
	inviteCode: zeroText(),
	inviteSentAt: timestamp(),
	inviteExpiresAt: zeroTimestamp(),
	resetPasswordToken: zeroText(),
	resetPasswordExpiresAt: zeroTimestamp(),
	totpEnabled: zeroBool(),
	totpSecret: zeroText(),
	totpSecretUrl: zeroText(),
	organization: zeroText(),
	hydrometCheUser: zeroBool(),
	authType: text().notNull().default("form"),
});

export type User = typeof userTable.$inferSelect;
export type UserInsert = typeof userTable.$inferInsert;

export const commonPasswordsTable = pgTable("commonPasswords", {
	password: text().primaryKey(),
});

export type CommonPassword = typeof commonPasswordsTable.$inferSelect;
export type CommonPasswordInsert = typeof commonPasswordsTable.$inferInsert;

export const itemTable = pgTable("item", {
	...timestamps,
	id: serial().primaryKey(),
	field1: text().notNull(),
	field2: text(),
});

export type Item = typeof itemTable.$inferSelect;
export type ItemInsert = typeof itemTable.$inferInsert;

