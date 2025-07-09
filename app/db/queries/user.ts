import { and, eq } from "drizzle-orm";
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

export async function createUser(
	email: string,
	role: string,
	isPrimaryAdmin: boolean,
	countryAccountId: string,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.insert(userTable)
		.values({
			email: email,
			role: role,
			isPrimaryAdmin: isPrimaryAdmin,
			countryAccountsId: countryAccountId,
		})
		.returning()
		.execute();
	return result[0];
}

export async function doesUserExistByEmailAndCountry(
	email: string,
	countryAccountsId: string,
	tx?: Tx
): Promise<boolean> {
	const db = tx || dr;
	const result = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(
			and(
				eq(userTable.email, email),
				eq(userTable.countryAccountsId, countryAccountsId)
			)
		)
		.limit(1);

	return result.length > 0;
}
