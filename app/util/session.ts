import {
	createCookieSessionStorage,
	Session,
	SessionStorage,
	SessionData,
} from "@remix-run/node";
import { dr } from "~/db.server";
import { sessionTable, userTable } from "~/drizzle/schema";

import { redirect } from "@remix-run/react";

import { InferSelectModel, eq } from "drizzle-orm";
import {
	sessionActivityTimeoutMinutes
} from "~/util/session-activity-config";

export let _sessionCookie: SessionStorage<SessionData, SessionData> | null = null;
export let _superAdminSessionCookie: SessionStorage<SessionData, SessionData> | null = null;

export function initCookieStorage() {
	// we also store session activity time in the database, so this can be much longer
	const cookieSessionExpiration = 60 * 60 * 1; // 1 hour
	if (!process.env.SESSION_SECRET) {
		throw "no SESSION_SECRET in .env";
	}

	// Regular user session cookie
	_sessionCookie = createCookieSessionStorage({
		cookie: {
			// Using __ in front of a name is a common pattern
			name: "__session",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Only send cookie over HTTPS in production
			// lax allows cookie on get request originating from other sites, so users would still be logged in
			sameSite: "lax",
			path: "/",
			secrets: [process.env.SESSION_SECRET],
			maxAge: cookieSessionExpiration,
		},
	});

	// Super admin session cookie - separate from regular user sessions
	_superAdminSessionCookie = createCookieSessionStorage({
		cookie: {
			name: "__super_admin_session",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			secrets: [process.env.SESSION_SECRET],
			maxAge: cookieSessionExpiration,
		},
	});
}

export function sessionCookie(): SessionStorage<SessionData, SessionData> {
	if (!_sessionCookie) {
		throw "initCookieStorage was not called";
	}
	return _sessionCookie;
}

export function superAdminSessionCookie(): SessionStorage<SessionData, SessionData> {
	if (!_superAdminSessionCookie) {
		throw "initCookieStorage was not called";
	}
	return _superAdminSessionCookie;
}

export async function createSuperAdminSession(superAdminId: string) {
	const session = await superAdminSessionCookie().getSession();
	session.set("superAdminId", superAdminId);
	const setCookie = await superAdminSessionCookie().commitSession(session);
	return {
		"Set-Cookie": setCookie,
	};
}

export async function getSuperAdminSession(
	request: Request
): Promise<SuperAdminSession | undefined> {
	const session = await superAdminSessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const superAdminId = session.get("superAdminId");

	if (!superAdminId) return;

	if (typeof superAdminId != "string") return;

	return {
		superAdminId: superAdminId,
	};
}

export async function createUserSession(userId: string) {
	const sessionRow: typeof sessionTable.$inferInsert = {
		userId,
		lastActiveAt: new Date(),
	};

	const res = await dr.insert(sessionTable).values(sessionRow).returning();
	const sessionId = res[0].id;

	const session = await sessionCookie().getSession();
	session.set("sessionId", sessionId);
	session.set("userId", res[0].userId);

	const setCookie = await sessionCookie().commitSession(session);
	return {
		"Set-Cookie": setCookie,
	};
}

export async function sessionMarkTotpAuthed(sessionId: string) {
	if (!sessionId) {
		return;
	}

	await dr
		.update(sessionTable)
		.set({ totpAuthed: true })
		.where(eq(sessionTable.id, sessionId));
}

export async function cookieSessionDestroy(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	return {
		"Set-Cookie": await sessionCookie().destroySession(session),
	};
}

export interface UserSession {
	user: InferSelectModel<typeof userTable>;
	sessionId: string;
	session: InferSelectModel<typeof sessionTable>;
}
export interface SuperAdminSession {
	superAdminId: string;
}

export async function getUserFromSession(
	request: Request
): Promise<UserSession | undefined> {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const sessionId = session.get("sessionId");

	if (!sessionId) return;

	if (typeof sessionId != "string") return;

	// TODO: currently sessions are not deleted when users are deleted, fix this

	const sessionData = await dr.query.sessionTable.findFirst({
		where: eq(sessionTable.id, sessionId),
		with: {
			user: true,
		},
	});

	if (!sessionData) {
		return;
	}

	const now = new Date();
	const minutesSinceLastActivity =
		(now.getTime() - sessionData?.lastActiveAt.getTime()) / (1000 * 60);

	if (minutesSinceLastActivity > sessionActivityTimeoutMinutes) {
		return;
	}

	await dr
		.update(sessionTable)
		.set({ lastActiveAt: now })
		.where(eq(sessionTable.id, sessionId));

	return {
		user: sessionData.user,
		sessionId: sessionId,
		session: sessionData,
	};
}

export function flashMessage(session: Session, message: FlashMessage) {
	session.flash("flashMessageText", message.text);
	session.flash("flashMessageType", message.type);
}

type FlashMessageType = "info" | "error";

export interface FlashMessage {
	type: FlashMessageType;
	text: string;
}

export function getFlashMessage(session: Session): FlashMessage | undefined {
	const text = session.get("flashMessageText");
	if (!text) {
		return;
	}
	const typeStr = session.get("flashMessageType");
	let type: FlashMessageType = "info";
	if (typeStr == "error") {
		type = "error";
	}
	return {
		text: text,
		type: type,
	};
}

export async function redirectWithMessage(
	request: Request,
	url: string,
	message: FlashMessage
) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	flashMessage(session, message);
	return redirect(url, {
		headers: {
			"Set-Cookie": await sessionCookie().commitSession(session),
		},
	});
}

export async function getCountrySettingsFromSession(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const countrySettings = session.get("countrySettings");
	return countrySettings;
}

export async function getUserRoleFromSession(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const countrySettings = session.get("userRole");
	return countrySettings;
}

export async function getCountryAccountsIdFromSession(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const countryAccountsId = session.get("countryAccountsId");
	return countryAccountsId;
}

export async function getLanguageFromSession(request: Request): Promise<string | undefined> {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const language = session.get("language");
	return language;
}

export async function setLanguageInSession(request: Request, language: string) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	session.set("language", language);
	return {
		"Set-Cookie": await sessionCookie().commitSession(session),
	};
}

export async function getDirectionFromSession(request: Request): Promise<'ltr' | 'rtl' | undefined> {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const direction = session.get("direction");
	return direction;
}

export async function setDirectionInSession(request: Request, direction: 'ltr' | 'rtl') {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	session.set("direction", direction);
	return {
		"Set-Cookie": await sessionCookie().commitSession(session),
	};
}