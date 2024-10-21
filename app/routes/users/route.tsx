import {
	Outlet,
} from "@remix-run/react";

import {
	json
} from "@remix-run/node";

import {
	authLoaderWithRole,
} from "~/util/auth";

export const loader = authLoaderWithRole("ViewUsers", async () => {
	return json(null)
});

export default function Screen() {
	return (
		<>
		<h1>Users</h1>
		<Outlet />
		</>
	);
}

