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


import {
	getUserFromSession,
	getCookieSession,
	commitCookieSession,
	getFlashMessage,
	FlashMessage
} from "~/util/session";

import { useEffect, useState } from "react";

import { configSiteLogo, configSiteName } from "~/util/config";

import allStylesHref from "./styles/all.css?url";

import {
	Header,
} from "~/components/header/header"


export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: 'https://rawgit.com/PreventionWeb/templates/dts/dts/dist/assets/css/style-dts.css' },
	{ rel: "stylesheet", href: allStylesHref },
];

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)

	const session = await getCookieSession(request.headers.get("Cookie"));

	const message = getFlashMessage(session);

	return json({
		loggedIn: !!user,
		flashMessage: message,
		configSiteName: configSiteName(),
		configSiteLogo: configSiteLogo(),
	}, {
	headers: {
		"Set-Cookie": await commitCookieSession(session),
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
		<div className="session-message session-${type}">
			<p>{message.text}</p>
		</div>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {loggedIn, flashMessage, configSiteName, configSiteLogo} = loaderData

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
					{ loggedIn && (
					<header>
						<div className="mg-container">
							<Header siteName={configSiteName} siteLogo={configSiteLogo} />
						</div>
					</header> ) }
					<main className="dts-main-container">
						<section>
							<div className="mg-container">
								<Outlet />
							</div>
						</section>
					</main>
					<footer>
  						<div className="dts-footer">
							<div className="mg-container">
							<div className="dts-footer__top-bar">
								<div>{configSiteName}</div>
								<nav>
								<ul>
									<li>
									<a href="">How do I use this data?</a>
									</li>
									<li>
									<a href="">Help</a>
									</li>
									<li>
									<a href="">General</a>
									</li>
									<li>
									<a href="">Technical specification</a>
									</li>
									<li>
									<a href="">Partners</a>
									</li>
								</ul>
								</nav>
							</div>
							<div className="dts-footer__bottom-bar">
								<div className="dts-footer__bottom-bar-text">Tracking the costs of disasters is a vital step toward risk-informed development, and investing in disaster risk reduction.</div>
								<nav>
								<ul>
									<li>
									<a href="">Privacy policy</a>
									</li>
									<li>
									<a href="">Terms and conditions</a>
									</li>
								</ul>
								</nav>
							</div>
							</div>
						</div>
					</footer>
				</div>
				<Scripts />
			</body>
		</html>
	);
}

