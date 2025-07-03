import { UserSession } from "./session";
import { redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { countryAccounts } from "~/drizzle/schema";

/**
 * Public tenant context used for unauthenticated access to public data
 * This is a special tenant context that represents public/anonymous access
 */
export const public_tenant_context: TenantContext = {
    countryAccountId: "",
    countryId: "",
    countryName: "Public",
    iso3: ""
};

/**
 * Type guard to check if a tenant context is the public tenant context
 */
export function isPublicTenantContext(context: TenantContext): boolean {
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
export async function getTenantContext(userSession: UserSession): Promise<TenantContext> {
    const { user } = userSession;

    if (!user.countryAccountsId) {
        throw new Error("User is not associated with any tenant");
    }

    // Get country account with related country info
    const result = await dr.query.countryAccounts.findFirst({
        where: eq(countryAccounts.id, user.countryAccountsId as string), // We know this is not null because of the check above
        with: {
            country: true
        }
    });

    if (!result) {
        throw new Error("Country account not found");
    }

    const country = result.country;
    if (!country?.id || !country.name || !country.iso3) {
        throw new Error("Associated country account is missing required fields");
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
export async function requireTenantContext(userSession: UserSession, redirectTo = "/error/unauthorized") {
    try {
        return await getTenantContext(userSession);
    } catch (error) {
        console.error("Tenant context error:", error);
        throw redirect(redirectTo);
    }
}

/**
 * Type guard to check if an object is a valid TenantContext
 */
export function isTenantContext(obj: unknown): obj is TenantContext {
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
export async function getTenantContextFromArgs(args: { userSession: UserSession }) {
    return requireTenantContext(args.userSession);
}

type WithTenantContext<T> = T & { tenantContext: TenantContext };

/**
 * Composable function to add tenant context to loader/action arguments
 */
export function withTenantContext<T extends { userSession: UserSession }>(
    fn: (args: WithTenantContext<T>) => Promise<unknown>
) {
    return async (args: T): Promise<unknown> => {
        const tenantContext = await requireTenantContext(args.userSession);
        return fn({ ...args, tenantContext } as WithTenantContext<T>);
    };
}

/**
 * Validates that a user has access to a specific country account
 * Throws an error if access is denied
 */
export function validateTenantAccess(
    userSession: UserSession,
    targetCountryAccountId: string
) {
    if (!userSession.user.countryAccountsId) {
        throw new Error("User is not associated with any tenant");
    }

    if (userSession.user.countryAccountsId !== targetCountryAccountId) {
        throw new Error("Access to requested tenant denied");
    }
}
