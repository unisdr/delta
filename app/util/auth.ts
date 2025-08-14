import {
	LoaderFunction,
	LoaderFunctionArgs,
	ActionFunction,
	ActionFunctionArgs,
	redirect,
} from "@remix-run/node";

import {
	cookieSessionDestroy,
	getCountrySettingsFromSession,
	getUserFromSession,
	getUserRoleFromSession,
	sessionMarkTotpAuthed,
	superAdminSessionCookie,
	getSuperAdminSession,
	UserSession,
	getCountryAccountsIdFromSession,
} from "~/util/session";

import {
	LoginResult,
	LoginTotpResult,
	login as modelLogin,
	loginTotp as modelLoginTotp,
} from "~/backend.server/models/user/auth";
import { apiAuth } from "~/backend.server/models/api_key";
import { PermissionId, roleHasPermission, RoleId, isSuperAdmin } from "~/frontend/user/roles";

export async function login(
	email: string,
	password: string
): Promise<LoginResult> {
	return await modelLogin(email, password);
}

export async function loginTotp(
	userId: string,
	sessionId: string,
	code: string,
	totpIssuer: string
): Promise<LoginTotpResult> {
	const res = await modelLoginTotp(userId, code, totpIssuer);
	if (!res.ok) {
		return res;
	}
	sessionMarkTotpAuthed(sessionId);
	return { ok: true };
}

export async function logout(request: Request) {
	return cookieSessionDestroy(request);
}

