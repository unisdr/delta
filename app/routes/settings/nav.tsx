import { NavLink, useLocation } from "react-router-dom";

export function NavSettings() {
  const location = useLocation();

  // Dynamically generate menu based on the active section
  const menu =
	location.pathname.includes("/analytics")
	  ? [
		  { link: "analytics/human-direct-effects", text: "Human Direct Effects" },
		  { link: "analytics/sectors", text: "Sectors" },
		  { link: "analytics/hazards", text: "Hazards" },
		  { link: "analytics/disaster-events", text: "Disaster Events" },
		]
	  : [
		  { link: "settings/access-mgmnt", text: "Access management" },
		  { link: "settings/system", text: "System settings" },
		  { link: "settings/geography", text: "Geographic levels" },
		  { link: "settings/sectors", text: "Sectors" },
		];

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