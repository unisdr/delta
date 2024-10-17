import {
	createCookieSessionStorage,
	Session
} from "@remix-run/node";
import { prisma } from "~/db.server";

import {
	redirect,
} from "@remix-run/react";

import {
	User,
	Session as SessionInDB,
} from "@prisma/client";

if (!process.env.SESSION_SECRET){
	throw "provide SESSION_SECRET in .env"
}

// we also store session activity time in the database, so this can be much longer
const cookieSessionExpiration = 60 * 60 * 24 * 7 * 1000 // 1 week

export const sessionCookie = createCookieSessionStorage({
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

export const getCookieSession = sessionCookie.getSession;
export const commitCookieSession = sessionCookie.commitSession;

export async function createUserSession(userId: number) {
	const sessionId = await prisma.session.create({
		data: {
			userId,
			lastActiveAt: new Date(),
		},
	});
	const session = await sessionCookie.getSession();
	session.set("sessionId", sessionId.id);
	const setCookie = await sessionCookie.commitSession(session)
	return {
		"Set-Cookie": setCookie,
	};
}

export async function sessionMarkTotpAuthed(sessionId: string){
	if (!sessionId) {
		return
	}
	await prisma.session.update({
		where: { id: sessionId },
		data: { totpAuthed: true }
	});
}

export async function cookieSessionDestroy(request: Request) {
	const session = await sessionCookie.getSession(request.headers.get("Cookie"));
	return {
		"Set-Cookie": await sessionCookie.destroySession(session),
	};
}

const sessionActivityTimeoutMinutes = 40

export interface UserSession {
	user: User
	sessionId: string
	session: SessionInDB
}

export async function getUserFromSession(request: Request): Promise<UserSession | undefined> {
	const session = await sessionCookie.getSession(request.headers.get("Cookie"));
	const sessionId = session.get("sessionId");

	if (!sessionId) return;

	const sessionData = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});

	if (!sessionData){
		return;
	}

	const now = new Date();
	const minutesSinceLastActivity = (now.getTime() - sessionData?.lastActiveAt.getTime()) / (1000 * 60);

	if (minutesSinceLastActivity > sessionActivityTimeoutMinutes){
		return;
	}

	await prisma.session.update({
		where: { id: sessionId },
		data: { lastActiveAt: now}
	});

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

type FlashMessageType = "info" | "error"

export interface FlashMessage {
	type: FlashMessageType
	text: string
}

export function getFlashMessage(session: Session): FlashMessage | undefined {
	const text = session.get("flashMessageText")
	if (!text){
		return
	}
	const typeStr = session.get("flashMessageType")
	let type: FlashMessageType = "info"
	if (typeStr == "error"){
		type = "error"
	}
	return {
		text: text,
		type: type,
	}
}

export async function redirectWithMessage(request: Request, url: string, message: FlashMessage){
	const session = await getCookieSession(request.headers.get("Cookie"));
	flashMessage(session, message)
	return redirect(url, {
    headers: {
      "Set-Cookie": await commitCookieSession(session),
    },
  });
}
