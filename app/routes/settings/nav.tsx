import { NavLink } from "react-router-dom";

export function NavSettings() {
	const menu = [
		{link: "settings/access-mgmnt", text: "Access management"},
		{link: "settings/system", text: "System settings"},
		{link: "settings/geography", text: "Geographic levels"},
		{link: "settings/sectors", text: "Sectors"},
	]
	return (
		<nav className="dts-sub-navigation">
			<div className="mg-container">
    			<div className="dts-sub-navigation__container">
      				<ul>
					{menu.map((item, index) => (
						<li key={index}>
							<NavLink
								key={index}
								to={`/${item.link}`}
								className={({ isActive, isPending }) =>
									isActive ? "active" : isPending ? "pending" : ""
								}
							>
							{item.text}
							</NavLink>
						</li>

					))}
					</ul>
				</div>
			</div>
		</nav>
	);
}