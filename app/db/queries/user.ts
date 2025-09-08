import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { SelectUser, userTable } from "../../drizzle/schema";

export async function getUserById(id: string): Promise<SelectUser | null> {
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.id, id))
		.execute();
	return result[0] || null;
}

export async function getUserByEmail<T extends SelectUser = SelectUser>(
	email: string
): Promise<SelectUser | null> {
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.email, email))
		.limit(1)
		.execute();
	return (result[0] as T) ?? null;
}

export async function createUser(email: string, tx?: Tx) {
	const db = tx || dr;
	const result = await db
		.insert(userTable)
		.values({
			email: email,
		})
		.returning()
		.execute();
	return result[0];
}

export async function updateUserInviteCodeAndInviteExpirationByUserId(
	userId: string,
	inviteCode: string,
	expirationTime: Date,
	tx?: Tx
) {
	const db = tx || dr;
	await db
		.update(userTable)
		.set({
			inviteSentAt: new Date(),
			inviteCode: inviteCode,
			inviteExpiresAt: expirationTime,
		})
		.where(eq(userTable.id, userId));
}
