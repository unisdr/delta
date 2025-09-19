import type { LinksFunction } from "@remix-run/node";

import {
	useLoaderData,
	Links,
	Meta,
	Outlet,
	Scripts,
	useNavigation,
	useFetcher,
	useMatches,
} from "@remix-run/react";

import { LoaderFunctionArgs } from "react-router-dom";

import { ToastContainer } from "react-toastify/unstyled"; // Import ToastContainer for notifications

import {
	sessionCookie,
	getFlashMessage,
	getUserFromSession,
	getCountrySettingsFromSession,
	getSuperAdminSession, // Added import for super admin session detection
} from "~/util/session";

import { useEffect, useState } from "react";

import allStylesHref from "./styles/all.css?url";

import { Header } from "~/frontend/header/header";
import { Footer } from "~/frontend/footer/footer";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { notifyError, notifyInfo } from "./frontend/utils/notifications";

import { configAuthSupportedForm } from "~/util/config";

import {
	sessionActivityTimeoutMinutes,
	sessionActivityWarningBeforeTimeoutMinutes
} from "~/util/session-activity-config";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: "/assets/css/style-dts.css?asof=20250530" },
	{ rel: "stylesheet", href: allStylesHref },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getUserFromSession(request);
	const superAdminSession = await getSuperAdminSession(request); // Add super admin session detection
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const message = getFlashMessage(session);
	const userRole = session.get("userRole");
	const isFormAuthSupported = configAuthSupportedForm();

	// Determine if this is a super admin session and on an admin route
	const url = new URL(request.url);
	const isAdminRoute = url.pathname.startsWith('/admin/');
	const isSuperAdmin = !!superAdminSession && isAdminRoute;
	const effectiveUserRole = isSuperAdmin ? "super_admin" : userRole;

	// Use different settings for super admin routes
	let settings;
	if (isSuperAdmin) {
		// For super admin routes, use default global settings
		settings = null; // This will cause defaults to be used below
	} else {
		// For regular user routes, use country-specific settings
		settings = await getCountrySettingsFromSession(request);
	}

	const websiteName = settings
		? settings.websiteName
		: "Disaster Tracking System";
	const websiteLogo = settings
		? settings.websiteLogo
		: "/assets/country-instance-logo.png";
	const footerUrlPrivacyPolicy = settings
		? settings.footerUrlPrivacyPolicy
		: "";
	const footerUrlTermsConditions = settings
		? settings.footerUrlTermsConditions
		: "";
	const dtsInstanceCtryIso3 = settings ? settings.dtsInstanceCtryIso3 : "USA";
	const currencyCode = settings ? settings.currencyCode : 'USD';

	return Response.json(
		{
			hasPublicSite: true,
			loggedIn: !!user || (!!superAdminSession && isAdminRoute),
			userRole: effectiveUserRole || "",
			isSuperAdmin: isSuperAdmin,
			isFormAuthSupported: isFormAuthSupported,
			flashMessage: message,
			confSiteName: websiteName,
			confSiteLogo: websiteLogo,
			confFooterURLPrivPolicy: footerUrlPrivacyPolicy,
			confFooterURLTermsConds: footerUrlTermsConditions,
			env: {
				CURRENCY_CODES: currencyCode,
				DTS_INSTANCE_CTRY_ISO3: dtsInstanceCtryIso3,
			},
		},
		{
			headers: {
				"Set-Cookie": await sessionCookie().commitSession(session),
			},
		}
	);
};

interface InactivityWarningProps {
	loggedIn: boolean;
}
function InactivityWarning(props: InactivityWarningProps) {

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
			console.log("Checking login session expiration");
			const now = new Date();
			const minutesSinceLastActivity =
				(now.getTime() - lastActivity.getTime()) / (1000 * 60);

			if (
				minutesSinceLastActivity >
				sessionActivityTimeoutMinutes -
				sessionActivityWarningBeforeTimeoutMinutes
			) {
				setShowWarning(true);
				setExpiresInMinutes(
					Math.max(0, sessionActivityTimeoutMinutes - minutesSinceLastActivity)
				);
			} else {
				setShowWarning(false);
			}
		};
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
				<div className="fixed top-0 left-0 w-full z-50">
					<div className="container mx-auto">
						<div className="dts-alert dts-alert--error">
							<div className="dts-alert__icon">
								<svg
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<span>
								{expiresInMinutes > 0.1 ? (
									<div className="flex flex-col gap-4">
										<p className="text-base">
											Login session expires in {Math.round(expiresInMinutes)}{" "}
											minutes due to inactivity.
										</p>
										<div>
											<button
												onClick={handleRefreshSession}
												className="mg-button mg-button-outline mg-button-sm"
											>
												Refresh session
											</button>
										</div>
									</div>
								) : (
									<p>Session expired</p>
								)}
							</span>
						</div>
					</div>
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
	const {
		hasPublicSite,
		loggedIn,
		flashMessage,
		confSiteName,
		confSiteLogo,
		confFooterURLPrivPolicy,
		confFooterURLTermsConds,
		userRole,
		isSuperAdmin,
		isFormAuthSupported,
	} = loaderData;
	let boolShowHeaderFooter: boolean = true;
	const matches = useMatches();
	const isUrlPathUserInvite = matches.some((match) =>
		match.pathname.startsWith("/user/accept-invite")
	);
	const isUrlPathUserVerifyEmail = matches.some((match) =>
		match.pathname.startsWith("/user/verify-email")
	);
	const isUrlPathAdminRegistration = matches.some((match) =>
		match.pathname.startsWith("/setup/admin-account")
	);
	const isUrlPathResetPassword = matches.some((match) =>
		match.pathname.startsWith("/user/forgot-password")
	);
	const isUrlSuperAdmin = matches.some((match) =>
		match.pathname.startsWith("/admin")
	);

	// Do not show header and footer for certain pages [user invitation | admin registration]
	// But show header for super admin pages if the user is a super admin
	if (
		isUrlPathUserInvite ||
		isUrlPathAdminRegistration ||
		isUrlPathUserVerifyEmail ||
		isUrlPathResetPassword ||
		(isUrlSuperAdmin && !isSuperAdmin) // Only hide for super admin routes if not actually super admin
	) {
		boolShowHeaderFooter = false;
	}

	// Display toast for flash messages
	useEffect(() => {
		if (flashMessage) {
			if (flashMessage.type === "error") {
				notifyError(flashMessage.text);
			} else {
				notifyInfo(flashMessage.text);
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
									<Header
										loggedIn={loggedIn}
										userRole={userRole}
										siteName={confSiteName}
										siteLogo={confSiteLogo}
										isSuperAdmin={isSuperAdmin}
										isFormAuthSupported={isFormAuthSupported}
									/>
								</div>
							</header>
						)}
						<main className="dts-main-container">
							<Outlet />
						</main>
						<footer>
							{boolShowHeaderFooter && (
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
