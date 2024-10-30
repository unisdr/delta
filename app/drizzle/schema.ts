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

const timestamps = {
	updatedAt: timestamp(),
	createdAt: timestamp().notNull().defaultNow(),
	deletedAt: timestamp(),
}

export const sessionTable = pgTable("session", {
	...timestamps,
	id: uuid().primaryKey().defaultRandom(),
	userId: integer().notNull(),
	lastActiveAt: timestamp().notNull().default(sql`'1970-01-01T00:00:00.000Z'`),
	totpAuthed: boolean("totpAuthed").notNull().default(false),
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
	role: text().notNull().default(""),
	firstName: text().notNull(),
	lastName: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	emailVerified: boolean().default(false),
	emailVerificationCode: text().default(""),
	emailVerificationSentAt: timestamp(),
	emailVerificationExpiresAt: timestamp().notNull().default(sql`'1970-01-01T00:00:00.000Z'`),
	resetPasswordToken: text().default(""),
	resetPasswordExpiresAt: timestamp(),
	totpEnabled: boolean().default(false),
	totpSecret: text().notNull().default(""),
	totpSecretUrl: text().notNull().default(""),
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

