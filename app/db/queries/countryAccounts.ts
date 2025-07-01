import { countryAccounts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { dr } from "~/db.server";

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 0;

export async function getCountryAccounts() {
	return dr.query.countryAccounts.findMany({
		with: {
			country: true,
		},
		columns: {
			id: true,
			status: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: (countryAccounts, { desc }) => [desc(countryAccounts.createdAt)],
	});
}
export type CountryAccountWithCountry = Awaited<
	ReturnType<typeof getCountryAccounts>
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

export async function createCountryAccount(countryId: string, status: number) {
	const result = await dr
		.insert(countryAccounts)
		.values({ countryId, status })
		.returning()
		.execute();
	return result[0];
}

export async function updateCountryAccount(
	id: string,
	countryId: string,
	status: number
) {
	const result = await dr
		.update(countryAccounts)
		.set({ countryId, status, updatedAt: new Date() })
		.where(eq(countryAccounts.id, id))
		.returning()
		.execute();
	return result[0] || null;
}

export async function activateCountryAccount(id: string) {
	const result = await dr
		.update(countryAccounts)
		.set({ status: ACTIVE_STATUS })
		.where(eq(countryAccounts.id, id))
		.returning()
		.execute();
	return result[0] || null;
}

export async function deactivateCountryAccount(id: string) {
	const result = await dr
		.update(countryAccounts)
		.set({ status: INACTIVE_STATUS })
		.where(eq(countryAccounts.id, id))
		.returning()
		.execute();
	return result[0] || null;
}
