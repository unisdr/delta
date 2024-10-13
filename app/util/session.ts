import { createCookieSessionStorage } from "@remix-run/node";
import { prisma } from "~/db.server";


if (!process.env.SESSION_SECRET){
	throw "provide SESSION_SECRET in .env"
}

const sessionExpiration = 60 * 60 * 24 * 7 * 1000 // 1 week

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
		maxAge: sessionExpiration,
	},
});

export async function createUserSession(userId: number) {
	const sessionId = await prisma.session.create({
		data: {
			userId,
			expiresAt: new Date(Date.now() + sessionExpiration),
		},
	});
	const session = await sessionCookie.getSession();
	session.set("sessionId", sessionId.id);
	const setCookie = await sessionCookie.commitSession(session)

	return {
		"Set-Cookie": setCookie,
	};
}

export async function getUserFromSession(request: Request) {
	const session = await sessionCookie.getSession(request.headers.get("Cookie"));
	const sessionId = session.get("sessionId");

	if (!sessionId) return null;

	const sessionData = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});

	if (!sessionData || sessionData.expiresAt < new Date()) {
		return null;
	}

	return sessionData.user;
}

export async function logout(request: Request) {
	const session = await sessionCookie.getSession(request.headers.get("Cookie"));
	return {
		"Set-Cookie": await sessionCookie.destroySession(session),
	};
}
