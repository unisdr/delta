import { useEffect, useState } from "react";

import {
	MegaMenu
} from "~/components/megamenu2/megamenu"

import {Lvl1Item} from "~/components/megamenu2/common"

interface HeaderProps {
	siteName: string
}

export function Header({siteName}: HeaderProps){
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<header className={`dts-main-header ${isClient ? "js-enabled" : ""}`}>
			<div className="logo">
				<img src="https://rawgit.com/PreventionWeb/templates/dts/dts/dist/assets/images/dldt-logo-mark.svg" alt="DLDT logo" />
				<span className="title">{siteName}</span>
				<span className="empty"></span>
			</div>
			<MegaMenu items={navItems()} />
		</header>
	)
}

function navItems(): Lvl1Item[] {
	return [
	{
		name: "Data",
		title: "Data by country",
		icon: "undp/calendar",
		lvl2: [
			{
				name: "Group 1",
				id: "group1",
				lvl3: [
					{
						title: "Data example",
						lvl4: [
							{ name: "Data 1", link: "/data" },
							{ name: "Data 2", link: "/data" },
						],
					},
					{
						title: "Data Sources 1",
						lvl4: [
							{ name: "Item 1", link: "#" },
							{ name: "Item 2", link: "#" },
						],
					},
				],
			},
			{
				name: "Group 2",
				id: "group2",
				lvl3: [
					{
						title: "Data Insights 2",
						lvl4: [
							{ name: "Item 1", link: "#" },
							{ name: "Item 2", link: "#" },
						],
					},
					{
						title: "Data Sources 2",
						lvl4: [
							{ name: "Item 1", link: "#" },
							{ name: "Item 2", link: "#" },
						],
					},
				],
			},
		],
	},
	{
		name: "Analysis",
		title: "In-depth Analysis",
		icon: "undp/calendar",
		lvl2: [
			{
				name: "Trends",
				id: "trends",
				lvl3: [
					{
						title: "Yearly Analysis",
						lvl4: [
							{ name: "2024 Report", link: "#" },
							{ name: "2023 Report", link: "#" },
						],
					},
					{
						title: "Latest data",
						lvl4: [
							{ name: "News", link: "#" },
							{ name: "Feedback", link: "#" },
						],
					},
				],
			},
			{
				name: "Sources and process",
				id: "sources_and_process",
				lvl3: [
					{
						title: "Sources",
						lvl4: [
							{ name: "2024 Report", link: "#" },
							{ name: "2023 Report", link: "#" },
						],
					},
				],
			},
		],
	},
	{
		name: "About",
		title: "About Us",
		icon: "undp/calendar",
		lvl2: [
			{
				name: "Project Info",
				id: "project_info",
				lvl3: [
					{
						title: "Project Offices",
						lvl4: [
							{ name: "Office 1", link: "#" },
							{ name: "Office 2", link: "#" },
						],
					},
				],
			},
		],
	},
	{
		name: "Settings",
		title: "User and System Settings",
		icon: "undp/calendar",
		lvl2: [
			{
				name: "Main settings",
				id: "main-settings",
				lvl3: [
					{
						title: "System",
						lvl4: [
							{ name: "Access Management", link: "/settings/access-mgmt" },
							{ name: "System settings", link: "/settings/system" },
							{ name: "Geographic levels", link: "/settings/geography" },
							{ name: "Sectors", link: "/settings/sectors" },
						],
					},
					{
						title: "Users",
						lvl4: [
							{ name: "User management", link: "/users" },
						],
					},
					{
						title: "Your profile",
						lvl4: [
							{ name: "Change password", link: "/user/change-password" },
							{ name: "TOTP (2FA)", link: "/user/totp-enable" },
						],
					},
				],
			},
			{
				name: "User",
				id: "user-settings",
				lvl3: [
					{
						title: "Account",
						lvl4: [
							{ name: "Change Password", link: "#" },
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
		icon: "undp/calendar",
		link: "/user/logout"
	},
];
}
