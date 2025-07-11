import { eq } from "drizzle-orm";
import {
	InstanceSystemSettings,
	instanceSystemSettings,
	NewInstanceSystemSettings,
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
): Promise<NewInstanceSystemSettings> {
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

export async function updateInstanceSystemSetting(
	id: string | null,
	footerUrlPrivacyPolicy: string | null,
	footerUrlTermsConditions: string | null,
	websiteLogo: string,
	websiteName: string,
	approvedRecordsArePublic: boolean,
	totpIssuer: string,
	tx?: Tx
): Promise<InstanceSystemSettings | null> {
	if (!id) {
		return null;
	}
	const db = tx || dr;
	const result = await db
		.update(instanceSystemSettings)
		.set({
			footerUrlPrivacyPolicy,
			footerUrlTermsConditions,
			websiteLogo,
			websiteName,
			approvedRecordsArePublic,
			totpIssuer,
		})
		.where(eq(instanceSystemSettings.id, id))
		.returning()
		.execute();
	return result[0];
}
