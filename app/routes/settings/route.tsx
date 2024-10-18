import {
	json,
	redirect
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

// import { Nav as NavSettings } from "~/components/settings/model";

import { NavLink } from "react-router-dom";

function NavSettings() {
	const menu = [
		{link: "settings/access-mgmt", text: "Access management"},
		{link: "settings/system", text: "System settings"},
		{link: "settings/geography", text: "Geographic levels"},
		{link: "settings/sectors", text: "Sectors"},
	]
	return (
		<nav>
			{menu.map((item, index) => (
				<NavLink
					key={index}
					to={`/${item.link}`}
					className={({ isActive, isPending }) =>
						isActive ? "active" : isPending ? "pending" : ""
					}
				>
				{item.text}
				</NavLink>
			))}
		</nav>
	);
}

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)

	return json({ message: `Hello ${user.email}` });
});

// export const loader = async () => {
// 	return redirect("/settings/system", 303);
// };


export default function Settings() {
	return (
	  <div>
		<Outlet />
	  </div>
	);
}
