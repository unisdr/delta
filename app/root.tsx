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
	Link,
	useNavigation,
	useFetcher
} from "@remix-run/react";

import { LoaderFunctionArgs, NavLink } from "react-router-dom";

import appStylesHref from "./app.css?url";

import {
	getUserFromSession,
	getCookieSession,
	commitCookieSession,
	getFlashMessage,
	FlashMessage
} from "~/util/session";

import { useEffect, useState } from "react";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: appStylesHref },
];

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)

	const session = await getCookieSession(request.headers.get("Cookie"));

	const message = getFlashMessage(session);

	return json({
		loggedIn: !!user,
		flashMessage: message
	}, {
	headers: {
		"Set-Cookie": await commitCookieSession(session),
	}
	});
};

interface NavProps {
	loggedIn: boolean
}

function Nav(props: NavProps) {
	const menu = [
		{link: "data", text: "Data"},
		{link: "settings", text: "Settings"},
		{link: "user/settings", text: "Settings (todo 2)"},
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

interface InactivityWarningProps {
	loggedIn: boolean
}
function InactivityWarning(props: InactivityWarningProps){
	const sessionActivityTimeoutMinutes = 40;
	const sessionActivityWarningBeforeTimeoutMinutes = 10;

	const navigation = useNavigation();
	const [lastActivity, setLastActivity] = useState(new Date());
	const [showWarning, setShowWarning] = useState(false);
	const [expiresInMinutes, setExpiresInMinutes] = useState(0);

	useEffect(() => {
		console.log("navigation state changed", navigation.state);
		setLastActivity(new Date());
	}, [navigation.state]);

	useEffect(() => {
		const update = () => {
			console.log("Checking login session expiration")
			const now = new Date();
			const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

			if (minutesSinceLastActivity > (sessionActivityTimeoutMinutes - sessionActivityWarningBeforeTimeoutMinutes)) {
				setShowWarning(true);
				setExpiresInMinutes(Math.max(0, sessionActivityTimeoutMinutes - minutesSinceLastActivity));
			} else {
				setShowWarning(false);
			}
		}
		update();
		const interval = setInterval(update, 10 * 1000);
		return () => clearInterval(interval);
	}, [lastActivity]);

	if (!props.loggedIn){
		return null;
	}

	const fetcher = useFetcher();
	const handleRefreshSession = () => {
		setLastActivity(new Date());
		fetcher.load("/user/refresh-session");
	};

	return (
	<>
		{showWarning ? (
			<div style={{ background: "red", position: "fixed", top: 0, width: "100%" }}>
				{expiresInMinutes > 0.1 ? (
					<>
						<p>
							Login session expires in {Math.round(expiresInMinutes)} minutes due to inactivity.
						</p>
						<button onClick={handleRefreshSession}>
							Refresh session
						</button>
					</>
				) : (
					<p>Session expired</p>
				)}
			</div>
		) : null}
	</>
	);
}

interface SessionMessageProps {
	message?: FlashMessage
}

function SessionMessage({message}: SessionMessageProps) {
	if (!message){
		return null
	}
	let type = "info"
	if (message.type == "error"){
		type = "error"
	}
	return (
		<div className="session-message session-${type}">
			<p>{message.text}</p>
		</div>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {loggedIn, flashMessage} = loaderData

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
				<InactivityWarning loggedIn={loggedIn} />
				<SessionMessage message={flashMessage} />
				<div className="top-nav">
				<Nav loggedIn={loggedIn} />
				</div>
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}

