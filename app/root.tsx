import type {
	LinksFunction
} from "@remix-run/node";

import {
	json
} from "@remix-run/node";

import {
	useLoaderData,
	Links,
	Meta,
	Outlet,
	Scripts,
	Link
} from "@remix-run/react";

import { LoaderFunctionArgs, NavLink } from "react-router-dom";

import appStylesHref from "./app.css?url";

import {
	getUserFromSession
} from "~/util/session";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: appStylesHref },
];

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)
	return json({loggedIn: !!user});
};

interface NavProps {
	loggedIn: boolean
}

function Nav(props: NavProps) {
	const menu = [
		{link: "data", text: "Data"},
		{link: "analytics", text: "Analytics"},
		{link: "settings", text: "Settings"},
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
      {props.loggedIn ? (
				<Link to="/user/logout">Logout</Link>
      ) : null }
		</nav>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {loggedIn} = loaderData

	return (
		<html>
			<head>
				<link
					rel="icon"
					href="data:image/x-icon;base64,AA"
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<div className="top-nav">
				<Nav loggedIn={loggedIn} />
				</div>
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}

