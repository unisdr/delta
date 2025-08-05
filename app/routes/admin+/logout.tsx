import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { sessionCookie } from "~/util/session";

// Handle both GET and POST requests for logout
export const loader: LoaderFunction = async ({ request }) => {
	return await handleLogout(request);
};

export const action: ActionFunction = async ({ request }) => {
	return await handleLogout(request);
};

async function handleLogout(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	
	// Destroy the session to log out the super admin
	return redirect("/admin/login", {
		headers: {
			"Set-Cookie": await sessionCookie().destroySession(session),
		},
	});
}

// This component won't be rendered since we always redirect
export default function SuperAdminLogout() {
	return null;
}
