import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { superAdminSessionCookie } from "~/util/session";

// Handle both GET and POST requests for logout
export const loader: LoaderFunction = async ({ request }) => {
	return await handleLogout(request);
};

export const action: ActionFunction = async ({ request }) => {
	return await handleLogout(request);
};

async function handleLogout(request: Request) {
	const session = await superAdminSessionCookie().getSession(
		request.headers.get("Cookie")
	);

	// Destroy ONLY the super admin session cookie, leaving regular user sessions intact
	return redirect("/admin/login", {
		headers: {
			"Set-Cookie": await superAdminSessionCookie().destroySession(session),
		},
	});
}

// This component won't be rendered since we always redirect
export default function SuperAdminLogout() {
	return null;
}
