import { dr, Tx } from "~/db.server";
import { apiKeyTable, SelectApiKey, userTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";
import { CreateResult, DeleteResult, UpdateResult } from "~/backend.server/handlers/form/form";
import { deleteByIdForStringId } from "./common";
import { randomBytes } from 'crypto';
import { getApiKeyBySecrect } from "~/db/queries/apiKey";

export interface ApiKeyFields extends Omit<SelectApiKey, "id"> { }

// NEW: Extended interface for user-centric token creation
export interface UserCentricApiKeyFields extends Omit<SelectApiKey, "id" | "secret" | "createdAt" | "updatedAt"> {
	assignedToUserId?: number; // The actual user who will use this token
}

function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

// ENHANCED: Support both admin-managed and user-assigned tokens
export async function apiKeyCreate(tx: Tx, fields: UserCentricApiKeyFields): Promise<CreateResult<ApiKeyFields>> {
	const res = await tx.insert(apiKeyTable)
		.values({
			createdAt: new Date(),
			name: fields.name,
			managedByUserId: fields.managedByUserId, // Admin who created it
			secret: generateSecret(),
			countryAccountsId: fields.countryAccountsId,
			// Store assigned user in the name field with a prefix for backward compatibility
			...(fields.assignedToUserId && {
				name: `${fields.name}__ASSIGNED_USER_${fields.assignedToUserId}`
			})
		})
		.returning({ id: apiKeyTable.id });

	return { ok: true, id: res[0].id };
}

export async function apiKeyUpdate(tx: Tx, idStr: string, fields: ApiKeyFields): Promise<UpdateResult<ApiKeyFields>> {
	const id = idStr;
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
	const id = idStr;
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

// ORIGINAL: Unchanged for backward compatibility
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
 * NEW: Token Assignment Parser - extracts user assignment from token name
 * Backward compatible approach without schema changes
 */
class TokenAssignmentParser {
	/**
	 * Extracts assigned user ID from token name using embedded pattern
	 * @param tokenName - Token name that may contain user assignment
	 * @returns number | null - Assigned user ID or null if not assigned
	 */
	static parseAssignedUserId(tokenName: string): number | null {
		if (!tokenName) return null;

		const match = tokenName.match(/__ASSIGNED_USER_(\d+)$/);
		return match ? parseInt(match[1], 10) : null;
	}

	/**
	 * Gets clean display name without assignment suffix
	 * @param tokenName - Full token name with potential assignment
	 * @returns string - Clean display name
	 */
	static getCleanTokenName(tokenName: string): string {
		if (!tokenName) return '';

		return tokenName.replace(/__ASSIGNED_USER_\d+$/, '');
	}

	/**
	 * Gets token assignment details
	 * @param key - API key object
	 * @returns Object with assignment info
	 */
	static getTokenAssignment(key: SelectApiKey): {
		assignedUserId: number | null;
		isUserAssigned: boolean;
		cleanName: string;
		managedByUserId: number;
	} {
		const assignedUserId = this.parseAssignedUserId(key.name);

		return {
			assignedUserId,
			isUserAssigned: assignedUserId !== null,
			cleanName: this.getCleanTokenName(key.name),
			managedByUserId: key.managedByUserId
		};
	}
}

/**
 * ENHANCED: User status validation service - supports both admin and assigned user validation
 */
class UserStatusValidator {
	/**
	 * Validates if user should have API access based on existing schema fields
	 * @param userId - User ID to validate
	 * @returns Promise<boolean> - true if user is active for API access
	 */
	static async isUserActiveForApi(userId: string): Promise<boolean> {
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

	/**
	 * NEW: Validates token access based on assignment model
	 * @param key - API key to validate
	 * @returns Promise<{isValid: boolean, reason?: string}> - Validation result
	 */
	static async validateTokenAccess(key: SelectApiKey): Promise<{
		isValid: boolean;
		reason?: string;
		validatedUser?: 'admin' | 'assigned_user';
	}> {
		const assignment = TokenAssignmentParser.getTokenAssignment(key);

		// If token is assigned to a specific user, validate that user
		if (assignment.isUserAssigned && assignment.assignedUserId) {
			const assignedUserActive = await this.isUserActiveForApi(assignment.assignedUserId);

			if (!assignedUserActive) {
				return {
					isValid: false,
					reason: `Assigned user ${assignment.assignedUserId} is inactive`,
					validatedUser: 'assigned_user'
				};
			}

			return {
				isValid: true,
				validatedUser: 'assigned_user'
			};
		}

		// Fallback to admin validation for non-assigned tokens
		const adminActive = await this.isUserActiveForApi(assignment.managedByUserId);

		if (!adminActive) {
			return {
				isValid: false,
				reason: `Managing admin ${assignment.managedByUserId} is inactive`,
				validatedUser: 'admin'
			};
		}

		return {
			isValid: true,
			validatedUser: 'admin'
		};
	}
}

/**
 * ORIGINAL: Enhanced API authentication with user validation - Open/Closed Principle
 * Now validates managing admin (backward compatibility)
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

		// Validate managing user is active (original behavior)
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
 * NEW: User-centric API authentication - validates assigned user
 * Implements the new requirement: token linked to actual user making use of it
 */
export async function apiAuthUserCentric(request: Request): Promise<SelectApiKey & {
	assignedUserId?: number;
	validatedUser: 'admin' | 'assigned_user';
}> {
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

		// Validate token access based on assignment model
		const validation = await UserStatusValidator.validateTokenAccess(key);

		if (!validation.isValid) {
			console.warn(`API access blocked for key ${key.id}: ${validation.reason}`);
			throw new Response("Unauthorized: User account inactive", { status: 401 });
		}

		const assignment = TokenAssignmentParser.getTokenAssignment(key);

		return {
			...key,
			assignedUserId: assignment.assignedUserId || undefined,
			validatedUser: validation.validatedUser!
		};

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
 * ENHANCED: API Security Audit Service - now supports user-centric tokens
 */
export class ApiSecurityAudit {
	/**
	 * Performs complete security audit of all API keys with assignment details
	 */
	static async auditApiKeysSecurity(): Promise<{
		total: number;
		adminManaged: number;
		userAssigned: number;
		active: number;
		withInactiveUsers: number;
		details: Array<{
			keyId: number;
			keyName: string;
			cleanName: string;
			managingUserEmail: string;
			assignedUserId?: number;
			assignedUserEmail?: string;
			tokenType: 'admin_managed' | 'user_assigned';
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
				adminManaged: 0,
				userAssigned: 0,
				active: 0,
				withInactiveUsers: 0,
				details: [] as Array<{
					keyId: number;
					keyName: string;
					cleanName: string;
					managingUserEmail: string;
					assignedUserId?: number;
					assignedUserEmail?: string;
					tokenType: 'admin_managed' | 'user_assigned';
					issues: string[];
				}>
			};

			for (const key of keys) {
				const auditResult = await ApiSecurityAudit.auditSingleKeyEnhanced(key);

				if (auditResult.tokenType === 'admin_managed') {
					results.adminManaged++;
				} else {
					results.userAssigned++;
				}

				if (auditResult.issues.length === 0) {
					results.active++;
				} else {
					results.withInactiveUsers++;
				}

				results.details.push(auditResult);
			}

			return results;

		} catch (error) {
			console.error("Security audit failed:", error);
			throw new Error("Failed to perform security audit");
		}
	}

	/**
	 * NEW: Enhanced single key audit with assignment details
	 */
	static async auditSingleKeyEnhanced(key: any): Promise<{
		keyId: number;
		keyName: string;
		cleanName: string;
		managingUserEmail: string;
		assignedUserId?: number;
		assignedUserEmail?: string;
		tokenType: 'admin_managed' | 'user_assigned';
		issues: string[];
	}> {
		const assignment = TokenAssignmentParser.getTokenAssignment(key);
		const managingUser = key.managedByUser;
		let issues: string[] = [];
		let assignedUserEmail: string | undefined;

		// Validate managing user
		if (!managingUser) {
			issues.push("Managing user deleted");
		} else {
			const managingUserStatus = await UserStatusValidator.getUserStatusDetails(managingUser);
			if (!managingUserStatus.isActive) {
				issues.push(`Managing admin inactive: ${managingUserStatus.issues.join(', ')}`);
			}
		}

		// Validate assigned user if applicable
		if (assignment.isUserAssigned && assignment.assignedUserId) {
			try {
				const assignedUser = await dr.query.userTable.findFirst({
					where: eq(userTable.id, assignment.assignedUserId)
				});

				if (!assignedUser) {
					issues.push("Assigned user deleted");
				} else {
					assignedUserEmail = assignedUser.email;
					const assignedUserStatus = await UserStatusValidator.getUserStatusDetails(assignedUser);
					if (!assignedUserStatus.isActive) {
						issues.push(`Assigned user inactive: ${assignedUserStatus.issues.join(', ')}`);
					}
				}
			} catch (error) {
				issues.push("Error validating assigned user");
			}
		}

		return {
			keyId: key.id,
			keyName: key.name || 'Unnamed',
			cleanName: assignment.cleanName,
			managingUserEmail: managingUser?.email || 'DELETED_USER',
			assignedUserId: assignment.assignedUserId || undefined,
			assignedUserEmail,
			tokenType: assignment.isUserAssigned ? 'user_assigned' : 'admin_managed',
			issues
		};
	}

	/**
	 * ORIGINAL: Audits a single API key - backward compatibility
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
	 * ENHANCED: Get API keys managed by specific user with assignment details
	 */
	static async getUserManagedApiKeys(userId: string): Promise<Array<SelectApiKey & {
		userIsActive: boolean;
		issues: string[];
		assignedUserId?: number;
		tokenType: 'admin_managed' | 'user_assigned';
		cleanName: string;
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
				const assignment = TokenAssignmentParser.getTokenAssignment(key);
				const user = key.managedByUser;
				const userStatus = user
					? await UserStatusValidator.getUserStatusDetails(user)
					: { isActive: false, issues: ["User not found"] };

				results.push({
					...key,
					userIsActive,
					issues: userStatus.issues,
					assignedUserId: assignment.assignedUserId || undefined,
					tokenType: assignment.isUserAssigned ? 'user_assigned' as const : 'admin_managed' as const,
					cleanName: assignment.cleanName
				});
			}

			return results;

		} catch (error) {
			console.error(`Error getting API keys for user ${userId}:`, error);
			return [];
		}
	}

	/**
	 * NEW: Get tokens assigned to a specific user (not managed by them)
	 */
	static async getTokensAssignedToUser(userId: number): Promise<Array<{
		keyId: number;
		keyName: string;
		cleanName: string;
		managingUserId: number;
		managingUserEmail?: string;
		isActive: boolean;
		issues: string[];
	}>> {
		try {
			// Find all tokens that contain this user ID in their assignment
			const allKeys = await dr.query.apiKeyTable.findMany({
				with: {
					managedByUser: true
				}
			});

			const assignedKeys = allKeys.filter(key => {
				const assignment = TokenAssignmentParser.getTokenAssignment(key);
				return assignment.assignedUserId === userId;
			});

			const results = [];
			for (const key of assignedKeys) {
				const validation = await UserStatusValidator.validateTokenAccess(key);
				const assignment = TokenAssignmentParser.getTokenAssignment(key);

				results.push({
					keyId: key.id,
					keyName: key.name,
					cleanName: assignment.cleanName,
					managingUserId: key.managedByUserId,
					managingUserEmail: key.managedByUser?.email,
					isActive: validation.isValid,
					issues: validation.reason ? [validation.reason] : []
				});
			}

			return results;

		} catch (error) {
			console.error(`Error getting tokens assigned to user ${userId}:`, error);
			return [];
		}
	}
}

/**
 * ENHANCED: User Access Management Service
 */
export class UserAccessManager {
	/**
	 * ORIGINAL: Revokes API access for a user using existing schema constraints
	 */
	static async revokeUserApiAccess(tx: Tx, userId: string, reason: string = "Manual revocation"): Promise<void> {
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
	 * ORIGINAL: Check if user can access API - Interface Segregation Principle
	 */
	static async canUserAccessApi(userId: string): Promise<boolean> {
		return UserStatusValidator.isUserActiveForApi(userId);
	}

	/**
	 * NEW: Create user-assigned token
	 */
	static async createUserAssignedToken(
		tx: Tx,
		adminUserId: number,
		assignedUserId: number,
		tokenName: string,
		countryAccountsId?: string | null
	): Promise<CreateResult<ApiKeyFields>> {
		return apiKeyCreate(tx, {
			name: tokenName,
			managedByUserId: adminUserId,
			assignedToUserId: assignedUserId,
			countryAccountsId: countryAccountsId ?? null
		});
	}

	/**
	 * NEW: Get comprehensive user access summary
	 */
	static async getUserAccessSummary(userId: number): Promise<{
		userIsActive: boolean;
		userIssues: string[];
		managedTokens: number;
		assignedTokens: number;
		activeAssignedTokens: number;
		inactiveAssignedTokens: number;
	}> {
		const userIsActive = await UserStatusValidator.isUserActiveForApi(userId);
		let userIssues: string[] = [];

		if (!userIsActive) {
			const user = await dr.query.userTable.findFirst({
				where: eq(userTable.id, userId)
			});
			const status = await UserStatusValidator.getUserStatusDetails(user);
			userIssues = status.issues;
		}

		const managedTokens = await ApiSecurityAudit.getUserManagedApiKeys(userId);
		const assignedTokens = await ApiSecurityAudit.getTokensAssignedToUser(userId);

		return {
			userIsActive,
			userIssues,
			managedTokens: managedTokens.length,
			assignedTokens: assignedTokens.length,
			activeAssignedTokens: assignedTokens.filter(t => t.isActive).length,
			inactiveAssignedTokens: assignedTokens.filter(t => !t.isActive).length
		};
	}
}

/**
 * ORIGINAL: Backward compatible API auth with monitoring 
 */
export async function apiAuthWithMonitoring(request: Request): Promise<SelectApiKey> {
	try {
		
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


export const canUserAccessApi = UserAccessManager.canUserAccessApi;
export const revokeUserApiAccess = UserAccessManager.revokeUserApiAccess;
export const auditApiKeysSecurity = ApiSecurityAudit.auditApiKeysSecurity;
export const getUserManagedApiKeys = ApiSecurityAudit.getUserManagedApiKeys;


export const createUserAssignedToken = UserAccessManager.createUserAssignedToken;
export const getTokensAssignedToUser = ApiSecurityAudit.getTokensAssignedToUser;
export const getUserAccessSummary = UserAccessManager.getUserAccessSummary;