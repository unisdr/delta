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
	sessionCookie,
	sessionMarkTotpAuthed,
	UserSession,
} from "~/util/session";

import {
	LoginResult,
	LoginTotpResult,
	login as modelLogin,
	loginTotp as modelLoginTotp,
} from "~/backend.server/models/user/auth";
import { apiAuth } from "~/backend.server/models/api_key";
import { PermissionId, roleHasPermission, RoleId } from "~/frontend/user/roles";
import { getUserById } from "~/db/queries/user";

export async function login(
	email: string,
	password: string
): Promise<LoginResult> {
	return await modelLogin(email, password);
}

export async function loginTotp(
	userId: number,
	sessionId: string,
	code: string
): Promise<LoginTotpResult> {
	const res = await modelLoginTotp(userId, code);
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
		throw redirect(`/user/login?redirectTo=${encodeURIComponent(redirectTo)}`);
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
		const userSession = await requireUser(args.request);
		if (!roleHasPermission(userSession.user.role, permission)) {
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
		let settings = await getCountrySettingsFromSession(args.request);

		if (!settings) {
			settings = {
				id: null,
				footerUrlPrivacyPolicy: null,
				footerUrlTermsConditions: null,
				adminSetupComplete: false,
				websiteLogo: "/assets/country-instance-logo.png",
				websiteName: "Disaster Tracking System",
				websiteUrl: "http://localhost:3000",
				approvedRecordsArePublic: false,
				totpIssuer: "example-app",
				dtsInstanceType: "country",
				dtsInstanceCtryIso3: "USA",
				currencyCodes: "USD",
				countryName: "United State of America",
				countryAccountsId: null,
			};
		}

		if (!settings.approvedRecordsArePublic) {
			const authLoader = authLoaderWithPerm(permission, fn);
			return await authLoader(args);
		}

		const userSession = await optionalUser(args.request);

		if (!userSession) {
			return await fn(args);
		}

		if (!roleHasPermission(userSession.user.role, permission)) {
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
	console.log("args.userSession", args.userSession)
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

export function authLoaderGetUserForFrontend(args: any): UserForFrontend {
	let u = authLoaderGetAuth(args);
	return {
		role: u.user.role as RoleId,
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
		const userSession = await requireUser(args.request);
		if (!roleHasPermission(userSession.user.role, permission)) {
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
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const userId = session.get("userId") as string | undefined;

	if (!userId) {
		throw redirect("/login");
	}

	const user = await getUserById(Number(userId));
	if (!user || user.role !== "super_admin") {
		throw redirect("/403");
	}

	return user;
}
