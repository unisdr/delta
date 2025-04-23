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
	useFetcher,
	useMatches
} from "@remix-run/react";

import {LoaderFunctionArgs} from "react-router-dom";

import {ToastContainer} from "react-toastify/unstyled"; // Import ToastContainer for notifications

import {
	getUserFromSession,
	sessionCookie,
	getFlashMessage,
} from "~/util/session";

import {useEffect, useState} from "react";

import {
	configApprovedRecordsArePublic,
	configSiteLogo,
	configSiteName,
	configFooterURLPrivPolicy,
	configFooterURLTermsConds,
} from "~/util/config";

import allStylesHref from "./styles/all.css?url";

import {
	Header,
} from "~/frontend/header/header"
import {
	Footer,
} from "~/frontend/footer/footer"

import {QueryClient, QueryClientProvider} from 'react-query';
import {notifyError, notifyInfo} from "./frontend/utils/notifications";


export const links: LinksFunction = () => [
	{rel: "stylesheet", href: '/assets/css/style-dts.css?asof=20250414'},
	{rel: "stylesheet", href: allStylesHref},
];

export const loader = async ({request}: LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)

	const session = await sessionCookie().getSession(request.headers.get("Cookie"));

	const message = getFlashMessage(session);

	return json({
		hasPublicSite: configApprovedRecordsArePublic(),
		loggedIn: !!user,
		userRole: user?.user.role || '',
		flashMessage: message,
		confSiteName: configSiteName(),
		confSiteLogo: configSiteLogo(),
		confFooterURLPrivPolicy: configFooterURLPrivPolicy(),
		confFooterURLTermsConds: configFooterURLTermsConds(),
		env: {
			CURRENCY_CODES: process.env.CURRENCY_CODES || '',
			DTS_INSTANCE_CTRY_ISO3: process.env.DTS_INSTANCE_CTRY_ISO3 || ''
		}
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
function InactivityWarning(props: InactivityWarningProps) {
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

	if (!props.loggedIn) {
		return null;
	}
	const handleRefreshSession = () => {
		setLastActivity(new Date());
		fetcher.load("/user/refresh-session");
	};

	return (
		<>
			{showWarning ? (
				<div style={{background: "red", position: "fixed", top: 0, width: "100%"}}>
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

// Create a new QueryClient instance outside of component to ensure consistent instance
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 30000,
		},
	},
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {hasPublicSite, loggedIn, flashMessage, confSiteName, confSiteLogo, confFooterURLPrivPolicy, confFooterURLTermsConds, userRole} = loaderData
	let boolShowHeaderFooter:boolean = true;
	const matches = useMatches();
	const isUrlPathUserInvite = matches.some((match) => match.pathname.startsWith("/user/accept-invite"));
	const isUrlPathUserVerifyEmail = matches.some((match) => match.pathname.startsWith("/user/verify-email"));
	const isUrlPathAdminRegistration = matches.some((match) => match.pathname.startsWith("/setup/admin-account"));

	// Do not show header and foother for certain pages [user invitation | admin registration]
	if (isUrlPathUserInvite || isUrlPathAdminRegistration || isUrlPathUserVerifyEmail) {
		boolShowHeaderFooter = false;
	}
	
	// Display toast for flash messages
	useEffect(() => {
		if (flashMessage) {
			if (flashMessage.type === "error") {
				notifyError(flashMessage.text)
			} else {
				notifyInfo(flashMessage.text)
			}
		}
	}, [flashMessage]);

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<link rel="icon" type="image/x-icon" href="/favicon.ico" />
				<Meta />
				<Links />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<ToastContainer
						position="top-center"
						autoClose={5000}
						hideProgressBar={false}
						newestOnTop={true}
						closeOnClick={true}
						pauseOnHover={true}
						draggable={false}
						toastClassName="custom-toast"
					/>
					<InactivityWarning loggedIn={loggedIn} />
					<div className="dts-page-container">
						{(hasPublicSite || loggedIn) && boolShowHeaderFooter && (
							<header>
								<div className="mg-container">
									<Header loggedIn={loggedIn} userRole={userRole} siteName={confSiteName} siteLogo={confSiteLogo} />
								</div>
							</header>
						)}
						<main className="dts-main-container">
							<Outlet />
						</main>
						<footer>
							{ boolShowHeaderFooter && (
								<Footer
									siteName={confSiteName}
									urlPrivacyPolicy={confFooterURLPrivPolicy}
									urlTermsConditions={confFooterURLTermsConds}
								/>
							)}
						</footer>
					</div>
					<Scripts />
				</QueryClientProvider>
			</body>
		</html>
	);
}
