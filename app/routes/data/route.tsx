import {
	Outlet,
} from "@remix-run/react";

import {
	json
} from "@remix-run/node";

import type {
	ActionFunctionArgs
} from "@remix-run/node";

import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import {
		useLoaderData
} from "@remix-run/react";

export const loader = authLoader(async (loaderArgs) => {
	const user = authLoaderGetAuth(loaderArgs)
	return json({ message: `Hello ${user.email}` });
});

export default function Data() {
	const loaderData = useLoaderData<typeof loader>();
	console.log("loaderData", loaderData)
	const msg = loaderData.message

 return (
		<div>
			<p>{msg}</p>
			<p>Data</p>
			<Outlet></Outlet>
		</div>
	);
}

