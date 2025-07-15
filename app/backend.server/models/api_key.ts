import {dr, Tx} from "~/db.server";
import {apiKeyTable, ApiKey, ApiKeyWithUser} from "~/drizzle/schema";
import {eq} from "drizzle-orm";
import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form/form";
import {deleteByIdForStringId} from "./common";
import {randomBytes} from 'crypto';
import { getApiKeyBySecrectWithUser } from "~/db/queries/apiKey";

export interface ApiKeyFields extends Omit<ApiKey, "id"> {}

function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

export async function apiKeyCreate(tx: Tx, fields: ApiKeyFields): Promise<CreateResult<ApiKeyFields>> {
	const res = await tx.insert(apiKeyTable)
		.values({
			createdAt: new Date(),
			name: fields.name,
			managedByUserId: fields.managedByUserId,
			secret: generateSecret(),
		})
		.returning({id: apiKeyTable.id});

	return {ok: true, id: res[0].id};
}

export async function apiKeyUpdate(tx: Tx, idStr: string, fields: ApiKeyFields): Promise<UpdateResult<ApiKeyFields>> {
	const id = Number(idStr);
	await tx.update(apiKeyTable)
		.set({
			updatedAt: new Date(),
			name: fields.name,
		})
		.where(eq(apiKeyTable.id, id));

	return {ok: true};
}

export type ApiKeyViewModel = Exclude<Awaited<ReturnType<typeof apiKeyById>>,
	undefined
>;

export async function apiKeyById(idStr: string) {
	return apiKeyByIdTx(dr, idStr)
}

export async function apiKeyByIdTx(tx: Tx, idStr: string) {
	const id = Number(idStr);
	return await tx.query.apiKeyTable.findFirst({
		where: eq(apiKeyTable.id, id),
		with: {
			managedByUser: true
		}
	});
}


export async function apiKeyDelete(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, apiKeyTable);
	return {ok: true};
}

export async function apiAuth(request: Request): Promise<ApiKey> {
	const authToken = request.headers.get("X-Auth");

	if (!authToken) {
		throw new Response("Unauthorized", {status: 401});
	}

	const key = await dr.query.apiKeyTable.findFirst({
		where: eq(apiKeyTable.secret, authToken),
	});

	if (!key) {
		throw new Response("Unauthorized", {status: 401});
	}

	return key;
}

export async function apiAuth2(request: Request): Promise<ApiKeyWithUser> {
	const authToken = request.headers.get("X-Auth");

	if (!authToken) {
		throw new Response("X-auth is missing in header", {status: 401});
	}

	const key = await getApiKeyBySecrectWithUser(authToken);

	if (!key) {
		throw new Response("Unauthorized access", {status: 401});
	}

	return key;
}


