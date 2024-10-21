import {
	json
} from "@remix-run/node";

import { 
    Outlet,
    Link,
	useLoaderData
 } from "@remix-run/react";

import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)

	return json({ message: `Hello ${user.email}` });
});


export default function Settings() {
	return (
	  <div>
		<h1>Geographic levels</h1>
		<div className="secondary-nav">
			<NavSettings />
		</div>
		
	  </div>
	);
}
