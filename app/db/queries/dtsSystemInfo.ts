import { dtsSystemInfo, SelectDtsSystemInfo } from "~/drizzle/schema";
import { dr } from "~/db.server";

export async function getSystemInfo(): Promise<SelectDtsSystemInfo | null> {
	const result = await dr.select().from(dtsSystemInfo).limit(1);
	return result[0] || null;
}
