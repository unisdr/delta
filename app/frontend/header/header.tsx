import { useEffect, useState } from "react";
import { MegaMenu } from "~/frontend/megamenu2/megamenu";
import { Lvl1Item } from "~/frontend/megamenu2/common";

interface HeaderProps {
	loggedIn: boolean;
	siteName: string;
	siteLogo: string;
	userRole: string;
	isSuperAdmin?: boolean;
	isFormAuthSupported?: boolean;
}

interface LogoProps {
	src: string;
	alt: string;
}

const LogoComponent = ({ src, alt }: LogoProps) => {
	if (src.length === 0) {
		return "";
	} else {
		return <div className="dts-logo-img-container">
			<img src={src} alt={alt} />
		</div>
	}
};

export function Header({
	loggedIn,
	siteName,
	siteLogo,
	userRole,
	isSuperAdmin = false,
	isFormAuthSupported = true // Default to true for backward compatibility
}: HeaderProps) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	let navItems = navItemsNotLoggedIn(userRole);
	if (loggedIn) {
		if (isSuperAdmin) {
			navItems = navItemsSuperAdmin();
		} else {
			navItems = navItemsLoggedIn(userRole, isFormAuthSupported);
		}
	}

	return (
		<>
			<header className={`dts-main-header ${isClient ? "js-enabled" : ""}`}>
				<div className="dts-logo-with-name">
					<LogoComponent src={siteLogo} alt="" />
					<span className="dts-title">{siteName}</span>
					<span className="dts-empty"></span>
				</div>
				<MegaMenu items={navItems} />
			</header>
		</>
	);
}

function navItemsNotLoggedIn(_userRole: string): Lvl1Item[] {
	return [
		{
			name: "Data",
			title: "Data management",
			icon: "other/data",
			lvl2: [
				{
					name: "Events and records",
					id: "group1",
					lvl3: [
						{
							title: "Events",
							lvl4: [
								{ name: "Hazardous events", link: "/hazardous-event" },
								{ name: "Disaster events", link: "/disaster-event" },
							],
						},
						{
							title: "Records",
							lvl4: [
								{ name: "Disaster records", link: "/disaster-record" },
							],
						},
					],
				},
			],
		},
		{
			name: "Analysis",
			title: "Analysis",
			icon: "other/analysis",
			lvl2: [
				{
					name: "Analysis",
					id: "trends",
					lvl3: [
						{
							title: "Analysis",
							lvl4: [
								{ name: "Sectors", link: "/analytics/sectors" },
								{ name: "Hazards", link: "/analytics/hazards" },
								{ name: "Disaster Events", link: "/analytics/disaster-events" },
							],
						},
					],
				},
			],
		},
		{
			name: "About",
			title: "About Us",
			icon: "other/about",
			lvl2: [
				{
					name: "General",
					id: "project_info",
					lvl3: [
						{
							title: "General",
							lvl4: [
								{ name: "About the system", link: "/about/about-the-system" },
								{
									name: "Technical specifications",
									link: "/about/technical-specifications",
								},
								{ name: "Partners", link: "/about/partners" },
								{ name: "Methodologies", link: "/about/methodologies" },
								{ name: "Support", link: "/about/support" },
							],
						},
					],
				},
			],
		},
		{
			name: "Log in",
			title: "User Login",
			icon: "other/user-profile",
			link: "/user/login",
		},
	];
}

function navItemsSuperAdmin(): Lvl1Item[] {
	return [
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "Log out",
			title: "Super Admin Logout",
			icon: "other/user-profile",
			link: "/admin/logout",
		},
	];
}

function navItemsLoggedIn(userRole: string, isFormAuthSupported: boolean): Lvl1Item[] {
	// Build the "Your profile" lvl4 items conditionally
	const yourProfileItems = [];
	
	const isLoggedInUserAdmin = userRole === "admin";

	// Only add "Change password" if form auth is supported
	if (isFormAuthSupported) {
		yourProfileItems.push({ name: "Change password", link: "/user/change-password" });
	}

	// Always add TOTP option
	yourProfileItems.push({ name: "TOTP (2FA)", link: "/user/totp-enable" });

	return [
		{
			name: "Data",
			title: "Data management",
			icon: "other/data",
			lvl2: [
				{
					name: "Events and records",
					id: "group1",
					lvl3: [
						{
							title: "Events",
							lvl4: [
								{ name: "Hazardous events", link: "/hazardous-event" },
								{ name: "Disaster events", link: "/disaster-event" },
							],
						},
						{
							title: "Records",
							lvl4: [
								{ name: "Disaster records", link: "/disaster-record" },
							],
						},
					],
				},
			],
		},
		{
			name: "Analysis",
			title: "Analysis",
			icon: "other/analysis",
			lvl2: [
				{
					name: "Analysis",
					id: "trends",
					lvl3: [
						{
							title: "Analysis",
							lvl4: [
								{ name: "Sectors", link: "/analytics/sectors" },
								{ name: "Hazards", link: "/analytics/hazards" },
								{ name: "Disaster Events", link: "/analytics/disaster-events" },
							],
						},
					],
				},
			],
		},
		{
			name: "About",
			title: "About Us",
			icon: "other/about",
			lvl2: [
				{
					name: "General",
					id: "project_info",
					lvl3: [
						{
							title: "General",
							lvl4: [
								{ name: "About the system", link: "/about/about-the-system" },
								{
									name: "Technical specifications",
									link: "/about/technical-specifications",
								},
								{ name: "Partners", link: "/about/partners" },
								{ name: "Methodologies", link: "/about/methodologies" },
								{ name: "Support", link: "/about/support" },
							],
						},
					],
				},
			],
		},
		{
			name: "Settings",
			title: "User and System Settings",
			icon: "other/settings",
			lvl2: [
				{
					name: "Main settings",
					id: "main-settings",
					lvl3: [
						{
							title: "System",
							lvl4: isLoggedInUserAdmin ?
								[
									{ name: "Access Management", link: "/settings/access-mgmnt" },
									{ name: "System settings", link: "/settings/system" },
									{ name: "Geographic levels", link: "/settings/geography" },
									{ name: "Sectors", link: "/settings/sectors" },
									{ name: "API Keys", link: "/settings/api-key" },
									{ name: "Assets", link: "/settings/assets" },
								] : [
									{ name: "Sectors", link: "/settings/sectors" },
									{ name: "Assets", link: "/settings/assets" },
								],
						},
						{
							title: "Your profile",
							lvl4: yourProfileItems, // Use the conditionally built array
						},
					],
				},
				{
					name: "User",
					id: "user-settings",
					lvl3: [
						{
							title: "Account",
							lvl4: isFormAuthSupported ? [
								// Only show password-related options if form auth is supported
								{ name: "Change Password", link: "/user/change-password" },
								{ name: "Change Email", link: "#" },
							] : [
								// Only show non-password options when form auth is disabled
								{ name: "Change Email", link: "#" },
							],
						},
					],
				},
			],
		},
		{
			name: "Log out",
			title: "User Login",
			icon: "other/user-profile",
			link: "/user/logout",
		},
	];
}
