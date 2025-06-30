import { dtsSystemInfo } from "~/drizzle/schema";
import { dr } from "~/db.server";

export interface SystemInfo {
	id: string;
	dbVersionNo: string;
	appVersionNo: string;
	installedAt: Date;
}

export async function getSystemInfo(): Promise<SystemInfo | null> {
	const result = await dr.select().from(dtsSystemInfo).limit(1);
	return result[0] || null;
}
