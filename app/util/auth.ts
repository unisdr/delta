import {
	LoaderFunction,
	LoaderFunctionArgs,
	ActionFunction,
	ActionFunctionArgs,
	redirect
} from "@remix-run/node";

import {
	Errors as FormErrors,
} from "~/components/form"

import {
	prisma
} from "~/db.server";

import {
	User
} from "@prisma/client";

import {
	login as modelLogin,
	LoginResult as ModelLoginResult
} from "~/components/user/model"

import {
	getUserFromSession
} from "~/util/session";

type LoginResult = ModelLoginResult;

export async function login(email: string, password: string): Promise<LoginResult> {
	return modelLogin(email, password)
}

export async function requireUser(request: Request) {
	const user = await getUserFromSession(request);
	if (!user){
		throw redirect("/user/login");
	}
	if (!user.emailVerified) {
		throw redirect("/user/verify_email");
	}
	return user;
}

export async function requireUserAllowUnverifiedEmail(request: Request) {
	const user = await getUserFromSession(request);
	if (!user){
		throw redirect("/user/login");
	}
	return user;
}

export function authLoader<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const user = await requireUser(args.request);

		return fn({
			...(args as any),
			user,
		});
	}) as T;
}

export function authLoaderAllowUnverifiedEmail<T extends LoaderFunction>(fn: T): T {
	return (async (args: LoaderFunctionArgs) => {
		const user = await requireUserAllowUnverifiedEmail(args.request);

		return fn({
			...(args as any),
			user,
		});
	}) as T;
}

export function authLoaderGetAuth(args: any): User {
	return args.user
}

export function authAction<T extends ActionFunction>(fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const user = await requireUser(args.request);
		return fn({
			...(args as any),
			user,
		});
	}) as T;
}

export function authActionAllowUnverifiedEmail<T extends ActionFunction>(fn: T): T {
	return (async (args: ActionFunctionArgs) => {
		const user = await requireUserAllowUnverifiedEmail(args.request);
		return fn({
			...(args as any),
			user,
		});
	}) as T;
}

export function authActionGetAuth(args: any): User {
	return args.user
}

