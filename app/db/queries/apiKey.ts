import { eq } from "drizzle-orm";
import { dr } from "../../db.server";
import {
	apiKeyTable,
	SelectApiKey,
} from "../../drizzle/schema";

export async function getApiKeyBySecrect(
	secret: string
): Promise<SelectApiKey | null> {
	if (!secret?.trim()) return null;

	const key = await dr.query.apiKeyTable.findFirst({
		where: eq(apiKeyTable.secret, secret),
	});

	if (!key) {
		return null;
	}

	return key;
}
