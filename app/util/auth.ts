import {
	LoaderFunction,
	LoaderFunctionArgs,
	ActionFunction,
	ActionFunctionArgs,
	redirect
} from "@remix-run/node";


import {
	cookieSessionDestroy,
	getUserFromSession,
	sessionMarkTotpAuthed,
	UserSession
} from "~/util/session";

import * as user from "~/backend.server/models/user"
import {PermissionId, roleHasPermission} from "~/components/user/roles";

export async function login(email: string, password: string): Promise<user.LoginResult> {
	return await user.login(email, password)
}

export async function loginTotp(userId: number, sessionId: string, code: string): Promise<user.LoginTotpResult> {
	const res = await user.loginTotp(userId, code);
	if (!res.ok){
		return res
	}
	sessionMarkTotpAuthed(sessionId)
	return {ok: true}
}

export async function logout(request: Request) {
	return cookieSessionDestroy(request)
}

export async function requireUser(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession){
		throw redirect("/user/login");
	}
	const { user, session } = userSession
	if (!user.emailVerified) {
		throw redirect("/user/verify-email");
	}
	if (user.totpEnabled && !session.totpAuthed){
		throw redirect("/user/totp-login");
	}
	return userSession;
}

export async function requireUserAllowUnverifiedEmail(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession){
		throw redirect("/user/login");
	}
	return userSession;
}

export async function requireUserAllowNoTotp(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession){
		throw redirect("/user/login");
	}
	const { user } = userSession
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

export function authLoaderWithRole<T extends LoaderFunction>(permission: PermissionId, fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const userSession = await requireUser(args.request);
		if (!roleHasPermission(userSession.user.role, permission)){
		throw new Response("Forbidden", { status: 403 });
	}

		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authLoaderAllowUnverifiedEmail<T extends LoaderFunction>(fn: T): T {
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


export function authLoaderGetAuth(args: any): UserSession {
	if (!args.userSession || !args.userSession.user){
		throw "Missing user session"
	}
	return args.userSession
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


export function authActionWithRole<T extends ActionFunction>(permission: PermissionId, fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const userSession = await requireUser(args.request);
		if (!roleHasPermission(userSession.user.role, permission)){
		throw new Response("Forbidden", { status: 403 });
	}
		return fn({
			...(args as any),
			userSession,
		});
	}) as T;
}

export function authActionAllowUnverifiedEmail<T extends ActionFunction>(fn: T): T {
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

export function authActionGetAuth(args: any): UserSession {
	if (!args.userSession || !args.userSession.user){
		throw "Missing user session"
	}
	return args.userSession
}

