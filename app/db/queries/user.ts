import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { User, userTable } from "../../drizzle/schema";

export async function getUserById(id: number): Promise<User | null> {
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.id, id))
		.execute();
	return result[0] || null;
}

export async function getUserByEmail<T extends User = User>(
	email: string
): Promise<T | null> {
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.email, email))
		.limit(1)
		.execute();
	return (result[0] as T) ?? null;
}

export async function createPrimaryAdminUserForCountryAccounts(
	email: string,
	role: string,
    password: string,
    countryAccountId: string,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.insert(userTable)
		.values({
			email: email,
			role: role,
            password: password,
            countryAccountsId: countryAccountId,
            isPrimaryAdmin: true,
		})
		.returning()
		.execute();
	return result[0];
}
