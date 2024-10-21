import {
	Outlet,
} from "@remix-run/react";

import {
	json
} from "@remix-run/node";

import {
	authLoaderGetAuth,
	authLoaderWithRole
} from "~/util/auth";

import {
		useLoaderData
} from "@remix-run/react";

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	return json({ message: `Hello ${user.email}` });
});

export default function Data() {
	const loaderData = useLoaderData<typeof loader>();
	const { message } = loaderData;
 return (
		<div>
			<p>{message}</p>
			<h1>Data</h1>
			<Outlet></Outlet>
		</div>
	);
}