export async function requireUser(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		const url = new URL(request.url);
		const redirectTo = url.pathname + url.search;

		// Check if this is an admin route and redirect to admin login if so
		if (url.pathname.startsWith('/admin/')) {
			throw redirect(`/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
		} else {
			throw redirect(`/user/login?redirectTo=${encodeURIComponent(redirectTo)}`);
		}
	}
	const { user, session } = userSession;
	if (!user.emailVerified) {
		throw redirect("/user/verify-email");
	}
	if (user.totpEnabled && !session.totpAuthed) {
		throw redirect("/user/totp-login");
	}
	return userSession;
}

export async function optionalUser(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		return null;
	}
	const { user, session } = userSession;
	if (!user.emailVerified) {
		throw redirect("/user/verify-email");
	}
	if (user.totpEnabled && !session.totpAuthed) {
		throw redirect("/user/totp-login");
	}
	return userSession;
}

export async function requireUserAllowUnverifiedEmail(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw redirect("/user/login");
	}
	return userSession;
}

export async function requireUserAllowNoTotp(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw redirect("/user/login");
	}
	const { user } = userSession;
	if (!user.emailVerified) {
		throw redirect("/user/verify-email");
	}
	return userSession;
}

// Helper function to get effective user role (including super admin)
export async function getEffectiveUserRole(request: Request): Promise<RoleId | string | null> {
	const superAdminSession = await getSuperAdminSession(request);
	if (superAdminSession) {
		return "super_admin";
	}
	return await getUserRoleFromSession(request);
}

// Helper function to check permissions (including super admin)
export async function hasPermission(request: Request, permission: PermissionId): Promise<boolean> {
	const effectiveRole = await getEffectiveUserRole(request);

	// Use isSuperAdmin helper for direct super admin checks when needed
	if (isSuperAdmin(effectiveRole)) {
		// Super admins might have specific permission restrictions
		return roleHasPermission(effectiveRole, permission);
	}

	return roleHasPermission(effectiveRole, permission);
}

export function authLoader<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const userSession = await requireUser(args.request);

		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authLoaderWithPerm<T extends LoaderFunction>(
	permission: PermissionId,
	fn: T
): T {
	return (async (args: LoaderFunctionArgs) => {
		// Check if super admin first
		const superAdminSession = await getSuperAdminSession(args.request);
		if (superAdminSession) {
			// Only proceed with super admin path if this is a super admin route
			// This prevents regular users from being treated as super admins
			const url = new URL(args.request.url);
			const isAdminRoute = url.pathname.startsWith('/admin/');

			if (isAdminRoute && roleHasPermission("super_admin", permission)) {
				// Create a mock userSession for super admin
				const mockUserSession = {
					user: { id: "super_admin", emailVerified: true, totpEnabled: false },
					sessionId: superAdminSession.superAdminId,
					session: { totpAuthed: true }
				};
				return fn({
					...(args as any),
					userSession: mockUserSession,
				});
			} else if (isAdminRoute) {
				// Redirect to admin login instead of 403 for admin routes
				const url = new URL(args.request.url);
				const redirectTo = url.pathname + url.search;
				throw redirect(`/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
			}
			// If not an admin route, fall through to regular user flow
		}

		// Regular user flow
		// Check if this is an admin route first
		const urlForCheck = new URL(args.request.url);
		const isAdminRouteCheck = urlForCheck.pathname.startsWith('/admin/');

		// If it's an admin route, redirect to admin login
		if (isAdminRouteCheck) {
			const redirectTo = urlForCheck.pathname + urlForCheck.search;
			throw redirect(`/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
		}

		// For non-admin routes, continue with regular permission check
		const userSession = await requireUser(args.request);
		const userRole = await getUserRoleFromSession(args.request);
		const countryAccountsId = await getCountryAccountsIdFromSession(args.request);
		if(!countryAccountsId){
			throw redirect("/user/select-instance")
		}
		if (!roleHasPermission(userRole, permission)) {
			console.log("got here")
			throw new Response("Forbidden", { status: 403 });
		}
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

interface CustomLoaderArgs extends LoaderFunctionArgs {
	userSession?: UserSession;
}

export function authLoaderPublicOrWithPerm<T extends LoaderFunction>(
	permission: PermissionId,
	fn: T
): T {
	const wrappedLoader = async (args: LoaderFunctionArgs) => {
		const countryAccountsId = await getCountryAccountsIdFromSession(args.request);
		if(!countryAccountsId){
			throw redirect("/user/select-instance")
		}
		let settings = await getCountrySettingsFromSession(args.request);
		if (!settings.approvedRecordsArePublic) {
			const authLoader = authLoaderWithPerm(permission, fn);
			return await authLoader(args);
		}
		
		const userSession = await optionalUser(args.request);
		
		if (!userSession) {
			return await fn(args);
		}
		
		const userRole = await getEffectiveUserRole(args.request);
		if (!roleHasPermission(userRole, permission)) {
			throw new Response("Forbidden", { status: 403 });
		}		
		// Create extended args with proper typing
		const extendedArgs: CustomLoaderArgs = {
			...args,
			userSession, // Now properly typed
		};

		return await fn(extendedArgs);
	};

	return wrappedLoader as T;
}

export function authLoaderAllowUnverifiedEmail<T extends LoaderFunction>(
	fn: T
): T {
	return (async (args: LoaderFunctionArgs) => {
		const userSession = await requireUserAllowUnverifiedEmail(args.request);

		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authLoaderAllowNoTotp<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const userSession = await requireUserAllowNoTotp(args.request);

		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authLoaderApi<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const apiKey = await apiAuth(args.request);
		return fn({
			...(args as any),
			apiKey,
		});
	}) as T;
}

export function authLoaderApiDocs<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const authToken = args.request.headers.get("X-Auth");
		if (authToken) {
			await apiAuth(args.request);
			return fn(args);
		}
		return authLoaderWithPerm("ViewApiDocs", fn)(args);
	}) as T;
}

export function authLoaderGetAuth(args: any): UserSession {
	if (!args.userSession || !args.userSession.user) {
		throw new Error("Missing user session");
	}
	return args.userSession;
}

export interface UserForFrontend {
	role: RoleId;
	firstName: string;
	lastName: string;
}

export async function authLoaderGetUserForFrontend(
	args: LoaderFunctionArgs
): Promise<UserForFrontend> {
	// Check if super admin first
	const superAdminSession = await getSuperAdminSession(args.request);
	if (superAdminSession) {
		return {
			role: "super_admin" as RoleId,
			firstName: "Super",
			lastName: "Admin",
		};
	}

	const u = authLoaderGetAuth(args);
	const userRole = await getUserRoleFromSession(args.request);
	return {
		role: userRole as RoleId,
		firstName: u.user.firstName,
		lastName: u.user.lastName,
	};
}

export function authLoaderIsPublic(args: any): boolean {
	if (!args.userSession || !args.userSession.user) {
		return true;
	}
	return false;
}

export function authAction<T extends ActionFunction>(fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const userSession = await requireUser(args.request);
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authActionWithPerm<T extends ActionFunction>(
	permission: PermissionId,
	fn: T
): T {
	return (async (args: ActionFunctionArgs) => {
		// Check if super admin first
		const superAdminSession = await getSuperAdminSession(args.request);
		if (superAdminSession) {
			if (roleHasPermission("super_admin", permission)) {
				// Create a mock userSession for super admin
				const mockUserSession = {
					user: { id: "super_admin", emailVerified: true, totpEnabled: false },
					sessionId: superAdminSession.superAdminId,
					session: { totpAuthed: true }
				};
				return fn({
					...(args as any),
					userSession: mockUserSession,
				});
			} else {
				throw new Response("Forbidden", { status: 403 });
			}
		}

		// Regular user flow
		const userSession = await requireUser(args.request);
		const userRole = await getUserRoleFromSession(args.request);
		if (!roleHasPermission(userRole, permission)) {
			throw new Response("Forbidden", { status: 403 });
		}
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authActionAllowUnverifiedEmail<T extends ActionFunction>(
	fn: T
): T {
	return (async (args: ActionFunctionArgs) => {
		const userSession = await requireUserAllowUnverifiedEmail(args.request);
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authActionAllowNoTotp<T extends ActionFunction>(fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const userSession = await requireUserAllowNoTotp(args.request);
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authActionApi<T extends ActionFunction>(fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const apiKey = await apiAuth(args.request);
		return fn({
			...(args as any),
			apiKey,
		});
	}) as T;
}

export function authActionGetAuth(args: any): UserSession {
	if (!args.userSession || !args.userSession.user) {
		console.error("Missing user session", args);
		throw new Error("Missing user session");
	}
	return args.userSession;
}

export async function requireSuperAdmin(request: Request) {
	// Use the super admin session cookie instead of the regular session cookie
	const session = await superAdminSessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const superAdminId = session.get("superAdminId") as string | undefined;

	if (!superAdminId) {
		// Get the current URL to include as redirectTo parameter
		const url = new URL(request.url);
		const redirectTo = url.pathname + url.search;
		throw redirect(`/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
	return superAdminId;
}
