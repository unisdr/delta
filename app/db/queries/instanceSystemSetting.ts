import { eq } from "drizzle-orm";
import {
	InstanceSystemSettings,
	instanceSystemSettings,
} from "~/drizzle/schema";
import { dr, Tx } from "~/db.server";

export async function getInstanceSystemSettingsByCountryAccountId(
	countryAccountId: string | null,
	tx?: Tx
): Promise<InstanceSystemSettings | null> {
	if (!countryAccountId) {
		return null;
	}
	const db = tx || dr;
	const result = await db
		.select()
		.from(instanceSystemSettings)
		.where(eq(instanceSystemSettings.countryAccountsId, countryAccountId));
	return result[0] || null;
}

export async function createInstanceSystemSetting(
	countryName: string,
	countryIso3: string,
	countryAccountId: string,
	tx?: Tx
): Promise<InstanceSystemSettings> {
	const db = tx || dr;
	const result = await db
		.insert(instanceSystemSettings)
		.values({
			countryName: countryName,
			dtsInstanceCtryIso3: countryIso3,
			countryAccountsId: countryAccountId,
		})
		.returning()
		.execute();
	return result[0];
}
