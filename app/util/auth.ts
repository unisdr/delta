import { redirect } from "@remix-run/node";
import {
	LoaderFunction,
	LoaderFunctionArgs,
	json
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

import { sessionCookie } from "~/util/session";

type LoginResult = ModelLoginResult;

export async function login(email: string, password: string): Promise<LoginResult> {
	return modelLogin(email, password)
}

export async function getUserFromSession(request: Request) {
	const session = await sessionCookie.getSession(request.headers.get("Cookie"));
	const sessionId = session.get("sessionId");

	if (!sessionId) {
		return null;
	}

	const sessionData = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});

	if (!sessionData || sessionData.expiresAt < new Date()) {
		return null;
	}

	return sessionData.user;
}

export async function requireUser(request: Request) {
	const user = await getUserFromSession(request);
	if (!user) {
		throw redirect("/login");
	}
	return user;
}

export function authLoaderGetAuth(args: any): User {
	return args.user
}

export function authLoader(loader: LoaderFunction): LoaderFunction {
	return async (args) => {
		const user = await requireUser(args.request);
		return loader({
			...(args as any),
			user
		});
	};
}
