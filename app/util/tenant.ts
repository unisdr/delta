/*import { UserSession } from "./session";
import { redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { countryAccounts } from "~/drizzle/schema";
import createLogger from "~/utils/logger.server";

// Initialize logger for this module
const logger = createLogger("util/tenant");
*/

/**
 * Base class for tenant-related errors
 */
/*export class TenantError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TenantError";
    }
}

/**
 * Error thrown when a user is not associated with any tenant
 */
/*export class NoTenantAssociationError extends TenantError {
    userId: string;

    constructor(userId: string) {
        super(`User ${userId} is not associated with any tenant`);
        this.name = "NoTenantAssociationError";
        this.userId = userId;
    }
}

/**
 * Error thrown when a tenant cannot be found
 */
/*export class TenantNotFoundError extends TenantError {
    tenantId: string;

    constructor(tenantId: string) {
        super(`Tenant ${tenantId} not found`);
        this.name = "TenantNotFoundError";
        this.tenantId = tenantId;
    }
}

/**
 * Error thrown when a user doesn't have access to a specific tenant
 */
/*export class TenantAccessDeniedError extends TenantError {
    userId: string;
    tenantId: string;

    constructor(userId: string, tenantId: string) {
        super(`User ${userId} does not have access to tenant ${tenantId}`);
        this.name = "TenantAccessDeniedError";
        this.userId = userId;
        this.tenantId = tenantId;
    }
}

/**
 * Public tenant context used for unauthenticated access to public data
 * This is a special tenant context that represents public/anonymous access
 */
/*export const public_tenant_context: TenantContext = {
    countryAccountId: "",
    countryId: "",
    countryName: "Public",
    iso3: ""
};

/**
 * Type guard to check if a tenant context is the public tenant context
 */
/*export function isPublicTenantContext(context: TenantContext): boolean {
    return (
        context.countryAccountId === "" &&
        context.countryId === "" &&
        context.countryName === "Public" &&
        context.iso3 === ""
    );
}

export interface TenantContext {
    countryAccountId: string;
    countryId: string;
    countryName: string;
    iso3: string;
}

/**
 * Extracts tenant context from user session
 * Throws an error if user has no tenant context
 */
/*export async function getTenantContext(userSession: UserSession): Promise<TenantContext> {
    const { user } = userSession;

    if (!user.countryAccountsId) {
        const userId = user.id ? String(user.id) : 'unknown';
        logger.warn(`User ${userId} is not associated with any tenant`);
        throw new NoTenantAssociationError(userId);
    }

    // Get country account with related country info
    const result = await dr.query.countryAccounts.findFirst({
        where: eq(countryAccounts.id, user.countryAccountsId as string), // We know this is not null because of the check above
        with: {
            country: true
        }
    });

    if (!result) {
        logger.warn(`Country account ${user.countryAccountsId} not found`);
        throw new TenantNotFoundError(user.countryAccountsId as string);
    }

    const country = result.country;
    if (!country?.id || !country.name || !country.iso3) {
        logger.error(`Country account ${result.id} has missing required fields`, {
            countryId: country?.id,
            countryName: country?.name,
            iso3: country?.iso3
        });
        throw new TenantError("Associated country account is missing required fields");
    }

    return {
        countryAccountId: result.id,
        countryId: country.id,
        countryName: country.name,
        iso3: country.iso3
    };
}

/**
 * Middleware to ensure user has valid tenant context
 * Redirects to error page if tenant context is invalid
 */
/*export async function requireTenantContext(userSession: UserSession) {
    try {
        return await getTenantContext(userSession);
    } catch (error) {
        // Log the error with structured metadata
        logger.error("Tenant context error", {
            userId: userSession.user?.id,
            errorType: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        // Customize redirect based on error type
        if (error instanceof NoTenantAssociationError) {
            throw redirect(`/error/unauthorized?reason=no-tenant`);
        } else if (error instanceof TenantNotFoundError) {
            throw redirect(`/error/unauthorized?reason=tenant-not-found`);
        } else if (error instanceof TenantAccessDeniedError) {
            throw redirect(`/error/unauthorized?reason=access-denied`);
        } else {
            throw redirect(`/error/unauthorized`);
        }
    }
}

/**
 * Type guard to check if an object is a valid TenantContext
 */
/*export function isTenantContext(obj: unknown): obj is TenantContext {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'countryAccountId' in obj &&
        'countryId' in obj &&
        'countryName' in obj &&
        'iso3' in obj
    );
}

/**
 * Helper to extract tenant context from loader/action arguments
 */
/*export async function getTenantContextFromArgs(args: { userSession: UserSession }) {
    return requireTenantContext(args.userSession);
}

type WithTenantContext<T> = T & { tenantContext: TenantContext };

/**
 * Composable function to add tenant context to loader/action arguments
 */
// export function withTenantContext<T extends { userSession: UserSession }>(
//     fn: (args: WithTenantContext<T>) => Promise<unknown>
// ) {
//     return async (args: T): Promise<unknown> => {
//         const tenantContext = await requireTenantContext(args.userSession);
//         return fn({ ...args, tenantContext } as WithTenantContext<T>);
//     };
// }

// /**
//  * Validates that a user has access to a specific country account
//  * Throws an error if access is denied
//  */
// export function validateTenantAccess(
//     userSession: UserSession,
//     targetCountryAccountId: string
// ) {
//     if (!userSession.user.countryAccountsId) {
//         const userId = userSession.user.id ? String(userSession.user.id) : 'unknown';
//         logger.warn(`User ${userId} is not associated with any tenant`);
//         throw new NoTenantAssociationError(userId);
//     }

//     if (userSession.user.countryAccountsId !== targetCountryAccountId) {
//         const userId = userSession.user.id ? String(userSession.user.id) : 'unknown';
//         logger.warn(`User ${userId} does not have access to tenant ${targetCountryAccountId}`);
//         throw new TenantAccessDeniedError(userId, targetCountryAccountId);
//     }
// }
// */