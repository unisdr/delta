import { NavLink } from "react-router-dom";

export function NavSettings() {
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