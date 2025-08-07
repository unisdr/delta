import { dr, Tx } from "~/db.server";
import { apiKeyTable, SelectApiKey, userTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";
import { CreateResult, DeleteResult, UpdateResult } from "~/backend.server/handlers/form/form";
import { deleteByIdForStringId } from "./common";
import { randomBytes } from 'crypto';
import { getApiKeyBySecrect } from "~/db/queries/apiKey";

export interface ApiKeyFields extends Omit<SelectApiKey, "id"> { }

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
			countryAccountsId: fields.countryAccountsId
		})
		.returning({ id: apiKeyTable.id });

	return { ok: true, id: res[0].id };
}

export async function apiKeyUpdate(tx: Tx, idStr: string, fields: ApiKeyFields): Promise<UpdateResult<ApiKeyFields>> {
	const id = Number(idStr);
	await tx.update(apiKeyTable)
		.set({
			updatedAt: new Date(),
			name: fields.name,
		})
		.where(eq(apiKeyTable.id, id));

	return { ok: true };
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
	return { ok: true };
}

export async function apiAuth(request: Request): Promise<SelectApiKey> {
	const authToken = request.headers.get("X-Auth");

	if (!authToken) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const key = await getApiKeyBySecrect(authToken);

	if (!key) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return key;
}

/**
 * User status validation service - Single Responsibility Principle
 * Centralized logic for determining user API access eligibility
 */
class UserStatusValidator {
	/**
	 * Validates if user should have API access based on existing schema fields
	 * @param userId - User ID to validate
	 * @returns Promise<boolean> - true if user is active for API access
	 */
	static async isUserActiveForApi(userId: number): Promise<boolean> {
		try {
			const user = await dr.query.userTable.findFirst({
				where: eq(userTable.id, userId)
			});

			if (!user) {
				return false;
			}

			return this.validateUserActiveStatus(user);
		} catch (error) {
			console.error(`Error validating user ${userId} status:`, error);
			return false; // Fail closed for security
		}
	}

	/**
	 * Internal validation logic - extracted for DRY principle
	 */
	private static validateUserActiveStatus(user: any): boolean {
		// User is active if email verified and not in pending/reset state
		const hasVerifiedEmail = user.emailVerified;
		const hasPendingInvite = user.inviteCode && user.inviteExpiresAt && user.inviteExpiresAt > new Date();
		const hasActivePasswordReset = user.resetPasswordToken && user.resetPasswordExpiresAt && user.resetPasswordExpiresAt > new Date();

		return hasVerifiedEmail && !hasPendingInvite && !hasActivePasswordReset;
	}

	/**
	 * Get detailed user status with reasons - for audit purposes
	 */
	static async getUserStatusDetails(user: any): Promise<{
		isActive: boolean;
		issues: string[];
	}> {
		const issues: string[] = [];

		if (!user) {
			issues.push("User not found");
			return { isActive: false, issues };
		}

		if (!user.emailVerified) issues.push("Email not verified");
		if (user.inviteCode && user.inviteExpiresAt && user.inviteExpiresAt > new Date()) {
			issues.push("Pending invite");
		}
		if (user.resetPasswordToken && user.resetPasswordExpiresAt && user.resetPasswordExpiresAt > new Date()) {
			issues.push("In password reset");
		}

		return {
			isActive: issues.length === 0,
			issues
		};
	}
}

/**
 * Enhanced API authentication with user validation - Open/Closed Principle
 * Extends existing auth without modifying original apiAuth function
 */
export async function apiAuthSecure(request: Request): Promise<SelectApiKey> {
	try {
		const authToken = request.headers.get("X-Auth");

		if (!authToken) {
			throw new Response("Unauthorized: Missing authentication token", { status: 401 });
		}

		// Get key with managing user info
		const key = await dr.query.apiKeyTable.findFirst({
			where: eq(apiKeyTable.secret, authToken),
			with: {
				managedByUser: true
			}
		});

		if (!key) {
			throw new Response("Unauthorized: Invalid token", { status: 401 });
		}

		if (!key.managedByUser) {
			console.error(`API key ${key.id} has no managing user`);
			throw new Response("Unauthorized: Token configuration error", { status: 401 });
		}

		// Validate managing user is active
		const userStatus = await UserStatusValidator.getUserStatusDetails(key.managedByUser);
		if (!userStatus.isActive) {
			console.warn(`API access blocked for key ${key.id}: managing user ${key.managedByUser.email} inactive - ${userStatus.issues.join(', ')}`);
			throw new Response("Unauthorized: Managing user account inactive", { status: 401 });
		}

		return key;

	} catch (error) {
		// Robust error handling - don't leak internal errors
		if (error instanceof Response) {
			throw error; // Re-throw HTTP responses as-is
		}

		console.error("API authentication error:", error);
		throw new Response("Unauthorized: Authentication failed", { status: 401 });
	}
}

/**
 * API Security Audit Service - Single Responsibility Principle
 * Provides comprehensive security analysis of API keys
 */
