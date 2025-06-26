import { eq } from "drizzle-orm";
import { instanceSystemSettings } from "~/drizzle/schema";
import { dr } from "~/db.server";

// Define the shape of the settings data
export interface InstanceSystemSettings {
	id: string;
	footerUrlPrivacyPolicy: string | null;
	footerUrlTermsConditions: string | null;
	adminSetupComplete: boolean;
	websiteLogo:string;
	websiteName: string;
	websiteUrl: string;
	approvedRecordsArePublic: boolean;
	totpIssuer: string ;
	dtsInstanceType: string;
	dtsInstanceCtryIso3:  string;
	currencyCodes: string;
	countryName: string;
}

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
