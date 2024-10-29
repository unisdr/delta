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

import { configSiteName } from "~/util/config";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: 'https://rawgit.com/PreventionWeb/templates/dts/dts/dist/assets/css/style-dts.css' },
	{ rel: "stylesheet", href: appStylesHref },
];

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)

	const session = await getCookieSession(request.headers.get("Cookie"));

	const message = getFlashMessage(session);

	return json({
		loggedIn: !!user,
		flashMessage: message,
		configSiteName: configSiteName(),
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
	const {loggedIn, flashMessage, configSiteName} = loaderData

	return (
		<html lang="en">
			<head>
				<link
					rel="icon"
					href="data:image/x-icon;base64,AA"
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
					<header>
						<div className="mg-container">
							<div className="dts-header">
								<div className='dts-header__logo'>
									<img src="https://rawgit.com/PreventionWeb/templates/dts/dts/dist/assets/images/dldt-logo-mark.svg" alt="DLDT logo mark" />
									<div className='dts-header__logo-text' dir="auto">{ configSiteName }</div>
								</div>
								<div className="dts-header__main-menu">
									<nav className="mg-mega-wrapper dts-mega-wrapper" aria-label="Main Navigation">
									<div className="mg-mega-topbar">
										<button className="mg-mega-topbar__item">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/information_outline.svg#information"></use>
										</svg>
										Data
										</button>
										<button className="mg-mega-topbar__item">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/eye-show-password.svg#eye-show"></use>
										</svg>
										Analysis
										</button>
										<button className="mg-mega-topbar__item">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/help-outline.svg#help-outline"></use>
										</svg>
										About
										</button>
										<button className="mg-mega-topbar__item">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/settings.svg#settings"></use>
										</svg>
										Settings
										</button>
										<button className="mg-mega-topbar__item">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/user-profile.svg#user"></use>
										</svg>
										Log in
										</button>
										<button className="mg-mega-topbar__item" aria-label="{title}">
										<svg aria-hidden="true" focusable="false" role="img">
											<use href="assets/icons/user-profile.svg#user"></use>
										</svg>
										</button>
									</div>
									</nav>
								</div>
							</div>
						</div>
					</header>
					<main className="dts-main-container">
						<section>
							<div className="mg-container">
								<div className="top-nav">
									<hr />
		                            <Nav loggedIn={loggedIn} />
									<hr />
								</div>
								<Outlet />
							</div>
						</section>
					</main>
					<footer></footer>
				</div>
				<Scripts />
			</body>
		</html>
	);
}