export class ApiSecurityAudit {
	/**
	 * Performs complete security audit of all API keys
	 * @returns Promise<SecurityAuditResult> - Detailed audit results
	 */
	static async auditApiKeysSecurity(): Promise<{
		total: number;
		active: number;
		withInactiveUsers: number;
		details: Array<{
			keyId: number;
			keyName: string;
			userEmail: string;
			issues: string[];
		}>;
	}> {
		try {
			const keys = await dr.query.apiKeyTable.findMany({
				with: {
					managedByUser: true
				}
			});

			const results = {
				total: keys.length,
				active: 0,
				withInactiveUsers: 0,
				details: [] as Array<{
					keyId: number;
					keyName: string;
					userEmail: string;
					issues: string[];
				}>
			};

			for (const key of keys) {
				const auditResult = await ApiSecurityAudit.auditSingleKey(key);

				if (auditResult.issues.length === 0) {
					results.active++;
				} else {
					results.withInactiveUsers++;
					results.details.push(auditResult);
				}
			}

			return results;

		} catch (error) {
			console.error("Security audit failed:", error);
			throw new Error("Failed to perform security audit");
		}
	}

	/**
	 * Audits a single API key - DRY principle
	 */
	static async auditSingleKey(key: any): Promise<{
		keyId: number;
		keyName: string;
		userEmail: string;
		issues: string[];
	}> {
		const user = key.managedByUser;
		let issues: string[] = [];
		let userEmail = 'DELETED_USER';

		if (!user) {
			issues.push("Managing user deleted");
		} else {
			userEmail = user.email;
			const userStatus = await UserStatusValidator.getUserStatusDetails(user);
			issues = userStatus.issues;
		}

		return {
			keyId: key.id,
			keyName: key.name || 'Unnamed',
			userEmail,
			issues
		};
	}

	/**
	 * Get API keys managed by specific user with status
	 */
	static async getUserManagedApiKeys(userId: number): Promise<Array<SelectApiKey & {
		userIsActive: boolean;
		issues: string[];
	}>> {
		try {
			const keys = await dr.query.apiKeyTable.findMany({
				where: eq(apiKeyTable.managedByUserId, userId),
				with: {
					managedByUser: true
				}
			});

			const userIsActive = await UserStatusValidator.isUserActiveForApi(userId);

			const results = [];
			for (const key of keys) {
				const user = key.managedByUser;
				const userStatus = user
					? await UserStatusValidator.getUserStatusDetails(user)
					: { isActive: false, issues: ["User not found"] };

				results.push({
					...key,
					userIsActive,
					issues: userStatus.issues
				});
			}

			return results;

		} catch (error) {
			console.error(`Error getting API keys for user ${userId}:`, error);
			return [];
		}
	}
}

/**
 * User Access Management Service - Single Responsibility Principle
 * Handles user API access lifecycle operations
 */
export class UserAccessManager {
	/**
	 * Revokes API access for a user using existing schema constraints
	 * @param tx - Database transaction
	 * @param userId - User ID to revoke access for  
	 * @param reason - Reason for revocation (for audit trail)
	 */
	static async revokeUserApiAccess(tx: Tx, userId: number, reason: string = "Manual revocation"): Promise<void> {
		try {
			await tx.update(userTable)
				.set({
					emailVerified: false,
					updatedAt: new Date()
				})
				.where(eq(userTable.id, userId));

			console.log(`API access revoked for user ${userId}: ${reason}`);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error(`Failed to revoke API access for user ${userId}:`, error);
			throw new Error(`Failed to revoke API access: ${errorMessage}`);
		}
	}

	/**
	 * Check if user can access API - Interface Segregation Principle
	 * Simple interface for external callers
	 */
	static async canUserAccessApi(userId: number): Promise<boolean> {
		return UserStatusValidator.isUserActiveForApi(userId);
	}
}

/**
 * Backward compatible API auth with monitoring - Open/Closed Principle
 * Adds security monitoring without breaking existing functionality
 */
export async function apiAuthWithMonitoring(request: Request): Promise<SelectApiKey> {
	try {
		// Use existing auth function - preserves all original functionality
		const key = await apiAuth(request);

		// Add non-blocking security monitoring
		const userIsActive = await UserStatusValidator.isUserActiveForApi(key.managedByUserId);
		if (!userIsActive) {
			console.warn(`⚠️ API key ${key.id} used by potentially inactive user ${key.managedByUserId} - review recommended`);
		}

		return key;

	} catch (error) {
		// Don't modify error handling of original function
		throw error;
	}
}

// Convenience exports for backward compatibility - Interface Segregation Principle
export const canUserAccessApi = UserAccessManager.canUserAccessApi;
export const revokeUserApiAccess = UserAccessManager.revokeUserApiAccess;
export const auditApiKeysSecurity = ApiSecurityAudit.auditApiKeysSecurity;
export const getUserManagedApiKeys = ApiSecurityAudit.getUserManagedApiKeys;