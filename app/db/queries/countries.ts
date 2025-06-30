import { dr } from "~/db.server";
import { countries, Country } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getCountries() {
	return dr.select().from(countries).execute();
}

export async function getCountryById(id: string): Promise<Country | null> {
	const result = await dr
		.select()
		.from(countries)
		.where(eq(countries.id, id))
		.execute();
	return result[0] || null;
}
