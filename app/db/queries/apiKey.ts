import { eq } from "drizzle-orm";
import { dr } from "../../db.server";
import { apiKeyTable, ApiKeyWithUser } from "../../drizzle/schema";

export async function getApiKeyBySecrectWithUser(
	secret: string
): Promise<ApiKeyWithUser | null> {
	if (!secret?.trim()) return null;

	const key = await dr.query.apiKeyTable.findFirst({
		where: eq(apiKeyTable.secret, secret),
		with: { managedByUser: true },
	});

	if(!key || !key.managedByUser){
		return null;
	}

	return key as ApiKeyWithUser;
}
