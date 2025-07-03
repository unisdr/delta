import { eq } from "drizzle-orm";
import {
	InstanceSystemSettings,
	instanceSystemSettings,
} from "~/drizzle/schema";
import { dr, Tx } from "~/db.server";

// Get the system settings (expects a single record)
export async function getInstanceSystemSettings(): Promise<InstanceSystemSettings | null> {
	const result = await dr.select().from(instanceSystemSettings).limit(1);
	return result[0] || null;
}

// Check if admin setup is complete
export async function isAdminSetupComplete(): Promise<boolean> {
	const settings = await getInstanceSystemSettings();
	return settings?.adminSetupComplete ?? false;
}

// Update only the footerUrlPrivacyPolicy
export async function updateFooterUrlPrivacyPolicy(
	footerUrlPrivacyPolicy: string | null
): Promise<InstanceSystemSettings> {
	const existing = await getInstanceSystemSettings();

	if (!existing) {
		throw new Error("No system settings record found to update");
	}

	const [updated] = await dr
		.update(instanceSystemSettings)
		.set({ footerUrlPrivacyPolicy })
		.where(eq(instanceSystemSettings.id, existing.id))
		.returning();

	return updated;
}

// Update only the footerUrlPrivacyPolicy
export async function updateFooterUrlTermsConditions(
	footerUrlTermsConditions: string | null
): Promise<InstanceSystemSettings> {
	const existing = await getInstanceSystemSettings();

	if (!existing) {
		throw new Error("No system settings record found to update");
	}

	const [updated] = await dr
		.update(instanceSystemSettings)
		.set({ footerUrlTermsConditions: footerUrlTermsConditions })
		.where(eq(instanceSystemSettings.id, existing.id))
		.returning();

	return updated;
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
