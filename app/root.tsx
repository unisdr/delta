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
	useNavigation,
	useFetcher
} from "@remix-run/react";

import { LoaderFunctionArgs } from "react-router-dom";


import {
	getUserFromSession,
	sessionCookie,
	getFlashMessage,
	FlashMessage
} from "~/util/session";

import { useEffect, useState } from "react";

import { configApprovedRecordsArePublic, configSiteLogo, configSiteName } from "~/util/config";

import allStylesHref from "./styles/all.css?url";

import {
	Header,
} from "~/frontend/header/header"
import {
	Footer,
} from "~/frontend/footer/footer"

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: 'https://rawgit.com/PreventionWeb/templates/dts/dts/dist/assets/css/style-dts.css' },
	{ rel: "stylesheet", href: allStylesHref },
];

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)

	const session = await sessionCookie().getSession(request.headers.get("Cookie"));

	const message = getFlashMessage(session);

	return json({
		hasPublicSite: configApprovedRecordsArePublic(),
		loggedIn: !!user,
		flashMessage: message,
		configSiteName: configSiteName(),
		configSiteLogo: configSiteLogo(),
	}, {
	headers: {
		"Set-Cookie": await sessionCookie().commitSession(session),
	}
	});
};

/*
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
}*/

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

	const fetcher = useFetcher();

	if (!props.loggedIn){
		return null;
	}
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
		<div className={`session-message session-${type}`}>
			<p>{message.text}</p>
		</div>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {hasPublicSite, loggedIn, flashMessage, configSiteName, configSiteLogo} = loaderData

	return (
		<html lang="en">
			<head>
				<link
					rel="icon"
					type="image/x-icon" 
					href="/favicon.ico"
				/>
				<Meta />
				<Links />
				{/* Add literal meta tags */}
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta charSet="utf-8" />
			</head>
			<body>
				<InactivityWarning loggedIn={loggedIn} />
				<SessionMessage message={flashMessage} />
				<div className="dts-page-container">
					{ (hasPublicSite || loggedIn) && (
					<header>
						<div className="mg-container">
							<Header loggedIn={loggedIn} siteName={configSiteName} siteLogo={configSiteLogo} />
						</div>
					</header> ) }
					<main className="dts-main-container">
						<Outlet />
					</main>
					<footer>
						<Footer siteName={configSiteName} />
					</footer>
				</div>
				<Scripts />
			</body>
		</html>
	);
}

