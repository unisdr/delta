import { countryAccounts, userTable } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

export async function getCountryAccountsWithCountryAndPrimaryAdminUser() {
	return dr.query.countryAccounts.findMany({
		with: {
			country: true,
			users: {
				where: eq(userTable.isPrimaryAdmin, true),
				limit: 1,
			},
		},
		columns: {
			id: true,
			status: true,
			type: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: (countryAccounts, { desc }) => [desc(countryAccounts.createdAt)],
	});
}
export type CountryAccountWithCountryAndPrimaryAdminUser = Awaited<
	ReturnType<typeof getCountryAccountsWithCountryAndPrimaryAdminUser>
>[number];

export async function getCountryAccountById(id: string) {
	const result = await dr.query.countryAccounts.findFirst({
		where: (account, { eq }) => eq(account.id, id),
		with: {
			country: true,
		},
		columns: {
			id: true,
			status: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return result;
}

export async function countryAccountWithTypeExists(
	countryId: string,
	type: string
): Promise<boolean> {
	const result = await dr
		.select()
		.from(countryAccounts)
		.where(
			and(
				eq(countryAccounts.countryId, countryId),
				eq(countryAccounts.type, type)
			)
		)
		.limit(1)
		.execute();

	return result.length > 0;
}

export async function createCountryAccount(
	countryId: string,
	status: number,
	type: string,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.insert(countryAccounts)
		.values({ countryId, status, type })
		.returning()
		.execute();
	return result[0];
}

export async function updateCountryAccountStatus(
	id: string,
	status: number,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.update(countryAccounts)
		.set({ status, updatedAt: new Date() })
		.where(eq(countryAccounts.id, id))
		.returning()
		.execute();
	return result[0] || null;
}

